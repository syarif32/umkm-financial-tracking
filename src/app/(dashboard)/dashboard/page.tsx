import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { dashboardService } from "@/services/dashboard-service";
import { isoDateOnly } from "@/lib/date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilterForm } from "@/components/dashboard/date-range-filter-form";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { DailyIncomeChart } from "@/components/dashboard/daily-income-chart";
import { MonthlyIncomeChart } from "@/components/dashboard/monthly-income-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { PaymentMethodBalances } from "@/components/dashboard/payment-method-balances";

function defaultRange() {
  const today = isoDateOnly(new Date());
  const from = `${today.slice(0, 7)}-01`;
  return { from, to: today };
}

function isValidDateOnly(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { profile } = await requireUser();
  const params = await searchParams;

  if (profile.role !== "OWNER") {
    // Financial reporting is Owner-only (see Step 1 RBAC design) — Karyawan
    // gets a simple shift-focused landing instead. This branch never calls
    // dashboardService, so the aggregation queries never run for Karyawan;
    // RLS on transactions/transaction_items would additionally cap them to
    // their own rows even if it somehow did.
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Halo, {profile.full_name}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Shift</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gunakan menu Transaksi untuk mencatat penjualan dan pengeluaran selama shift Anda.
          </CardContent>
        </Card>
      </div>
    );
  }

  const fallback = defaultRange();
  const range = {
    from: isValidDateOnly(params.from) ? params.from : fallback.from,
    to: isValidDateOnly(params.to) ? params.to : fallback.to,
  };
  // Guard against an inverted range (e.g. a hand-edited URL).
  if (range.from > range.to) {
    [range.from, range.to] = [range.to, range.from];
  }

  const supabase = await createClient();
  const data = await dashboardService.getFinancialDashboard(supabase, range);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan performa bisnis. Kartu &quot;Hari Ini&quot; dan &quot;Bulan Ini&quot; selalu
            mengikuti tanggal saat ini; bagian lain mengikuti rentang tanggal yang dipilih.
          </p>
        </div>
        <DateRangeFilterForm from={range.from} to={range.to} />
      </div>

      <KpiCards
        todayIncome={data.todayIncome}
        currentMonthIncome={data.currentMonthIncome}
        totalIncomeInRange={data.totalIncomeInRange}
        totalExpenseInRange={data.totalExpenseInRange}
        netBalanceInRange={data.netBalanceInRange}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DailyIncomeChart data={data.dailyIncomeTrend} />
        <MonthlyIncomeChart data={data.monthlyIncomeTrend} />
      </div>

      <CategoryBreakdown data={data.categoryBreakdown} />

      <ExpenseBreakdown data={data.expenseBreakdown} />

      <PaymentMethodBalances balances={data.paymentMethodBalances} />
    </div>
  );
}
