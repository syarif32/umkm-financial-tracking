import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative";
}

function KpiCard({ label, value, tone = "default" }: KpiCardProps) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className={`text-2xl font-semibold ${toneClass}`}>{formatRupiah(value)}</span>
      </CardContent>
    </Card>
  );
}

export function KpiCards({
  todayIncome,
  currentMonthIncome,
  totalIncomeInRange,
  totalExpenseInRange,
  netBalanceInRange,
}: {
  todayIncome: number;
  currentMonthIncome: number;
  totalIncomeInRange: number;
  totalExpenseInRange: number;
  netBalanceInRange: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Pendapatan Hari Ini" value={todayIncome} />
      <KpiCard label="Pendapatan Bulan Ini" value={currentMonthIncome} />
      <KpiCard label="Total Pendapatan (Rentang)" value={totalIncomeInRange} tone="positive" />
      <KpiCard label="Total Pengeluaran (Rentang)" value={totalExpenseInRange} tone="negative" />
      <KpiCard
        label="Saldo Bersih (Rentang)"
        value={netBalanceInRange}
        tone={netBalanceInRange >= 0 ? "positive" : "negative"}
      />
    </div>
  );
}
