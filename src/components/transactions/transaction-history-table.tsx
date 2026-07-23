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
}: {
  transactions: TransactionListItem[];
  isOwner: boolean;
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
            {isOwner && <TableHead className="w-16 text-right">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isOwner ? 8 : 7}
                className="text-center text-muted-foreground"
              >
                Belum ada transaksi.
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
  );
}
