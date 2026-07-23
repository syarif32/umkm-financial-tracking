import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PaymentMethod } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export interface CreatePaymentMethodInput {
  name: string;
}

export interface UpdatePaymentMethodInput {
  name?: string;
}

/**
 * Data access layer for the `payment_methods` table. Deactivating a payment
 * method is a soft-toggle (is_active=false) — rows are never deleted, so
 * transactions that reference a payment_method_id keep resolving correctly.
 */
export const paymentMethodService = {
  async list(supabase: TypedSupabaseClient): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(
    supabase: TypedSupabaseClient,
    input: CreatePaymentMethodInput
  ): Promise<PaymentMethod> {
    const { data, error } = await supabase
      .from("payment_methods")
      .insert({ name: input.name })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdatePaymentMethodInput
  ): Promise<PaymentMethod> {
    const { data, error } = await supabase
      .from("payment_methods")
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
  ): Promise<PaymentMethod> {
    const { data, error } = await supabase
      .from("payment_methods")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
