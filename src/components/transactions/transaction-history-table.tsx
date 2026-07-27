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
  currentPage,
  totalPages,
}: {
  transactions: TransactionListItem[];
  isOwner: boolean;
  emptyMessage?: string;
  currentPage?: number;
  totalPages?: number;
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 📱 TAMPILAN MOBILE: Berupa daftar kartu vertikal (Sembunyi di layar besar) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {transactions.map((t) => (
          <div
            key={t.id}
            className={`flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm ${
              t.status === "VOIDED" ? "opacity-60" : ""
            }`}
          >
            {/* Header Kartu: Badge & Tanggal */}
            <div className="flex items-center justify-between">
              <Badge variant={t.type === "INCOME" ? "success" : "secondary"} className="text-xs">
                {t.type === "INCOME" ? "Penjualan" : "Pengeluaran"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(t.transaction_date)}
              </span>
            </div>

            {/* Body Kartu: Nominal & Deskripsi */}
            <div>
              <p className="text-lg font-bold">{formatRupiah(t.total_amount)}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground" title={describeTransaction(t)}>
                {describeTransaction(t)}
              </p>
            </div>

            {/* Footer Kartu: Metode, Kasir, Status & Tombol Aksi */}
            <div className="mt-1 flex items-end justify-between border-t pt-3">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>💳 {t.payment_method_name}</span>
                <span>👤 {t.creator_name}</span>
                <div>
                  {t.status === "COMPLETED" ? (
                    <span className="font-medium text-emerald-600">Selesai</span>
                  ) : (
                    <span className="font-medium text-destructive">Dibatalkan</span>
                  )}
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 px-2">
                  <Link href={`/dashboard/transactions/${t.id}`}>
                    <Eye className="mr-1 h-4 w-4" /> Detail
                  </Link>
                </Button>
                {isOwner && t.status === "COMPLETED" && (
                  <VoidTransactionDialog transactionId={t.id} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 💻 TAMPILAN DESKTOP: Berupa Tabel standar (Sembunyi di layar kecil) */}
      <div className="hidden rounded-lg border md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Tanggal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableCell className="max-w-[200px] truncate" title={describeTransaction(t)}>
                  {describeTransaction(t)}
                </TableCell>
                <TableCell>{t.payment_method_name}</TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">
                  {formatRupiah(t.total_amount)}
                </TableCell>
                <TableCell>{t.creator_name}</TableCell>
                <TableCell>
                  {t.status === "COMPLETED" ? (
                    <Badge variant="success">Selesai</Badge>
                  ) : (
                    <Badge variant="destructive" title={t.void_reason ?? undefined}>
                      Batal
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
    </div>
  );
}