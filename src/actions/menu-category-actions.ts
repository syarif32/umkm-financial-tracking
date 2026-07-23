"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { menuCategoryService } from "@/services/menu-category-service";
import { menuCategorySchema, idSchema, activeStateSchema } from "@/lib/validation/master-data";
import type { ActionResult } from "./menu-actions";

const MASTER_DATA_PATH = "/dashboard/master-data";

function firstFieldError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

export async function createMenuCategoryAction(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const parsed = menuCategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await menuCategoryService.create(supabase, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membuat kategori menu.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Kategori menu berhasil dibuat." };
}

export async function updateMenuCategoryAction(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const idParsed = idSchema.safeParse(formData.get("id"));
  if (!idParsed.success) {
    return { success: false, message: "ID kategori tidak valid." };
  }

  const parsed = menuCategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await menuCategoryService.update(supabase, idParsed.data, parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui kategori menu.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Kategori menu berhasil diperbarui." };
}

export async function setMenuCategoryActiveAction(
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
    await menuCategoryService.setActive(supabase, parsed.data.id, parsed.data.is_active);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengubah status kategori menu.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return {
    success: true,
    message: isActive ? "Kategori menu diaktifkan." : "Kategori menu dinonaktifkan.",
  };
}
