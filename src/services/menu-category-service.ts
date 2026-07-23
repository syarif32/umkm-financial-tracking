import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MenuCategory } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export interface CreateMenuCategoryInput {
  name: string;
  slug: string;
}

export interface UpdateMenuCategoryInput {
  name?: string;
  slug?: string;
}

/**
 * Data access layer for `menu_categories`. Deactivating a category is a soft
 * toggle — existing menus keep their category_id regardless, so historical
 * transaction_items (which reference menus, not categories directly) are
 * never affected.
 */
export const menuCategoryService = {
  async list(supabase: TypedSupabaseClient): Promise<MenuCategory[]> {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateMenuCategoryInput
  ): Promise<MenuCategory> {
    const { data, error } = await supabase
      .from("menu_categories")
      .insert({ name: input.name, slug: input.slug })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateMenuCategoryInput
  ): Promise<MenuCategory> {
    const { data, error } = await supabase
      .from("menu_categories")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async setActive(
    supabase: TypedSupabaseClient,
    id: string,
    isActive: boolean
  ): Promise<MenuCategory> {
    const { data, error } = await supabase
      .from("menu_categories")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
