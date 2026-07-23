export type DateRangeParam = {
  /** Inclusive, 'YYYY-MM-DD'. */
  from: string;
  /** Inclusive, 'YYYY-MM-DD'. */
  to: string;
};

export type DailyIncomePoint = {
  /** 'YYYY-MM-DD' */
  date: string;
  total: number;
};

export type MonthlyIncomePoint = {
  /** 'YYYY-MM' */
  month: string;
  total: number;
};

export type CategoryIncomeBreakdown = {
  category_id: string;
  category_name: string;
  total_revenue: number;
  total_quantity: number;
  percentage: number;
};

export type ExpenseTypeBreakdown = {
  type: "OPERATIONAL" | "INCIDENTAL" | "ROUTINE";
  total_amount: number;
  percentage: number;
};

export type PaymentMethodBalance = {
  payment_method_id: string;
  payment_method_name: string;
  total_income: number;
  total_expense: number;
  balance: number;
};

export type FinancialDashboardData = {
  range: DateRangeParam;

  /** Always "today" / "this calendar month" regardless of the selected range. */
  todayIncome: number;
  currentMonthIncome: number;

  /** Scoped to the selected date range. */
  totalIncomeInRange: number;
  totalExpenseInRange: number;
  netBalanceInRange: number;

  dailyIncomeTrend: DailyIncomePoint[];
  /** Last 6 calendar months, independent of the selected range. */
  monthlyIncomeTrend: MonthlyIncomePoint[];

  categoryBreakdown: CategoryIncomeBreakdown[];
  expenseBreakdown: ExpenseTypeBreakdown[];

  /**
   * All-time (not range-scoped) — this represents actual fund balances per
   * payment method (cash on hand, QRIS balance, etc.), not a period metric.
   */
  paymentMethodBalances: PaymentMethodBalance[];
};
