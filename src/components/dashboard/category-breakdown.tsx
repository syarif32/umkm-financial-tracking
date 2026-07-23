"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/utils";
import type { CategoryIncomeBreakdown } from "@/types/dashboard";

const COLORS = [
  "oklch(0.65 0.2 250)",
  "oklch(0.7 0.2 160)",
  "oklch(0.75 0.2 80)",
  "oklch(0.65 0.22 20)",
  "oklch(0.6 0.15 300)",
];

export function CategoryBreakdown({ data }: { data: CategoryIncomeBreakdown[] }) {
  const hasData = data.some((d) => d.total_revenue > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendapatan per Kategori Menu</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="h-64 w-full lg:w-64 lg:shrink-0">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total_revenue"
                  nameKey="category_name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.category_id} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatRupiah(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Belum ada data penjualan.
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Qty Terjual</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Belum ada data.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row) => (
                <TableRow key={row.category_id}>
                  <TableCell className="font-medium">{row.category_name}</TableCell>
                  <TableCell className="text-right">{row.total_quantity}</TableCell>
                  <TableCell className="text-right">{formatRupiah(row.total_revenue)}</TableCell>
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
