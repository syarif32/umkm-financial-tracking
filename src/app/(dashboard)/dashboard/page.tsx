import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { dashboardService } from "@/services/dashboard-service";
import { isoDateOnly } from "@/lib/date-range";
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
    // Tampilan khusus KARYAWAN: Hangat, bersih, dan langsung ke intinya
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm">
          <h1 className="text-2xl font-bold">Halo, {profile.full_name}! 👋</h1>
          <p className="text-blue-100 mt-1 text-sm">Selamat bekerja di shift Anda hari ini.</p>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-2">Ringkasan Shift</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Gunakan menu <strong className="text-gray-700">Kasir</strong> di bawah untuk mulai mencatat pesanan pelanggan atau mencatat pengeluaran warung selama shift Anda.
          </p>
        </div>
      </div>
    );
  }

  const fallback = defaultRange();
  const range = {
    from: isValidDateOnly(params.from) ? params.from : fallback.from,
    to: isValidDateOnly(params.to) ? params.to : fallback.to,
  };
  
  if (range.from > range.to) {
    [range.from, range.to] = [range.to, range.from];
  }

  const supabase = await createClient();
  const data = await dashboardService.getFinancialDashboard(supabase, range);

  // Tampilan khusus OWNER
  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* Header Dashboard & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard Keuangan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau performa bisnis dan arus kas Anda.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <DateRangeFilterForm from={range.from} to={range.to} />
        </div>
      </div>

      {/* Metrik Utama */}
      <KpiCards
        todayIncome={data.todayIncome}
        currentMonthIncome={data.currentMonthIncome}
        totalIncomeInRange={data.totalIncomeInRange}
        totalExpenseInRange={data.totalExpenseInRange}
        netBalanceInRange={data.netBalanceInRange}
      />

      {/* Bagian Grafik (Diberikan padding dan border agar menyatu dengan gaya baru) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <DailyIncomeChart data={data.dailyIncomeTrend} />
        </div>
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <MonthlyIncomeChart data={data.monthlyIncomeTrend} />
        </div>
      </div>

      {/* Breakdown Data */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <CategoryBreakdown data={data.categoryBreakdown} />
        </div>
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <ExpenseBreakdown data={data.expenseBreakdown} />
        </div>
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <PaymentMethodBalances balances={data.paymentMethodBalances} />
        </div>
      </div>
    </div>
  );
}