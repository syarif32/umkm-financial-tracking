"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { expenseCategoryService } from "@/services/expense-category-service";
import {
  expenseCategorySchema,
  idSchema,
  activeStateSchema,
} from "@/lib/validation/master-data";
import type { ActionResult } from "./menu-actions";

const MASTER_DATA_PATH = "/dashboard/master-data";

function firstFieldError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

export async function createExpenseCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  await requireOwner();

  const parsed = expenseCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await expenseCategoryService.create(supabase, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membuat kategori pengeluaran.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Kategori pengeluaran berhasil dibuat." };
}

export async function updateExpenseCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  await requireOwner();

  const idParsed = idSchema.safeParse(formData.get("id"));
  if (!idParsed.success) {
    return { success: false, message: "ID kategori tidak valid." };
  }

  const parsed = expenseCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await expenseCategoryService.update(supabase, idParsed.data, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui kategori pengeluaran.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Kategori pengeluaran berhasil diperbarui." };
}

export async function setExpenseCategoryActiveAction(
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
    await expenseCategoryService.setActive(supabase, parsed.data.id, parsed.data.is_active);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengubah status kategori.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return {
    success: true,
    message: isActive ? "Kategori diaktifkan." : "Kategori dinonaktifkan.",
  };
}
