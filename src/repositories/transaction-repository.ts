import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Transaction,
  TransactionItem,
} from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export interface CreateSaleViaRpcInput {
  payment_method_id: string;
  notes: string | null;
  items: { menu_id: string; quantity: number }[];
  customer_name: string | null;  
  customer_phone: string | null;
}

export interface CreateExpenseRow {
  user_id: string;
  payment_method_id: string;
  expense_category_id: string;
  total_amount: number;
  notes: string | null;
  transaction_date: string;
}

export interface ListTransactionsOptions {
  onlyUserId?: string;
  type?: Transaction["type"];
  status?: Transaction["status"];
  fromDate?: string;
  toDateExclusive?: string;
  paymentMethodId?: string;
  expenseCategoryId?: string;
  ascending?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export const transactionRepository = {
  async createSaleViaRpc(
    supabase: TypedSupabaseClient,
    input: CreateSaleViaRpcInput
  ): Promise<Transaction> {
    const { data, error } = await supabase.rpc("create_sale_transaction", {
      p_payment_method_id: input.payment_method_id,
      p_notes: input.notes,
      p_items: input.items,
      p_customer_name: input.customer_name,  
      p_customer_phone: input.customer_phone,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Transaksi tidak dapat dibuat.");
    return data;
  },

  async createExpense(
    supabase: TypedSupabaseClient,
    row: CreateExpenseRow
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        type: "EXPENSE",
        status: "COMPLETED",
        user_id: row.user_id,
        payment_method_id: row.payment_method_id,
        expense_category_id: row.expense_category_id,
        total_amount: row.total_amount,
        notes: row.notes,
        transaction_date: row.transaction_date,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async list(
    supabase: TypedSupabaseClient,
    options: ListTransactionsOptions = {}
  ): Promise<{ data: Transaction[]; count: number }> {
    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" }) 
      .order("transaction_date", { ascending: options.ascending ?? false });

    if (options.onlyUserId) query = query.eq("user_id", options.onlyUserId);
    if (options.type) query = query.eq("type", options.type);
    if (options.status) query = query.eq("status", options.status);
    if (options.fromDate) query = query.gte("transaction_date", options.fromDate);
    if (options.toDateExclusive) query = query.lt("transaction_date", options.toDateExclusive);
    if (options.paymentMethodId) query = query.eq("payment_method_id", options.paymentMethodId);
    if (options.expenseCategoryId) query = query.eq("expense_category_id", options.expenseCategoryId);
    
    if (options.search) {
      const searchTerm = options.search.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

      if (isUuid) {
        query = query.or(`id.eq.${searchTerm},customer_phone.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      } else {
        query = query.or(`customer_phone.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }
    }

    if (options.page && options.limit) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { data: data ?? [], count: count ?? 0 };
  },

  async getById(supabase: TypedSupabaseClient, id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  async voidById(
    supabase: TypedSupabaseClient,
    id: string,
    voidedBy: string,
    reason: string
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        status: "VOIDED",
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        void_reason: reason,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async listItemsByTransactionIds(
    supabase: TypedSupabaseClient,
    transactionIds: string[]
  ): Promise<TransactionItem[]> {
    if (transactionIds.length === 0) return [];

    const { data, error } = await supabase
      .from("transaction_items")
      .select("*")
      .in("transaction_id", transactionIds);

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getPaymentMethodBalances(
    supabase: TypedSupabaseClient
  ): Promise<{ payment_method_id: string; total_income: number; total_expense: number }[]> {
    const { data, error } = await supabase.rpc("get_payment_method_balances" as any);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};