"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/utils";
import type { TransactionListItem } from "@/types/transaction";
import { VoidTransactionDialog } from "./void-transaction-dialog";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function describeTransaction(t: TransactionListItem): string {
  if (t.type === "EXPENSE") {
    return t.expense_category_name ?? "—";
  }
  if (t.items.length === 0) return "—";
  return t.items.map((item) => `${item.quantity}x ${item.menu_name}`).join(", ");
}

export function TransactionHistoryTable({
  transactions,
  isOwner,
  emptyMessage = "Belum ada transaksi.",
}: {
  transactions: TransactionListItem[];
  isOwner: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Metode</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead>Dibuat oleh</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {transactions.map((t) => (
            <TableRow key={t.id} className={t.status === "VOIDED" ? "opacity-60" : undefined}>
              <TableCell className="whitespace-nowrap text-sm">
                {formatDateTime(t.transaction_date)}
              </TableCell>
              <TableCell>
                <Badge variant={t.type === "INCOME" ? "success" : "secondary"}>
                  {t.type === "INCOME" ? "Penjualan" : "Pengeluaran"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-64 truncate" title={describeTransaction(t)}>
                {describeTransaction(t)}
              </TableCell>
              <TableCell>{t.payment_method_name}</TableCell>
              <TableCell className="text-right font-medium">
                {formatRupiah(t.total_amount)}
              </TableCell>
              <TableCell>{t.creator_name}</TableCell>
              <TableCell>
                {t.status === "COMPLETED" ? (
                  <Badge variant="success">Selesai</Badge>
                ) : (
                  <Badge variant="destructive" title={t.void_reason ?? undefined}>
                    Dibatalkan
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Lihat detail">
                    <Link href={`/dashboard/transactions/${t.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {isOwner && t.status === "COMPLETED" && (
                    <VoidTransactionDialog transactionId={t.id} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
