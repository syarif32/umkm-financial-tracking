import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ExpenseCategory, ExpenseCategoryType } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export interface CreateExpenseCategoryInput {
  name: string;
  type: ExpenseCategoryType;
}

export interface UpdateExpenseCategoryInput {
  name?: string;
  type?: ExpenseCategoryType;
}

export const expenseCategoryService = {
  async list(supabase: TypedSupabaseClient): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreateExpenseCategoryInput
  ): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from("expense_categories")
      .insert({ name: input.name, type: input.type })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateExpenseCategoryInput
  ): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from("expense_categories")
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
  ): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from("expense_categories")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
