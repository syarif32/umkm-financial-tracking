"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, cn } from "@/lib/utils";
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
}: {
  transactions: TransactionListItem[];
  isOwner: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border bg-white border-dashed text-center">
        <p className="text-muted-foreground font-medium">Belum ada transaksi.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* --- TAMPILAN MOBILE: KARTU (CARD LIST) --- */}
      <div className="flex flex-col gap-4 md:hidden">
        {transactions.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex flex-col p-4 rounded-2xl border bg-white shadow-sm transition-all relative overflow-hidden",
              t.status === "VOIDED" ? "opacity-60 bg-gray-50" : ""
            )}
          >
            {/* Indikator Warna di Kiri (opsional tapi membantu visual) */}
            <div 
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5",
                t.type === "INCOME" ? "bg-emerald-500" : "bg-gray-400"
              )} 
            />

            <div className="flex justify-between items-start mb-2 pl-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {formatDateTime(t.transaction_date)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={t.type === "INCOME" ? "success" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {t.type === "INCOME" ? "Penjualan" : "Pengeluaran"}
                  </Badge>
                  {t.status === "VOIDED" && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0" title={t.void_reason ?? undefined}>
                      Dibatalkan
                    </Badge>
                  )}
                </div>
              </div>
              <span 
                className={cn(
                  "text-lg font-bold text-right",
                  t.type === "INCOME" ? "text-emerald-600" : "text-gray-700"
                )}
              >
                {t.type === "INCOME" ? "+" : "-"}{formatRupiah(t.total_amount)}
              </span>
            </div>

            <div className="pl-2 my-2">
              <p className="text-sm font-medium text-gray-800 leading-snug">
                {describeTransaction(t)}
              </p>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 pl-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400">Metode & Kasir</span>
                <span className="text-xs font-medium text-gray-600">
                  {t.payment_method_name} • {t.creator_name}
                </span>
              </div>
              
              {/* Tombol Aksi Void untuk Owner */}
              {isOwner && t.status === "COMPLETED" && (
                <div className="shrink-0">
                  <VoidTransactionDialog transactionId={t.id} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- TAMPILAN DESKTOP: TABEL STANDAR --- */}
      <div className="hidden md:block rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Dibuat oleh</TableHead>
              <TableHead>Status</TableHead>
              {isOwner && <TableHead className="w-16 text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id} className={t.status === "VOIDED" ? "opacity-60 bg-gray-50" : undefined}>
                <TableCell className="whitespace-nowrap text-sm text-gray-600">
                  {formatDateTime(t.transaction_date)}
                </TableCell>
                <TableCell>
                  <Badge variant={t.type === "INCOME" ? "success" : "secondary"}>
                    {t.type === "INCOME" ? "Penjualan" : "Pengeluaran"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-64 truncate font-medium text-gray-800" title={describeTransaction(t)}>
                  {describeTransaction(t)}
                </TableCell>
                <TableCell className="text-gray-600">{t.payment_method_name}</TableCell>
                <TableCell className={cn("text-right font-bold", t.type === "INCOME" ? "text-emerald-600" : "text-gray-700")}>
                  {formatRupiah(t.total_amount)}
                </TableCell>
                <TableCell className="text-gray-600">{t.creator_name}</TableCell>
                <TableCell>
                  {t.status === "COMPLETED" ? (
                    <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Selesai</Badge>
                  ) : (
                    <Badge variant="destructive" title={t.void_reason ?? undefined}>
                      Dibatalkan
                    </Badge>
                  )}
                </TableCell>
                {isOwner && (
                  <TableCell className="text-right">
                    {t.status === "COMPLETED" && <VoidTransactionDialog transactionId={t.id} />}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}