"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ImageOff, 
  Loader2, 
  Minus, 
  Plus, 
  ShoppingBag, 
  User, 
  Phone,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSaleTransactionAction } from "@/actions/transaction-actions";
import { createActiveOrderAction } from "@/actions/active-order-actions";
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
  const [step, setStep] = useState<"menu" | "checkout">("menu");
  
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  const menuById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  const estimatedTotal = rows.reduce((sum, row) => {
    const menu = menuById.get(row.menuId);
    if (!menu) return sum;
    return sum + menu.current_price * row.quantity;
  }, 0);

  const totalItems = rows.reduce((sum, row) => sum + row.quantity, 0);

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
    setCustomerName("");
    setCustomerPhone("");
    setStep("menu");
  }

  function handleProcess(type: "SALE" | "ACTIVE_ORDER") {
    if (type === "SALE" && !paymentMethodId) {
      toast.error("Metode pembayaran wajib dipilih untuk transaksi lunas.");
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
      if (type === "SALE") {
        const result = await createSaleTransactionAction({
          payment_method_id: paymentMethodId,
          notes,
          // @ts-ignore
          customer_name: customerName,  
          customer_phone: customerPhone,
          items,
        });

        if (result.success) {
          toast.success("Transaksi berhasil disimpan sebagai LUNAS.");
          resetForm();
        } else {
          toast.error(result.message);
        }
      } else {
        const result = await createActiveOrderAction({
          notes,
          customer_name: customerName,
          customer_phone: customerPhone,  
          items,
        });

        if (result.success) {
          toast.success("Pesanan disimpan ke tagihan BELUM LUNAS.");
          resetForm();
        } else {
          toast.error(result.message);
        }
      }
    });
  }

  // ==========================================
  // TAMPILAN 1: MODE PILIH MENU (VISUAL GRID)
  // ==========================================
  if (step === "menu") {
    return (
      <div className="flex flex-col h-[70vh] min-h-[500px] bg-gray-50/50 rounded-2xl border shadow-sm overflow-hidden relative">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-bold text-gray-800">Kasir</h2>
          <p className="text-xs text-muted-foreground mt-1">Ketuk menu untuk menambahkan ke keranjang.</p>
        </div>

       <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto pb-24">
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
          "flex flex-col bg-white rounded-xl border-2 transition-all cursor-pointer overflow-hidden select-none min-h-[200px]",
          isSelected
            ? "border-blue-500 shadow-md ring-2 ring-blue-500/20"
            : "border-gray-100 hover:border-blue-200"
        )}
      >
        {/* GAMBAR MENU */}
        <div className="w-full h-24 sm:h-28 bg-gray-50 flex items-center justify-center shrink-0 p-2">
          {menu.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menu.image_url}
              alt={menu.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageOff className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {/* INFORMASI MENU */}
        <div className="p-2.5 flex flex-col flex-1 min-h-[70px]">
          <p className="font-bold text-[14px] leading-tight text-gray-800 line-clamp-2">
            {menu.name}
          </p>

          <p className="text-sm font-extrabold text-blue-600 mt-auto pt-1">
            {formatRupiah(menu.current_price)}
          </p>
        </div>

        {/* QUANTITY CONTROL */}
        {isSelected && (
          <div className="border-t bg-white p-1.5 flex items-center justify-between shrink-0 min-h-[54px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDecreaseMenu(menu.id);
              }}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-800 active:bg-gray-300 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>

            <span className="font-extrabold text-base">
              {qty}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddMenu(menu.id);
              }}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-lg text-white active:bg-blue-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  })}
