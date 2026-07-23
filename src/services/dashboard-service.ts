import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Transaction } from "@/types/database";
import type {
  CategoryIncomeBreakdown,
  DateRangeParam,
  ExpenseTypeBreakdown,
  FinancialDashboardData,
  MonthlyIncomePoint,
  PaymentMethodBalance,
} from "@/types/dashboard";
import { transactionRepository } from "@/repositories/transaction-repository";
import { menuService } from "@/services/menu-service";
import { menuCategoryService } from "@/services/menu-category-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { expenseCategoryService } from "@/services/expense-category-service";
import {
  addDaysToDateOnly,
  addMonthsToMonthKey,
  eachDateOnlyInRange,
  isoDateOnly,
  monthKey,
  startOfUtcDayIso,
} from "@/lib/date-range";

type TypedSupabaseClient = SupabaseClient<Database>;

const EXPENSE_TYPES = ["OPERATIONAL", "INCIDENTAL", "ROUTINE"] as const;
const MONTHLY_TREND_MONTHS = 6;

function sumAmount(transactions: Pick<Transaction, "total_amount">[]): number {
  return transactions.reduce((sum, t) => sum + t.total_amount, 0);
}

/**
 * Business-logic layer for the financial dashboard. Every underlying query
 * goes through `transactionRepository.list` (extended, not duplicated, to
 * support type/status/date-range filters) and the existing master-data
 * services from Steps 2/3.5 — this file only aggregates their results.
 *
 * Every income/expense figure here is filtered at the query level to
 * `status = 'COMPLETED'`, so VOIDED transactions are excluded by
 * construction, not by a follow-up filter that could be forgotten.
 * Category revenue is computed from transaction_items.subtotal (itself
 * derived from the snapshotted price_at_transaction), never from
 * menus.current_price.
 */
