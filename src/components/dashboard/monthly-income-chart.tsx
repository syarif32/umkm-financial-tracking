"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactRupiah, formatRupiah } from "@/lib/utils";
import type { MonthlyIncomePoint } from "@/types/dashboard";

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_LABEL[month - 1]} ${String(year).slice(2)}`;
}

export function MonthlyIncomeChart({ data }: { data: MonthlyIncomePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Pendapatan Bulanan (6 Bulan Terakhir)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} fontSize={12} tickLine={false} />
              <YAxis
                tickFormatter={formatCompactRupiah}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                labelFormatter={(label) => formatMonthLabel(String(label))}
                formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
