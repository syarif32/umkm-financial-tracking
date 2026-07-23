import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Transaction } from "@/types/database";
import type {
  CreateExpenseTransactionInput,
  CreateSaleTransactionInput,
  TransactionHistoryFilter,
  TransactionListItem,
  VoidTransactionInput,
} from "@/types/transaction";
import { transactionRepository } from "@/repositories/transaction-repository";
import { menuService } from "@/services/menu-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { expenseCategoryService } from "@/services/expense-category-service";

type TypedSupabaseClient = SupabaseClient<Database>;

function buildMap<T extends Record<string, unknown>, K extends keyof T>(
  rows: T[],
  idKey: K,
  valueKey: keyof T
): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const row of rows) {
    map.set(String(row[idKey]), row[valueKey]);
  }
  return map;
}

/**
 * Business-logic layer for transactions. Authorization (who's allowed to
 * call these at all) is enforced one layer up, in the Server Actions —
 * this layer focuses on domain rules: which master data must be active,
 * what "void" means, and how history gets assembled for display.
 */
export const transactionService = {
  /**
   * Creates a sale (INCOME) transaction. The actual price snapshotting and
   * total calculation happens inside the `create_sale_transaction` Postgres
   * function (see migration 0003) — deliberately in the database, not here,
   * so it's atomic and cannot be raced or bypassed by calling the repository
   * with hand-crafted values. This function is a thin, intention-revealing
   * pass-through.
   */
  async createSaleTransaction(
    supabase: TypedSupabaseClient,
    input: CreateSaleTransactionInput
  ): Promise<Transaction> {
    return transactionRepository.createSaleViaRpc(supabase, {
      payment_method_id: input.payment_method_id,
      notes: input.notes.trim() || null,
      items: input.items,
    });
  },

  async createExpenseTransaction(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateExpenseTransactionInput
  ): Promise<Transaction> {
    // Validate referenced master data is active — an inactive payment method
    // or category shouldn't accept new transactions (existing historical
    // transactions that reference them remain untouched either way).
    const [paymentMethods, categories] = await Promise.all([
      paymentMethodService.list(supabase),
      expenseCategoryService.list(supabase),
    ]);

    const paymentMethod = paymentMethods.find((pm) => pm.id === input.payment_method_id);
    if (!paymentMethod || !paymentMethod.is_active) {
      throw new Error("Metode pembayaran tidak ditemukan atau nonaktif.");
    }

    const category = categories.find((c) => c.id === input.expense_category_id);
    if (!category || !category.is_active) {
      throw new Error("Kategori pengeluaran tidak ditemukan atau nonaktif.");
    }

    return transactionRepository.createExpense(supabase, {
      user_id: userId,
      payment_method_id: input.payment_method_id,
      expense_category_id: input.expense_category_id,
      total_amount: input.amount,
      notes: input.notes.trim() || null,
      transaction_date: (input.transaction_date ?? new Date()).toISOString(),
    });
  },

  /**
   * Voids a transaction. Only ever flips status + records who/why/when —
   * amounts and items are never edited, preserving the original record.
   */
  async voidTransaction(
    supabase: TypedSupabaseClient,
    voidedByUserId: string,
    input: VoidTransactionInput
  ): Promise<Transaction> {
    const existing = await transactionRepository.getById(supabase, input.id);
    if (!existing) {
      throw new Error("Transaksi tidak ditemukan.");
    }
    if (existing.status === "VOIDED") {
      throw new Error("Transaksi ini sudah dibatalkan sebelumnya.");
    }

    return transactionRepository.voidById(supabase, input.id, voidedByUserId, input.reason);
  },

  /**
   * Assembles the transaction history view: Owner sees every transaction,
   * Karyawan sees only their own. Related display data (payment method
   * name, category, creator, menu names on line items) is joined here in
   * TypeScript rather than via Supabase embedded-resource selects, so
   * everything stays fully typed against our hand-written Database type.
   */
  async listTransactionHistory(
    supabase: TypedSupabaseClient,
    currentUser: { id: string; isOwner: boolean },
    filter: TransactionHistoryFilter = {}
  ): Promise<TransactionListItem[]> {
    const transactions = await transactionRepository.list(supabase, {
      onlyUserId: currentUser.isOwner ? undefined : currentUser.id,
    });

    const filtered = transactions.filter((t) => {
      if (filter.type && t.type !== filter.type) return false;
      if (filter.status && t.status !== filter.status) return false;
      return true;
    });

    const incomeTransactionIds = filtered
      .filter((t) => t.type === "INCOME")
      .map((t) => t.id);

    const [items, menus, paymentMethods, categories, profiles] = await Promise.all([
      transactionRepository.listItemsByTransactionIds(supabase, incomeTransactionIds),
      menuService.list(supabase),
      paymentMethodService.list(supabase),
      expenseCategoryService.list(supabase),
      supabase.from("profiles").select("id, full_name"),
    ]);

    if (profiles.error) throw new Error(profiles.error.message);

    const menuNameMap = buildMap(menus, "id", "name") as Map<string, string>;
    const paymentMethodNameMap = buildMap(paymentMethods, "id", "name") as Map<string, string>;
    const categoryNameMap = buildMap(categories, "id", "name") as Map<string, string>;
    const categoryTypeMap = buildMap(categories, "id", "type") as Map<
      string,
      TransactionListItem["expense_category_type"]
    >;
    const profileNameMap = buildMap(profiles.data ?? [], "id", "full_name") as Map<
      string,
      string
    >;

    const itemsByTransactionId = new Map<string, typeof items>();
    for (const item of items) {
      const bucket = itemsByTransactionId.get(item.transaction_id) ?? [];
      bucket.push(item);
      itemsByTransactionId.set(item.transaction_id, bucket);
    }

    return filtered.map((t): TransactionListItem => ({
      ...t,
      payment_method_name: paymentMethodNameMap.get(t.payment_method_id) ?? "Tidak diketahui",
      expense_category_name: t.expense_category_id
        ? categoryNameMap.get(t.expense_category_id) ?? "Tidak diketahui"
        : null,
      expense_category_type: t.expense_category_id
        ? categoryTypeMap.get(t.expense_category_id) ?? null
        : null,
      creator_name: profileNameMap.get(t.user_id) ?? "Tidak diketahui",
      voided_by_name: t.voided_by ? profileNameMap.get(t.voided_by) ?? "Tidak diketahui" : null,
      items: (itemsByTransactionId.get(t.id) ?? []).map((item) => ({
        ...item,
        menu_name: menuNameMap.get(item.menu_id) ?? "Tidak diketahui",
      })),
    }));
  },
};
