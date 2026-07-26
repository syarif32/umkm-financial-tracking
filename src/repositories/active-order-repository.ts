import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActiveOrder,
  ActiveOrderItem,
  ActiveOrderStatus,
  Database,
  Transaction,
} from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export interface CreateActiveOrderViaRpcInput {
  notes: string | null;
  customer_name: string | null; 
  items: { menu_id: string; quantity: number }[];
}

export interface CheckoutActiveOrderViaRpcInput {
  active_order_id: string;
  payment_method_id: string;
  notes: string | null;
  customer_phone: string | null;
}

export interface InsertActiveOrderItemRow {
  active_order_id: string;
  menu_id: string;
  menu_name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  subtotal: number;
}

/**
 * Pure data-access layer for `active_orders` / `active_order_items`. No
 * authorization or business rules live here — the service layer decides
 * what's allowed; this layer only talks to Supabase and trusts RLS (and,
 * for the atomic operations, the create_active_order/checkout_active_order
 * Postgres functions) as the real backstop.
 */
export const activeOrderRepository = {
  async createViaRpc(
    supabase: TypedSupabaseClient,
    input: CreateActiveOrderViaRpcInput
  ): Promise<ActiveOrder> {
    const { data, error } = await supabase.rpc("create_active_order", {
      p_notes: input.notes,
      p_items: input.items,
      p_customer_name: input.customer_name, // <-- Mengirim parameter ke Supabase RPC
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Pesanan tidak dapat dibuat.");
    return data;
  },

  async checkoutViaRpc(
    supabase: TypedSupabaseClient,
    input: CheckoutActiveOrderViaRpcInput
  ): Promise<Transaction> {
    const { data, error } = await supabase.rpc("checkout_active_order", {
      p_active_order_id: input.active_order_id,
      p_payment_method_id: input.payment_method_id,
      p_notes: input.notes,
      p_customer_phone: input.customer_phone,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Transaksi tidak dapat dibuat.");
    return data;
  },

  async list(
    supabase: TypedSupabaseClient,
    options: { status?: ActiveOrderStatus } = {}
  ): Promise<ActiveOrder[]> {
    let query = supabase
      .from("active_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getById(supabase: TypedSupabaseClient, id: string): Promise<ActiveOrder | null> {
    const { data, error } = await supabase
      .from("active_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async listItemsByOrderId(
    supabase: TypedSupabaseClient,
    activeOrderId: string
  ): Promise<ActiveOrderItem[]> {
    const { data, error } = await supabase
      .from("active_order_items")
      .select("*")
      .eq("active_order_id", activeOrderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  // Tambahkan fungsi ini di bawah listItemsByOrderId
  async listItemsByOrderIds(
    supabase: TypedSupabaseClient,
    activeOrderIds: string[]
  ): Promise<ActiveOrderItem[]> {
    if (activeOrderIds.length === 0) return [];

    const { data, error } = await supabase
      .from("active_order_items")
      .select("*")
      .in("active_order_id", activeOrderIds)
      .order("created_at", { ascending: true });
      
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async insertItem(
    supabase: TypedSupabaseClient,
    row: InsertActiveOrderItemRow
  ): Promise<ActiveOrderItem> {
    const { data, error } = await supabase
      .from("active_order_items")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateItemQuantity(
    supabase: TypedSupabaseClient,
    id: string,
    quantity: number,
    subtotal: number
  ): Promise<ActiveOrderItem> {
    const { data, error } = await supabase
      .from("active_order_items")
      .update({ quantity, subtotal })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteItem(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("active_order_items").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async getItemById(supabase: TypedSupabaseClient, id: string): Promise<ActiveOrderItem | null> {
    const { data, error } = await supabase
      .from("active_order_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateNotes(
    supabase: TypedSupabaseClient,
    id: string,
    notes: string | null
  ): Promise<ActiveOrder> {
    const { data, error } = await supabase
      .from("active_orders")
      .update({ notes })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async cancel(supabase: TypedSupabaseClient, id: string): Promise<ActiveOrder> {
    const { data, error } = await supabase
      .from("active_orders")
      .update({ status: "CANCELLED" })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};