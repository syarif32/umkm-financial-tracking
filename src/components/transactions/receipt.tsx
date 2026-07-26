"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_INFO } from "@/lib/business-info";
import { formatRupiah } from "@/lib/utils";
import type { TransactionListItem } from "@/types/transaction";

const TYPE_LABEL: Record<"OPERATIONAL" | "INCIDENTAL" | "ROUTINE", string> = {
  OPERATIONAL: "Operasional",
  INCIDENTAL: "Insidental",
  ROUTINE: "Rutin",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function Receipt({ transaction }: { transaction: TransactionListItem }) {
  const isIncome = transaction.type === "INCOME";

  return (
    <div
      id="receipt-print-area"
      className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-lg border-2 border-dashed bg-white p-6 text-sm text-neutral-900"
    >
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-lg font-bold">{BUSINESS_INFO.name}</span>
        {BUSINESS_INFO.address && (
          <span className="text-xs text-neutral-500">{BUSINESS_INFO.address}</span>
        )}
        {BUSINESS_INFO.phone && (
          <span className="text-xs text-neutral-500">{BUSINESS_INFO.phone}</span>
        )}
      </div>

      <div className="border-t border-dashed" />

      <p className="text-center font-semibold">
        {isIncome ? "STRUK PENJUALAN" : "STRUK PENGELUARAN"}
      </p>

      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">No. Transaksi</span>
          <span className="text-right font-mono">{transaction.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Tanggal</span>
          <span className="text-right">{formatDateTime(transaction.transaction_date)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Kasir</span>
          <span className="text-right">{transaction.creator_name}</span>
        </div>
        {/* TAMBAHAN: Nama Pelanggan di Struk UI */}
        {transaction.customer_name && (
          <div className="flex justify-between gap-2 mt-1">
            <span className="text-neutral-500">Pelanggan</span>
            <span className="text-right font-bold">{transaction.customer_name}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed" />

      {isIncome ? (
        <div className="flex flex-col gap-2">
          {transaction.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.menu_name}</span>
              </div>
              <div className="flex justify-between pl-1 text-neutral-500">
                <span>
                  {item.quantity} x {formatRupiah(item.price_at_transaction)}
                </span>
                <span>{formatRupiah(item.subtotal)}</span>
              </div>
            </div>
          ))}
          {transaction.items.length === 0 && (
            <p className="text-xs text-neutral-500">Tidak ada item.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-neutral-500">Kategori</span>
            <span className="text-right">
              {transaction.expense_category_name}
              {transaction.expense_category_type
                ? ` (${TYPE_LABEL[transaction.expense_category_type]})`
                : ""}
            </span>
          </div>
          {transaction.notes && (
            <div className="flex flex-col gap-0.5">
              <span className="text-neutral-500">Catatan</span>
              <span>{transaction.notes}</span>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-dashed" />

      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-500">Metode Pembayaran</span>
          <span className="text-right">{transaction.payment_method_name}</span>
        </div>
        {transaction.customer_phone && (
          <div className="flex justify-between gap-2">
            <span className="text-neutral-500">No. WhatsApp</span>
            <span className="text-right">{transaction.customer_phone}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>{formatRupiah(transaction.total_amount)}</span>
      </div>

      <div className="border-t border-dashed" />

      <div className="flex flex-col items-center gap-1 text-center">
        <span
          className={`text-xs font-semibold ${
            transaction.status === "VOIDED" ? "text-destructive" : "text-emerald-600"
          }`}
        >
          Status: {transaction.status === "VOIDED" ? "Dibatalkan" : "Selesai"}
        </span>
        {transaction.status === "VOIDED" && transaction.void_reason && (
          <span className="text-xs text-destructive">Alasan: {transaction.void_reason}</span>
        )}
        <p className="pt-2 text-xs italic text-neutral-500">
          Terima kasih sudah berbelanja 🙏
        </p>
      </div>
    </div>
  );
}