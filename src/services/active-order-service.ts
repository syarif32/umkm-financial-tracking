import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveOrder, Database, Transaction } from "@/types/database";
import type {
  ActiveOrderDetail,
  ActiveOrderListFilter,
  ActiveOrderListItem,
  AddActiveOrderItemInput,
  CheckoutActiveOrderInput,
  CreateActiveOrderInput,
} from "@/types/active-order";
import { activeOrderRepository } from "@/repositories/active-order-repository";
import { menuService } from "@/services/menu-service";
import { normalizeIndonesianPhone } from "@/lib/phone";

type TypedSupabaseClient = SupabaseClient<Database>;

async function loadCreatorNames(
  supabase: TypedSupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(new Set(userIds)));
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

async function requireOpenOrder(
  supabase: TypedSupabaseClient,
  activeOrderId: string
): Promise<ActiveOrder> {
  const order = await activeOrderRepository.getById(supabase, activeOrderId);
  if (!order) {
    throw new Error("Pesanan tidak ditemukan.");
  }
  if (order.status !== "OPEN") {
    throw new Error("Pesanan sudah dibayar atau dibatalkan dan tidak dapat diubah.");
  }
  return order;
}

/**
 * Business-logic layer for Active Orders ("Tagihan Aktif"). Deliberately
 * mirrors the shape of transaction-service.ts: thin pass-throughs to the
 * atomic Postgres functions for multi-row operations (create, checkout),
 * and explicit OPEN-status / active-menu checks in TypeScript for the
 * simple single-row mutations (add/update/remove item, edit notes).
 *
 * Nothing in this file ever touches `transactions` directly except
 * checkoutActiveOrder, which does so exclusively through
 * checkout_active_order() — the same snapshot-and-atomicity guarantees as
 * a normal sale apply here too.
 */
export const activeOrderService = {
  async createActiveOrder(
    supabase: TypedSupabaseClient,
    input: CreateActiveOrderInput
  ): Promise<ActiveOrder> {
    return activeOrderRepository.createViaRpc(supabase, {
      notes: input.notes.trim() || null,
      customer_name: (input as any).customer_name?.trim() || null, 
      items: input.items,
    });
  },

  async listActiveOrders(
    supabase: TypedSupabaseClient,
    filter: ActiveOrderListFilter = {}
  ): Promise<ActiveOrderListItem[]> {
    const orders = await activeOrderRepository.list(supabase, { status: filter.status });

    if (orders.length === 0) return [];

    // Mencegah N+1 Query: Tarik relasi dalam batch
    const [creatorNames, allItems] = await Promise.all([
      loadCreatorNames(
        supabase,
        orders.map((o) => o.created_by)
      ),
      activeOrderRepository.listItemsByOrderIds(
        supabase,
        orders.map((o) => o.id)
      )
    ]);

    const itemCounts = new Map<string, number>();
    for (const item of allItems) {
      itemCounts.set(
        item.active_order_id,
        (itemCounts.get(item.active_order_id) || 0) + 1
      );
    }

    return orders.map((o) => ({
      ...o,
      creator_name: creatorNames.get(o.created_by) ?? "Tidak diketahui",
      item_count: itemCounts.get(o.id) ?? 0,
    }));
  },

  async getActiveOrderDetail(
    supabase: TypedSupabaseClient,
    id: string
  ): Promise<ActiveOrderDetail | null> {
    const order = await activeOrderRepository.getById(supabase, id);
    if (!order) return null;

    const [items, creatorNames] = await Promise.all([
      activeOrderRepository.listItemsByOrderId(supabase, id),
      loadCreatorNames(supabase, [order.created_by]),
    ]);

    return {
      ...order,
      creator_name: creatorNames.get(order.created_by) ?? "Tidak diketahui",
      items,
    };
  },

  async addItem(supabase: TypedSupabaseClient, input: AddActiveOrderItemInput) {
    await requireOpenOrder(supabase, input.active_order_id);

    const menus = await menuService.list(supabase);
    const menu = menus.find((m) => m.id === input.menu_id);
    if (!menu || !menu.is_active) {
      throw new Error("Menu tidak ditemukan atau nonaktif.");
    }

    const subtotal = menu.current_price * input.quantity;
    return activeOrderRepository.insertItem(supabase, {
      active_order_id: input.active_order_id,
      menu_id: menu.id,
      menu_name_snapshot: menu.name,
      price_snapshot: menu.current_price,
      quantity: input.quantity,
      subtotal,
    });
  },

  async updateItemQuantity(supabase: TypedSupabaseClient, id: string, quantity: number) {
    const item = await activeOrderRepository.getItemById(supabase, id);
    if (!item) {
      throw new Error("Item tidak ditemukan.");
    }
    await requireOpenOrder(supabase, item.active_order_id);

    const subtotal = item.price_snapshot * quantity;
    return activeOrderRepository.updateItemQuantity(supabase, id, quantity, subtotal);
  },

  async removeItem(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const item = await activeOrderRepository.getItemById(supabase, id);
    if (!item) {
      throw new Error("Item tidak ditemukan.");
    }
    await requireOpenOrder(supabase, item.active_order_id);

    await activeOrderRepository.deleteItem(supabase, id);
  },

  async updateNotes(supabase: TypedSupabaseClient, id: string, notes: string) {
    await requireOpenOrder(supabase, id);
    return activeOrderRepository.updateNotes(supabase, id, notes.trim() || null);
  },

  /** Owner-only — enforced one layer up in the Server Action, mirroring void. */
  async cancelActiveOrder(supabase: TypedSupabaseClient, id: string) {
    const order = await requireOpenOrder(supabase, id);
    return activeOrderRepository.cancel(supabase, order.id);
  },

  async checkoutActiveOrder(
    supabase: TypedSupabaseClient,
    input: CheckoutActiveOrderInput
  ): Promise<Transaction> {
    // Friendly pre-check before hitting the DB function (which re-validates
    // everything anyway — this is just for a clearer error message).
    const order = await activeOrderRepository.getById(supabase, input.active_order_id);
    if (!order) {
      throw new Error("Pesanan tidak ditemukan.");
    }
    if (order.status !== "OPEN") {
      throw new Error("Pesanan sudah dibayar atau dibatalkan.");
    }

    const normalizedPhone = input.customer_phone
      ? normalizeIndonesianPhone(input.customer_phone)
      : null;

    return activeOrderRepository.checkoutViaRpc(supabase, {
      active_order_id: input.active_order_id,
      payment_method_id: input.payment_method_id,
      notes: input.notes.trim() || null,
      customer_phone: normalizedPhone,
    });
  },
};