export const dashboardService = {
  async getFinancialDashboard(
    supabase: TypedSupabaseClient,
    range: DateRangeParam
  ): Promise<FinancialDashboardData> {
    const rangeFromIso = startOfUtcDayIso(range.from);
    const rangeToExclusiveIso = startOfUtcDayIso(addDaysToDateOnly(range.to, 1));

    const today = isoDateOnly(new Date());
    const todayFromIso = startOfUtcDayIso(today);
    const todayToExclusiveIso = startOfUtcDayIso(addDaysToDateOnly(today, 1));

    const monthStart = `${today.slice(0, 7)}-01`;
    const monthFromIso = startOfUtcDayIso(monthStart);

    const sixMonthsAgoMonth = addMonthsToMonthKey(monthKey(today), -(MONTHLY_TREND_MONTHS - 1));
    const trendFromIso = startOfUtcDayIso(`${sixMonthsAgoMonth}-01`);
    const trendToExclusiveIso = todayToExclusiveIso;

    const [
      rangeIncome,
      rangeExpense,
      todayIncomeTx,
      monthIncomeTx,
      trendIncomeTx,
      allTimeIncome,
      allTimeExpense,
      menus,
      menuCategories,
      paymentMethods,
      expenseCategories,
    ] = await Promise.all([
      transactionRepository.list(supabase, {
        type: "INCOME",
        status: "COMPLETED",
        fromDate: rangeFromIso,
        toDateExclusive: rangeToExclusiveIso,
      }),
      transactionRepository.list(supabase, {
        type: "EXPENSE",
        status: "COMPLETED",
        fromDate: rangeFromIso,
        toDateExclusive: rangeToExclusiveIso,
      }),
      transactionRepository.list(supabase, {
        type: "INCOME",
        status: "COMPLETED",
        fromDate: todayFromIso,
        toDateExclusive: todayToExclusiveIso,
      }),
      transactionRepository.list(supabase, {
        type: "INCOME",
        status: "COMPLETED",
        fromDate: monthFromIso,
        toDateExclusive: todayToExclusiveIso,
      }),
      transactionRepository.list(supabase, {
        type: "INCOME",
        status: "COMPLETED",
        fromDate: trendFromIso,
        toDateExclusive: trendToExclusiveIso,
      }),
      transactionRepository.list(supabase, { type: "INCOME", status: "COMPLETED" }),
      transactionRepository.list(supabase, { type: "EXPENSE", status: "COMPLETED" }),
      menuService.list(supabase),
      menuCategoryService.list(supabase),
      paymentMethodService.list(supabase),
      expenseCategoryService.list(supabase),
    ]);

    const totalIncomeInRange = sumAmount(rangeIncome);
    const totalExpenseInRange = sumAmount(rangeExpense);

    // --- Daily trend: bucket range income by UTC date, filling gaps with 0
    // so the chart is a continuous line across every day in the range. ---
    const dailyTotals = new Map<string, number>();
    for (const t of rangeIncome) {
      const day = t.transaction_date.slice(0, 10);
      dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + t.total_amount);
    }
    const dailyIncomeTrend = eachDateOnlyInRange(range.from, range.to).map((date) => ({
      date,
      total: dailyTotals.get(date) ?? 0,
    }));

    // --- Monthly trend: last 6 calendar months, independent of the range. ---
    const monthlyTotals = new Map<string, number>();
    for (const t of trendIncomeTx) {
      const m = monthKey(t.transaction_date.slice(0, 10));
      monthlyTotals.set(m, (monthlyTotals.get(m) ?? 0) + t.total_amount);
    }
    const monthlyIncomeTrend: MonthlyIncomePoint[] = [];
    for (let i = 0; i < MONTHLY_TREND_MONTHS; i++) {
      const m = addMonthsToMonthKey(sixMonthsAgoMonth, i);
      monthlyIncomeTrend.push({ month: m, total: monthlyTotals.get(m) ?? 0 });
    }

    // --- Category breakdown: needs item-level subtotal/quantity, so fetch
    // transaction_items for the range's income transactions only. ---
    const rangeIncomeIds = rangeIncome.map((t) => t.id);
    const items = await transactionRepository.listItemsByTransactionIds(supabase, rangeIncomeIds);

    const categoryIdByMenuId = new Map(menus.map((m) => [m.id, m.category_id]));
    const categoryNameById = new Map(menuCategories.map((c) => [c.id, c.name]));

    const categoryTotals = new Map<string, { revenue: number; quantity: number }>();
    for (const item of items) {
      const categoryId = categoryIdByMenuId.get(item.menu_id) ?? "unknown";
      const bucket = categoryTotals.get(categoryId) ?? { revenue: 0, quantity: 0 };
      bucket.revenue += item.subtotal;
      bucket.quantity += item.quantity;
      categoryTotals.set(categoryId, bucket);
    }

    const categoryBreakdown: CategoryIncomeBreakdown[] = Array.from(categoryTotals.entries())
      .map(([categoryId, totals]) => ({
        category_id: categoryId,
        category_name: categoryNameById.get(categoryId) ?? "Tidak diketahui",
        total_revenue: totals.revenue,
        total_quantity: totals.quantity,
        percentage: totalIncomeInRange > 0 ? (totals.revenue / totalIncomeInRange) * 100 : 0,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    // --- Expense breakdown by category TYPE (OPERATIONAL/INCIDENTAL/ROUTINE). ---
    const typeByExpenseCategoryId = new Map(expenseCategories.map((c) => [c.id, c.type]));
    const expenseTypeTotals = new Map<string, number>();
    for (const t of rangeExpense) {
      const type = t.expense_category_id
        ? typeByExpenseCategoryId.get(t.expense_category_id) ?? "OPERATIONAL"
        : "OPERATIONAL";
      expenseTypeTotals.set(type, (expenseTypeTotals.get(type) ?? 0) + t.total_amount);
    }
    const expenseBreakdown: ExpenseTypeBreakdown[] = EXPENSE_TYPES.map((type) => {
      const amount = expenseTypeTotals.get(type) ?? 0;
      return {
        type,
        total_amount: amount,
        percentage: totalExpenseInRange > 0 ? (amount / totalExpenseInRange) * 100 : 0,
      };
    });

    // --- Payment method balances: all-time completed income minus all-time
    // completed expense, per method. This is a fund-balance figure, so it is
    // deliberately NOT scoped to the selected date range. ---
    const incomeByMethod = new Map<string, number>();
    for (const t of allTimeIncome) {
      incomeByMethod.set(
        t.payment_method_id,
        (incomeByMethod.get(t.payment_method_id) ?? 0) + t.total_amount
      );
    }
    const expenseByMethod = new Map<string, number>();
    for (const t of allTimeExpense) {
      expenseByMethod.set(
        t.payment_method_id,
        (expenseByMethod.get(t.payment_method_id) ?? 0) + t.total_amount
      );
    }
    const paymentMethodBalances: PaymentMethodBalance[] = paymentMethods.map((pm) => {
      const income = incomeByMethod.get(pm.id) ?? 0;
      const expense = expenseByMethod.get(pm.id) ?? 0;
      return {
        payment_method_id: pm.id,
        payment_method_name: pm.name,
        total_income: income,
        total_expense: expense,
        balance: income - expense,
      };
    });

    return {
      range,
      todayIncome: sumAmount(todayIncomeTx),
      currentMonthIncome: sumAmount(monthIncomeTx),
      totalIncomeInRange,
      totalExpenseInRange,
      netBalanceInRange: totalIncomeInRange - totalExpenseInRange,
      dailyIncomeTrend,
      monthlyIncomeTrend,
      categoryBreakdown,
      expenseBreakdown,
      paymentMethodBalances,
    };
  },
};