</div>

        {totalItems > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex items-center justify-between z-10">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium">{totalItems} Item</span>
              <span className="text-xl font-bold text-gray-900 leading-none mt-0.5">{formatRupiah(estimatedTotal)}</span>
            </div>
            {/* Tombol proses tagihan dibuat h-14 agar sangat lega ditekan */}
            <Button 
              size="lg" 
              className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-md font-semibold h-14"
              onClick={() => setStep("checkout")}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Proses Tagihan
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 2: MODE PEMBAYARAN & INFO CUSTOMER
  // ==========================================
  return (
    <div className="flex flex-col bg-white rounded-2xl border shadow-sm">
      <div className="p-4 border-b flex items-center gap-3 bg-gray-50/50 rounded-t-2xl">
        <Button variant="ghost" size="icon" onClick={() => setStep("menu")} className="rounded-full shrink-0 w-12 h-12">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Ringkasan Pesanan</h2>
          <p className="text-xs text-muted-foreground">Lengkapi data untuk menyimpan atau melunasi.</p>
        </div>
      </div>

      <div className="flex flex-col p-4 gap-6">
        {/* Ringkasan Belanja */}
        <div className="bg-gray-50 rounded-xl p-4 border">
          <div className="flex flex-col gap-3 mb-3 max-h-40 overflow-y-auto pr-2 no-scrollbar">
            {rows.map((row) => {
              const menu = menuById.get(row.menuId);
              if (!menu) return null;
              return (
                <div key={row.key} className="flex justify-between text-base items-start">
                  <span className="text-gray-700 font-medium">{row.quantity}x {menu.name}</span>
                  <span className="font-bold text-gray-900">{formatRupiah(menu.current_price * row.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="font-semibold text-gray-600">Total Tagihan</span>
            <span className="text-xl font-bold text-blue-600">{formatRupiah(estimatedTotal)}</span>
          </div>
        </div>

        {/* Data Pelanggan */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-name" className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Nama Pelanggan
            </Label>
            {/* PERBAIKAN 5: Input menggunakan text-base dan h-14 */}
            <Input
              id="customer-name"
              type="text"
              placeholder="Contoh: Budi"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isPending}
              className="h-14 text-base px-4 rounded-xl"
              maxLength={50}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-phone" className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-500" />
              Nomor WA (Opsional)
            </Label>
            {/* PERBAIKAN 5: Input menggunakan text-base dan h-14 */}
            <Input
              id="customer-phone"
              type="tel"
              placeholder="Contoh: 0812xxxxxxx"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={isPending}
              className="h-14 text-base px-4 rounded-xl"
              maxLength={20}
            />
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-semibold text-gray-800">
            Metode Pembayaran
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                onClick={() => setPaymentMethodId(pm.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none min-h-[60px]",
                  paymentMethodId === pm.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 hover:border-emerald-200 text-gray-700"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  paymentMethodId === pm.id ? "border-emerald-500" : "border-gray-300"
                )}>
                  {paymentMethodId === pm.id && <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500 text-white" />}
                </div>
                <span className="font-bold text-[15px]">{pm.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sale-notes" className="text-sm font-semibold text-gray-800">Catatan Tambahan (Opsional)</Label>
          <Textarea
            id="sale-notes"
            placeholder="Contoh: Pedas, dibungkus..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            maxLength={500}
            className="rounded-xl text-base p-4 resize-none min-h-[100px]"
          />
        </div>

        {/* DUA TOMBOL AKSI */}
        <div className="flex flex-col gap-3 mt-2">
          <Button 
            type="button" 
            disabled={isPending || !paymentMethodId} 
            size="lg"
            className="w-full rounded-xl text-base h-14 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md"
            onClick={() => handleProcess("SALE")}
          >
            {isPending ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : <CheckCircle2 className="mr-2 w-5 h-5" />}
            Bayar Sekarang (Lunas)
          </Button>
          
          <Button 
            type="button" 
            disabled={isPending} 
            size="lg"
            variant="outline"
            className="w-full rounded-xl text-base h-14 border-amber-500 text-amber-700 hover:bg-amber-50 font-bold"
            onClick={() => handleProcess("ACTIVE_ORDER")}
          >
            {isPending ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : <ClipboardList className="mr-2 w-5 h-5" />}
            Simpan ke Belum Lunas
          </Button>
        </div>
      </div>
    </div>
  );
}