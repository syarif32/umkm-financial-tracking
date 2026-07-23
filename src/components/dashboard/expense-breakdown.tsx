"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompactRupiah, formatRupiah } from "@/lib/utils";
import type { ExpenseTypeBreakdown } from "@/types/dashboard";

const TYPE_LABEL: Record<ExpenseTypeBreakdown["type"], string> = {
  OPERATIONAL: "Operasional",
  INCIDENTAL: "Insidental",
  ROUTINE: "Rutin",
};

export function ExpenseBreakdown({ data }: { data: ExpenseTypeBreakdown[] }) {
  const chartData = data.map((d) => ({ ...d, label: TYPE_LABEL[d.type] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rincian Pengeluaran per Kategori</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="h-64 w-full lg:w-72 lg:shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis
                tickFormatter={formatCompactRupiah}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip formatter={(value) => [formatRupiah(Number(value)), "Pengeluaran"]} />
              <Bar dataKey="total_amount" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 flex-1 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.type}>
                  <TableCell className="font-medium">{TYPE_LABEL[row.type]}</TableCell>
                  <TableCell className="text-right">{formatRupiah(row.total_amount)}</TableCell>
                  <TableCell className="text-right">{row.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
