"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactRupiah, formatRupiah } from "@/lib/utils";
import type { DailyIncomePoint } from "@/types/dashboard";

function formatShortDate(dateOnly: string): string {
  const [, month, day] = dateOnly.split("-");
  return `${day}/${month}`;
}

export function DailyIncomeChart({ data }: { data: DailyIncomePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Pendapatan Harian</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCompactRupiah}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                labelFormatter={(label) => formatShortDate(String(label))}
                formatter={(value) => [formatRupiah(Number(value)), "Pendapatan"]}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
