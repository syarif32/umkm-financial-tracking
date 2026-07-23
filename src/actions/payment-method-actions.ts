"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { paymentMethodService } from "@/services/payment-method-service";
import {
  paymentMethodSchema,
  idSchema,
  activeStateSchema,
} from "@/lib/validation/master-data";
import type { ActionResult } from "./menu-actions";

const MASTER_DATA_PATH = "/dashboard/master-data";

function firstFieldError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

export async function createPaymentMethodAction(
  formData: FormData
): Promise<ActionResult> {
  await requireOwner();

  const parsed = paymentMethodSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await paymentMethodService.create(supabase, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membuat metode pembayaran.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Metode pembayaran berhasil dibuat." };
}

export async function updatePaymentMethodAction(
  formData: FormData
): Promise<ActionResult> {
  await requireOwner();

  const idParsed = idSchema.safeParse(formData.get("id"));
  if (!idParsed.success) {
    return { success: false, message: "ID metode pembayaran tidak valid." };
  }

  const parsed = paymentMethodSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await paymentMethodService.update(supabase, idParsed.data, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui metode pembayaran.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Metode pembayaran berhasil diperbarui." };
}

export async function setPaymentMethodActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireOwner();

  const parsed = activeStateSchema.safeParse({ id, is_active: isActive });
  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    // Deactivating only flips is_active — the row (and its id) is preserved so
    // any transaction.payment_method_id referencing it keeps resolving.
    await paymentMethodService.setActive(supabase, parsed.data.id, parsed.data.is_active);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengubah status metode pembayaran.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return {
    success: true,
    message: isActive ? "Metode pembayaran diaktifkan." : "Metode pembayaran dinonaktifkan.",
  };
}
