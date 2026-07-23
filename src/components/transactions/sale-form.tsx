"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingBag, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSaleTransactionAction } from "@/actions/transaction-actions";
import { formatRupiah, cn } from "@/lib/utils";
import type { Menu, PaymentMethod } from "@/types/database";

interface ItemRow {
  key: string;
  menuId: string;
  quantity: number;
}

export function SaleForm({
  menus,
  paymentMethods,
}: {
  menus: Menu[];
  paymentMethods: PaymentMethod[];
}) {
  // State tetap menggunakan format orisinal Anda untuk menjaga kompatibilitas logika
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Tambahan state UI untuk memisahkan pemilihan menu dan proses bayar
  const [step, setStep] = useState<"menu" | "checkout">("menu");

  const menuById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  // Kalkulasi total
  const estimatedTotal = rows.reduce((sum, row) => {
    const menu = menuById.get(row.menuId);
    if (!menu) return sum;
    return sum + menu.current_price * row.quantity;
  }, 0);

  const totalItems = rows.reduce((sum, row) => sum + row.quantity, 0);

  // Logic memanipulasi baris saat menu ditekan
  function handleAddMenu(menuId: string) {
    const existingRow = rows.find((r) => r.menuId === menuId);
    if (existingRow) {
      setRows((prev) =>
        prev.map((r) =>
          r.key === existingRow.key ? { ...r, quantity: r.quantity + 1 } : r
        )
      );
    } else {
      setRows((prev) => [
        ...prev,
        { key: crypto.randomUUID(), menuId, quantity: 1 },
      ]);
    }
  }

  function handleDecreaseMenu(menuId: string) {
    const existingRow = rows.find((r) => r.menuId === menuId);
    if (!existingRow) return;

    if (existingRow.quantity > 1) {
      setRows((prev) =>
        prev.map((r) =>
          r.key === existingRow.key ? { ...r, quantity: r.quantity - 1 } : r
        )
      );
    } else {
      setRows((prev) => prev.filter((r) => r.key !== existingRow.key));
    }
  }

  function getMenuQuantity(menuId: string) {
    return rows.find((r) => r.menuId === menuId)?.quantity || 0;
  }

  function resetForm() {
    setRows([]);
    setPaymentMethodId("");
    setNotes("");
    setStep("menu");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!paymentMethodId) {
      toast.error("Pilih metode pembayaran terlebih dahulu.");
      return;
    }

    const items = rows
      .filter((r) => r.menuId && r.quantity > 0)
      .map((r) => ({ menu_id: r.menuId, quantity: r.quantity }));

    if (items.length === 0) {
      toast.error("Pilih minimal 1 menu.");
      return;
    }

    startTransition(async () => {
      const result = await createSaleTransactionAction({
        payment_method_id: paymentMethodId,
        notes,
        items,
      });

      if (result.success) {
        toast.success(result.message);
        resetForm();
      } else {
        toast.error(result.message);
      }
    });
  }

  // --- TAMPILAN 1: PILIH MENU ---
  if (step === "menu") {
    return (
      <div className="flex flex-col relative bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Kasir Penjualan</h2>
          <p className="text-xs text-muted-foreground">Ketuk menu untuk menambahkan ke pesanan.</p>
        </div>

        {/* Grid Menu */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {menus.map((menu) => {
            const qty = getMenuQuantity(menu.id);
            const isSelected = qty > 0;

            return (
              <div
                key={menu.id}
                onClick={() => {
                  if (!isSelected) handleAddMenu(menu.id);
                }}
                className={cn(
                  "relative flex flex-col justify-between p-3 rounded-xl border-2 transition-all cursor-pointer select-none h-28",
                  isSelected
                    ? "border-blue-500 bg-blue-50/30"
                    : "border-gray-100 bg-white hover:border-gray-200"
                )}
              >
                <div>
                  <p className="font-semibold text-sm leading-tight line-clamp-2 text-gray-800">
                    {menu.name}
                  </p>
                  <p className="text-xs font-medium text-blue-600 mt-1">
                    {formatRupiah(menu.current_price)}
                  </p>
                </div>

                {/* Kontrol Jumlah (Tampil hanya jika menu dipilih) */}
                {isSelected && (
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-white border shadow-sm rounded-lg p-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecreaseMenu(menu.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded text-gray-600 active:bg-gray-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-sm">{qty}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddMenu(menu.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded text-white active:bg-blue-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sticky Footer Cart */}
        {totalItems > 0 && (
          <div className="sticky bottom-0 border-t bg-white p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex items-center justify-between z-10">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium">{totalItems} Item Terpilih</span>
              <span className="text-lg font-bold text-gray-900">{formatRupiah(estimatedTotal)}</span>
            </div>
            <Button 
              size="lg" 
              className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 shadow-md"
              onClick={() => setStep("checkout")}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Lanjut Pembayaran
            </Button>
          </div>
        )}
      </div>
    );
  }

  // --- TAMPILAN 2: CHECKOUT & PEMBAYARAN ---
  return (
    <div className="flex flex-col bg-white rounded-2xl border shadow-sm">
      <div className="p-4 border-b flex items-center gap-3 bg-gray-50/50 rounded-t-2xl">
        <Button variant="ghost" size="icon" onClick={() => setStep("menu")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Selesaikan Pembayaran</h2>
          <p className="text-xs text-muted-foreground">Pilih metode pembayaran</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col p-4 gap-6">
        {/* Ringkasan Pesanan (Read Only) */}
        <div className="bg-gray-50 rounded-xl p-4 border">
          <p className="text-sm font-semibold mb-3 text-gray-700">Ringkasan Pesanan</p>
          <div className="flex flex-col gap-2 mb-3 max-h-40 overflow-y-auto pr-2">
            {rows.map((row) => {
              const menu = menuById.get(row.menuId);
              if (!menu) return null;
              return (
                <div key={row.key} className="flex justify-between text-sm items-start">
                  <span className="text-gray-600">{row.quantity}x {menu.name}</span>
                  <span className="font-medium">{formatRupiah(menu.current_price * row.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3 flex justify-between items-center mt-1">
            <span className="font-semibold text-gray-800">Total Tagihan</span>
            <span className="text-xl font-bold text-blue-600">{formatRupiah(estimatedTotal)}</span>
          </div>
        </div>

        {/* Pilihan Metode Pembayaran (Visual Grid, bukan dropdown) */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-semibold text-gray-800">Metode Pembayaran</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                onClick={() => setPaymentMethodId(pm.id)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  paymentMethodId === pm.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-blue-300 text-gray-700"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  paymentMethodId === pm.id ? "border-blue-500" : "border-gray-300"
                )}>
                  {paymentMethodId === pm.id && <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />}
                </div>
                <span className="font-medium text-sm">{pm.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Catatan Tambahan */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sale-notes" className="text-sm font-semibold text-gray-800">Catatan (Opsional)</Label>
          <Textarea
            id="sale-notes"
            placeholder="Contoh: Pedas, dibungkus, dll."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            maxLength={500}
            className="rounded-xl resize-none h-20"
          />
        </div>

        {/* Tombol Simpan Final */}
        <Button 
          type="submit" 
          disabled={isPending || !paymentMethodId} 
          size="lg"
          className="w-full rounded-xl text-md h-14 bg-green-600 hover:bg-green-700 font-bold mt-2 shadow-lg"
        >
          {isPending ? (
            <Loader2 className="animate-spin mr-2 w-5 h-5" />
          ) : (
            <CheckCircle2 className="mr-2 w-5 h-5" />
          )}
          {isPending ? "Menyimpan..." : "Simpan Transaksi"}
        </Button>
      </form>
    </div>
  );
}