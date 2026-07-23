"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { menuService } from "@/services/menu-service";
import { menuSchema, idSchema, activeStateSchema } from "@/lib/validation/master-data";

export interface ActionResult {
  success: boolean;
  message: string;
}

const MASTER_DATA_PATH = "/dashboard/master-data";

function firstFieldError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

export async function createMenuAction(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    current_price: formData.get("current_price"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    image_url: formData.get("image_url"),
  });

  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    await menuService.create(supabase, {
      name: parsed.data.name,
      current_price: parsed.data.current_price,
      category_id: parsed.data.category_id,
      description: parsed.data.description || null,
      image_url: parsed.data.image_url || null,
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membuat menu.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Menu berhasil dibuat." };
}

export async function updateMenuAction(formData: FormData): Promise<ActionResult> {
  await requireOwner();

  const idParsed = idSchema.safeParse(formData.get("id"));
  if (!idParsed.success) {
    return { success: false, message: "ID menu tidak valid." };
  }

  const parsed = menuSchema.safeParse({
    name: formData.get("name"),
    current_price: formData.get("current_price"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    image_url: formData.get("image_url"),
  });

  if (!parsed.success) {
    return { success: false, message: firstFieldError(parsed.error) };
  }

  try {
    const supabase = await createClient();
    // Updates only touch `menus.current_price` / `name` / category / display
    // fields. Existing transaction_items keep their own snapshotted
    // price_at_transaction, so historical totals are unaffected by this change.
    await menuService.update(supabase, idParsed.data, {
      name: parsed.data.name,
      current_price: parsed.data.current_price,
      category_id: parsed.data.category_id,
      description: parsed.data.description || null,
      image_url: parsed.data.image_url || null,
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui menu.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return { success: true, message: "Menu berhasil diperbarui." };
}

export async function setMenuActiveAction(
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
    await menuService.setActive(supabase, parsed.data.id, parsed.data.is_active);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengubah status menu.",
    };
  }

  revalidatePath(MASTER_DATA_PATH);
  return {
    success: true,
    message: isActive ? "Menu diaktifkan." : "Menu dinonaktifkan.",
  };
}
