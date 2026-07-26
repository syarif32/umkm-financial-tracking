"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireOwner } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { transactionService } from "@/services/transaction-service";
import {
  createSaleTransactionSchema,
  createExpenseTransactionSchema,
  voidTransactionSchema,
} from "@/lib/validation/transaction";
import type { ActionResult } from "./menu-actions";

const TRANSACTIONS_PATH = "/dashboard/transactions";

function firstFieldError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

/**
 * Creates a sale (INCOME) transaction. Both OWNER and KARYAWAN may call
 * this — Karyawan's core job in this system is entering sales during their
 * shift. The client only ever supplies menu_id + quantity; price snapshotting
 * and total calculation happen server-side inside the database (see
 * create_sale_transaction in migration 0003), never trusting client-sent
 * prices or totals.
 */
export async function createSaleTransactionAction(input: {
  payment_method_id: string;
  notes: string;
  customer_phone: string;
  customer_name?: string | null;
  items: { menu_id: string; quantity: number }[];
}): Promise<ActionResult> {
  await requireUser();

  const parsed = createSaleTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await transactionService.createSaleTransaction(supabase, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membuat transaksi penjualan.",
    };
  }

  revalidatePath(TRANSACTIONS_PATH);
  return { success: true, message: "Transaksi penjualan berhasil dicatat." };
}

/**
 * Creates an expense transaction. Both OWNER and KARYAWAN may call this.
 */
export async function createExpenseTransactionAction(input: {
  payment_method_id: string;
  expense_category_id: string;
  amount: number;
  customer_phone: string;
  customer_name: string;
  notes: string;
  transaction_date?: string;
}): Promise<ActionResult> {
  const currentUser = await requireUser();

  const parsed = createExpenseTransactionSchema.safeParse({
    ...input,
    transaction_date: input.transaction_date || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await transactionService.createExpenseTransaction(supabase, currentUser.id, {
  ...parsed.data,
  customer_name: null,
  customer_phone: null,
});
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mencatat pengeluaran.",
    };
  }

  revalidatePath(TRANSACTIONS_PATH);
  return { success: true, message: "Pengeluaran berhasil dicatat." };
}

/**
 * Voids a historical transaction. OWNER only — enforced here via
 * requireOwner(), backed by the `transactions_update_owner` RLS policy as a
 * second line of defense. Karyawan calling this directly (e.g. by forging a
 * request) is rejected before any database call happens.
 */
export async function voidTransactionAction(input: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  const owner = await requireOwner();

  const parsed = voidTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await transactionService.voidTransaction(supabase, owner.id, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membatalkan transaksi.",
    };
  }

  revalidatePath(TRANSACTIONS_PATH);
  return { success: true, message: "Transaksi berhasil dibatalkan." };
}
