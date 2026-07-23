import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Menu } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export interface CreateMenuInput {
  name: string;
  current_price: number;
  category_id: string;
  description: string | null;
  image_url: string | null;
}

export interface UpdateMenuInput {
  name?: string;
  current_price?: number;
  category_id?: string;
  description?: string | null;
  image_url?: string | null;
}

/**
 * Data access layer for the `menus` table. Kept free of auth/authorization
 * logic (that lives in the Server Actions calling this) so it can be swapped
 * for a Drizzle-backed implementation later without touching callers.
 */
export const menuService = {
  async list(supabase: TypedSupabaseClient): Promise<Menu[]> {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(supabase: TypedSupabaseClient, input: CreateMenuInput): Promise<Menu> {
    const { data, error } = await supabase
      .from("menus")
      .insert({
        name: input.name,
        current_price: input.current_price,
        category_id: input.category_id,
        description: input.description,
        image_url: input.image_url,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateMenuInput
  ): Promise<Menu> {
    const { data, error } = await supabase
      .from("menus")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Toggles active/inactive. Never deletes rows: menus stay referenceable by
   * historical transaction_items regardless of active state.
   */
  async setActive(
    supabase: TypedSupabaseClient,
    id: string,
    isActive: boolean
  ): Promise<Menu> {
    const { data, error } = await supabase
      .from("menus")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
