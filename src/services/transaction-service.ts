import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Transaction, TransactionItem } from "@/types/database";
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
import { normalizeIndonesianPhone } from "@/lib/phone";
import { addDaysToDateOnly, startOfUtcDayIso } from "@/lib/date-range";

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
 * Master-data lookups shared by both listTransactionHistory and
 * getTransactionDetail, fetched once and reused so the two entry points
 * don't duplicate the same joins.
 */
async function loadDisplayLookups(supabase: TypedSupabaseClient) {
  const [menus, paymentMethods, categories, profiles] = await Promise.all([
    menuService.list(supabase),
    paymentMethodService.list(supabase),
    expenseCategoryService.list(supabase),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (profiles.error) throw new Error(profiles.error.message);

  return {
    menuNameMap: buildMap(menus, "id", "name") as Map<string, string>,
    menuImageMap: buildMap(menus, "id", "image_url") as Map<string, string | null>,
    paymentMethodNameMap: buildMap(paymentMethods, "id", "name") as Map<string, string>,
    categoryNameMap: buildMap(categories, "id", "name") as Map<string, string>,
    categoryTypeMap: buildMap(categories, "id", "type") as Map<
      string,
      TransactionListItem["expense_category_type"]
    >,
    profileNameMap: buildMap(profiles.data ?? [], "id", "full_name") as Map<string, string>,
  };
}

type DisplayLookups = Awaited<ReturnType<typeof loadDisplayLookups>>;

function mapToListItem(
  t: Transaction,
  items: TransactionItem[],
  lookups: DisplayLookups
): TransactionListItem {
  return {
    ...t,
    payment_method_name: lookups.paymentMethodNameMap.get(t.payment_method_id) ?? "Tidak diketahui",
    expense_category_name: t.expense_category_id
      ? lookups.categoryNameMap.get(t.expense_category_id) ?? "Tidak diketahui"
      : null,
    expense_category_type: t.expense_category_id
      ? lookups.categoryTypeMap.get(t.expense_category_id) ?? null
      : null,
    creator_name: lookups.profileNameMap.get(t.user_id) ?? "Tidak diketahui",
    voided_by_name: t.voided_by ? lookups.profileNameMap.get(t.voided_by) ?? "Tidak diketahui" : null,
    items: items
      .filter((item) => item.transaction_id === t.id)
      .map((item) => ({
        ...item,
        menu_name: lookups.menuNameMap.get(item.menu_id) ?? "Tidak diketahui",
        menu_image_url: lookups.menuImageMap.get(item.menu_id) ?? null,
      })),
  };
}

/**
 * Business-logic layer for transactions. Authorization (who's allowed to
 * call these at all) is enforced one layer up, in the Server Actions —
 * this layer focuses on domain rules: which master data must be active,
 * what "void" means, and how history/detail gets assembled for display.
 */
export const transactionService = {
  /**
   * Creates a sale (INCOME) transaction. The actual price snapshotting and
   * total calculation happens inside the `create_sale_transaction` Postgres
   * function (see migration 0003/0005) — deliberately in the database, not
   * here, so it's atomic and cannot be raced or bypassed by calling the
   * repository with hand-crafted values. This function is a thin,
   * intention-revealing pass-through; the only logic here is normalizing
   * the optional customer WhatsApp number before it's stored.
   */
  async createSaleTransaction(
    supabase: TypedSupabaseClient,
    input: CreateSaleTransactionInput
  ): Promise<Transaction> {
    const normalizedPhone = input.customer_phone
      ? normalizeIndonesianPhone(input.customer_phone)
      : null;

    return transactionRepository.createSaleViaRpc(supabase, {
      payment_method_id: input.payment_method_id,
      notes: input.notes.trim() || null,
      items: input.items,
      customer_phone: normalizedPhone,
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
   * Karyawan sees only their own — enforced both here (onlyUserId) and by
   * the `transactions_select` RLS policy independently. Date range, type,
   * status, payment method, and expense category filters are all applied
   * at the database query level (via the repository); free-text search
   * (transaction ID substring / customer phone substring) is applied after
   * fetching, since PostgREST doesn't support `ilike` across a uuid column
   * and a text column in one OR'd condition — reasonable at this scale.
   */
  async listTransactionHistory(
    supabase: TypedSupabaseClient,
    currentUser: { id: string; isOwner: boolean },
    filter: TransactionHistoryFilter = {}
  ): Promise<TransactionListItem[]> {
    const transactions = await transactionRepository.list(supabase, {
      onlyUserId: currentUser.isOwner ? undefined : currentUser.id,
      type: filter.type,
      status: filter.status,
      paymentMethodId: filter.paymentMethodId,
      expenseCategoryId: filter.expenseCategoryId,
      fromDate: filter.fromDate ? startOfUtcDayIso(filter.fromDate) : undefined,
      toDateExclusive: filter.toDate ? startOfUtcDayIso(addDaysToDateOnly(filter.toDate, 1)) : undefined,
      ascending: filter.sortAscending,
    });

    const searchLower = filter.search?.trim().toLowerCase();
    const searched = searchLower
      ? transactions.filter(
          (t) =>
            t.id.toLowerCase().includes(searchLower) ||
            (t.customer_phone ?? "").toLowerCase().includes(searchLower)
        )
      : transactions;

    const incomeTransactionIds = searched.filter((t) => t.type === "INCOME").map((t) => t.id);

    const [items, lookups] = await Promise.all([
      transactionRepository.listItemsByTransactionIds(supabase, incomeTransactionIds),
      loadDisplayLookups(supabase),
    ]);

    return searched.map((t) => mapToListItem(t, items, lookups));
  },

  /**
   * Fetches a single transaction for the detail/receipt view. Returns null
   * both when the transaction doesn't exist AND when RLS blocks it (a
   * Karyawan requesting another user's transaction) — the caller can't tell
   * the difference, which is the point: it avoids confirming to a Karyawan
   * that some other transaction ID exists.
   */
  async getTransactionDetail(
    supabase: TypedSupabaseClient,
    id: string
  ): Promise<TransactionListItem | null> {
    const transaction = await transactionRepository.getById(supabase, id);
    if (!transaction) return null;

    const [items, lookups] = await Promise.all([
      transaction.type === "INCOME"
        ? transactionRepository.listItemsByTransactionIds(supabase, [transaction.id])
        : Promise.resolve([]),
      loadDisplayLookups(supabase),
    ]);

    return mapToListItem(transaction, items, lookups);
  },
};
