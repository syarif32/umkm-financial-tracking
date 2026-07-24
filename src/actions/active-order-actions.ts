"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner, requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { activeOrderService } from "@/services/active-order-service";
import {
  addActiveOrderItemSchema,
  cancelActiveOrderSchema,
  checkoutActiveOrderSchema,
  createActiveOrderSchema,
  removeActiveOrderItemSchema,
  updateActiveOrderItemQuantitySchema,
  updateActiveOrderNotesSchema,
} from "@/lib/validation/active-order";
import type { ActionResult } from "./menu-actions";

const ACTIVE_ORDERS_PATH = "/dashboard/active-orders";
const TRANSACTIONS_PATH = "/dashboard/transactions";

function firstFieldError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

export interface CreateActiveOrderResult extends ActionResult {
  activeOrderId?: string;
}

/**
 * Creates a new Active Order ("Pesanan Baru" / "Simpan Pesanan"). Both
 * OWNER and KARYAWAN may call this — starting a tab is routine cashier work.
 */
export async function createActiveOrderAction(input: {
  notes: string;
  items: { menu_id: string; quantity: number }[];
}): Promise<CreateActiveOrderResult> {
  await requireUser();

  const parsed = createActiveOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  let activeOrderId: string;
  try {
    const supabase = await createClient();
    const order = await activeOrderService.createActiveOrder(supabase, parsed.data);
    activeOrderId = order.id;
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membuat pesanan.",
    };
  }

  revalidatePath(ACTIVE_ORDERS_PATH);
  return { success: true, message: "Pesanan berhasil disimpan.", activeOrderId };
}

export async function addActiveOrderItemAction(input: {
  active_order_id: string;
  menu_id: string;
  quantity: number;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = addActiveOrderItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await activeOrderService.addItem(supabase, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menambah item.",
    };
  }

  revalidatePath(`${ACTIVE_ORDERS_PATH}/${input.active_order_id}`);
  return { success: true, message: "Item berhasil ditambahkan." };
}

export async function updateActiveOrderItemQuantityAction(input: {
  id: string;
  active_order_id: string;
  quantity: number;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = updateActiveOrderItemQuantitySchema.safeParse({
    id: input.id,
    quantity: input.quantity,
  });
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await activeOrderService.updateItemQuantity(supabase, parsed.data.id, parsed.data.quantity);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengubah kuantitas.",
    };
  }

  revalidatePath(`${ACTIVE_ORDERS_PATH}/${input.active_order_id}`);
  return { success: true, message: "Kuantitas berhasil diperbarui." };
}

export async function removeActiveOrderItemAction(input: {
  id: string;
  active_order_id: string;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = removeActiveOrderItemSchema.safeParse({ id: input.id });
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await activeOrderService.removeItem(supabase, parsed.data.id);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menghapus item.",
    };
  }

  revalidatePath(`${ACTIVE_ORDERS_PATH}/${input.active_order_id}`);
  return { success: true, message: "Item berhasil dihapus." };
}

export async function updateActiveOrderNotesAction(input: {
  id: string;
  notes: string;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = updateActiveOrderNotesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await activeOrderService.updateNotes(supabase, parsed.data.id, parsed.data.notes);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui catatan.",
    };
  }

  revalidatePath(`${ACTIVE_ORDERS_PATH}/${input.id}`);
  return { success: true, message: "Catatan berhasil diperbarui." };
}

/**
 * Cancels an Active Order (OPEN -> CANCELLED). OWNER only — mirrors the
 * void-is-owner-only rule already used for transactions. Enforced here via
 * requireOwner(), backed by the `active_orders_update` RLS policy (which
 * blocks any non-owner from setting status to CANCELLED) as a second layer.
 */
export async function cancelActiveOrderAction(input: { id: string }): Promise<ActionResult> {
  await requireOwner();

  const parsed = cancelActiveOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await activeOrderService.cancelActiveOrder(supabase, parsed.data.id);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membatalkan pesanan.",
    };
  }

  revalidatePath(ACTIVE_ORDERS_PATH);
  revalidatePath(`${ACTIVE_ORDERS_PATH}/${input.id}`);
  redirect(ACTIVE_ORDERS_PATH);
}

export interface CheckoutActiveOrderResult extends ActionResult {
  transactionId?: string;
}

/**
 * Converts an Active Order into a real transaction ("Bayar Sekarang" from
 * the detail page). Both OWNER and KARYAWAN may call this. The actual
 * price snapshotting (carried forward from when items were added to the
 * tab) and atomicity happen inside checkout_active_order() in the
 * database — this is a thin pass-through, same pattern as
 * createSaleTransactionAction.
 */
export async function checkoutActiveOrderAction(input: {
  active_order_id: string;
  payment_method_id: string;
  customer_phone: string;
  notes: string;
}): Promise<CheckoutActiveOrderResult> {
  await requireUser();

  const parsed = checkoutActiveOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  let transactionId: string;
  try {
    const supabase = await createClient();
    const transaction = await activeOrderService.checkoutActiveOrder(supabase, parsed.data);
    transactionId = transaction.id;
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memproses pembayaran.",
    };
  }

  revalidatePath(ACTIVE_ORDERS_PATH);
  revalidatePath(`${ACTIVE_ORDERS_PATH}/${input.active_order_id}`);
  revalidatePath(TRANSACTIONS_PATH);
  return { success: true, message: "Pembayaran berhasil diproses.", transactionId };
}
