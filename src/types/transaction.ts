import type {
  ExpenseCategoryType,
  Transaction,
  TransactionItem,
  TransactionStatus,
  TransactionType,
} from "@/types/database";

/**
 * A single transaction enriched with the display data a history view needs
 * (payment method name, category, creator name, and — for INCOME — its
 * line items with menu names). Built by joining in the service layer rather
 * than relying on Supabase's embedded-resource select typing.
 */
export type TransactionListItem = Transaction & {
  payment_method_name: string;
  expense_category_name: string | null;
  expense_category_type: ExpenseCategoryType | null;
  creator_name: string;
  voided_by_name: string | null;
  items: TransactionItemWithMenuName[];
};

export type TransactionItemWithMenuName = TransactionItem & {
  menu_name: string;
};

export type SaleItemInput = {
  menu_id: string;
  quantity: number;
};

export type CreateSaleTransactionInput = {
  payment_method_id: string;
  notes: string;
  items: SaleItemInput[];
};

export type CreateExpenseTransactionInput = {
  payment_method_id: string;
  expense_category_id: string;
  amount: number;
  notes: string;
  transaction_date?: Date;
};

export type VoidTransactionInput = {
  id: string;
  reason: string;
};

export type TransactionHistoryFilter = {
  type?: TransactionType;
  status?: TransactionStatus;
};
