export type UserRole = "OWNER" | "KARYAWAN";

export type ExpenseCategoryType = "OPERATIONAL" | "INCIDENTAL" | "ROUTINE";

export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionStatus = "COMPLETED" | "VOIDED";

// NOTE: these are `type` aliases, not `interface`s, deliberately.
// TypeScript only synthesizes an implicit index signature for object type
// *literals* — an `interface` with the exact same fields does NOT satisfy
// `extends Record<string, unknown>`, which is what @supabase/supabase-js's
// generic `SupabaseClient<Database>` constraint checks against internally.
// Using `interface` here silently collapses every `.from(...)` call to
// `never`, so `type` is required for the typed client to actually work.
export type Profile = {
  id: string; // matches auth.users.id
  role: UserRole;
  full_name: string;
  created_at: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Menu = {
  id: string;
  name: string;
  current_price: number;
  is_active: boolean;
  category_id: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  type: ExpenseCategoryType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  user_id: string;
  payment_method_id: string;
  expense_category_id: string | null;
  total_amount: number;
  notes: string | null;
  transaction_date: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionItem = {
  id: string;
  transaction_id: string;
  menu_id: string;
  quantity: number;
  price_at_transaction: number;
  subtotal: number;
  created_at: string;
};

export type SaleItemArg = {
  menu_id: string;
  quantity: number;
};

/**
 * Minimal Supabase Database type for the tables introduced so far.
 * Extend this incrementally as new tables (transactions, etc.) are added
 * in later steps — do not hand-roll separate ad-hoc types elsewhere.
 */
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menus: {
        Row: Menu;
        Insert: {
          id?: string;
          name: string;
          current_price: number;
          is_active?: boolean;
          category_id: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          current_price?: number;
          is_active?: boolean;
          category_id?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: PaymentMethod;
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: ExpenseCategory;
        Insert: {
          id?: string;
          name: string;
          type: ExpenseCategoryType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: ExpenseCategoryType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: {
          id?: string;
          type: TransactionType;
          status?: TransactionStatus;
          user_id: string;
          payment_method_id: string;
          expense_category_id?: string | null;
          total_amount: number;
          notes?: string | null;
          transaction_date?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: TransactionType;
          status?: TransactionStatus;
          user_id?: string;
          payment_method_id?: string;
          expense_category_id?: string | null;
          total_amount?: number;
          notes?: string | null;
          transaction_date?: string;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transaction_items: {
        Row: TransactionItem;
        Insert: {
          id?: string;
          transaction_id: string;
          menu_id: string;
          quantity: number;
          price_at_transaction: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          menu_id?: string;
          quantity?: number;
          price_at_transaction?: number;
          subtotal?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_sale_transaction: {
        Args: {
          p_payment_method_id: string;
          p_notes: string | null;
          p_items: SaleItemArg[];
        };
        Returns: Transaction;
      };
    };
  };
};
