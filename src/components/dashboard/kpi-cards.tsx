import { formatRupiah, cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, CalendarDays, Coins } from "lucide-react";

interface OmitKpiCardProps {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative" | "primary";
  icon: React.ElementType;
}

function KpiCard({ label, value, tone = "default", icon: Icon }: OmitKpiCardProps) {
  // Menentukan warna background dan ikon berdasarkan "tone"
  const styles = {
    primary: {
      wrapper: "bg-blue-50/50 border-blue-100",
      iconBox: "bg-blue-100 text-blue-600",
      text: "text-blue-700",
    },
    positive: {
      wrapper: "bg-emerald-50/50 border-emerald-100",
      iconBox: "bg-emerald-100 text-emerald-600",
      text: "text-emerald-700",
    },
    negative: {
      wrapper: "bg-red-50/50 border-red-100",
      iconBox: "bg-red-100 text-red-600",
      text: "text-red-700",
    },
    default: {
      wrapper: "bg-white border-gray-100",
      iconBox: "bg-gray-100 text-gray-600",
      text: "text-gray-900",
    },
  }[tone];

  return (
    <div className={cn("flex flex-col p-5 rounded-2xl border transition-all", styles.wrapper)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2.5 rounded-xl", styles.iconBox)}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-600">{label}</h3>
      </div>
      <span className={cn("text-2xl md:text-3xl font-bold tracking-tight", styles.text)}>
        {formatRupiah(value)}
      </span>
    </div>
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
    <div className="flex flex-col gap-6">
      {/* Grup 1: Pantauan Harian & Bulanan (Fokus Utama) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard 
          label="Pendapatan Hari Ini" 
          value={todayIncome} 
          tone="primary" 
          icon={Wallet} 
        />
        <KpiCard 
          label="Pendapatan Bulan Ini" 
          value={currentMonthIncome} 
          icon={CalendarDays} 
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sesuai Rentang Tanggal</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>

      {/* Grup 2: Analisis Rentang Waktu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard 
          label="Total Pendapatan" 
          value={totalIncomeInRange} 
          tone="positive" 
          icon={TrendingUp} 
        />
        <KpiCard 
          label="Total Pengeluaran" 
          value={totalExpenseInRange} 
          tone="negative" 
          icon={TrendingDown} 
        />
        <div className="sm:col-span-2 lg:col-span-1">
          <KpiCard
            label="Saldo Bersih"
            value={netBalanceInRange}
            tone={netBalanceInRange >= 0 ? "positive" : "negative"}
            icon={Coins}
          />
        </div>
      </div>
    </div>
  );
}