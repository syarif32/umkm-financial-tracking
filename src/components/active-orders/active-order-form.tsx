"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createActiveOrderAction } from "@/actions/active-order-actions";
import { createSaleTransactionAction } from "@/actions/transaction-actions";
import { formatRupiah } from "@/lib/utils";
import type { Menu, PaymentMethod } from "@/types/database";

interface ItemRow {
  key: string;
  menuId: string;
  quantity: number;
}

function newRow(): ItemRow {
  return { key: crypto.randomUUID(), menuId: "", quantity: 1 };
}

export function ActiveOrderForm({
  menus,
  paymentMethods,
}: {
  menus: Menu[];
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ItemRow[]>([newRow()]);
  const [notes, setNotes] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [isPaying, startPaying] = useTransition();

  const menuById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  const estimatedTotal = rows.reduce((sum, row) => {
    const menu = menuById.get(row.menuId);
    return menu ? sum + menu.current_price * row.quantity : sum;
  }, 0);

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }
  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function collectItems() {
    return rows
      .filter((r) => r.menuId && r.quantity > 0)
      .map((r) => ({ menu_id: r.menuId, quantity: r.quantity }));
  }

  function handleSavePesanan() {
    const items = collectItems();
    startSaving(async () => {
      const result = await createActiveOrderAction({ notes, items });
      if (result.success && result.activeOrderId) {
        toast.success(result.message);
        router.push(`/dashboard/active-orders/${result.activeOrderId}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleBayarSekarang() {
    const items = collectItems();
    if (items.length === 0) {
      toast.error("Pilih minimal 1 menu.");
      return;
    }
    if (!paymentMethodId) {
      toast.error("Pilih metode pembayaran untuk membayar sekarang.");
      return;
    }

    startPaying(async () => {
      const result = await createSaleTransactionAction({
        payment_method_id: paymentMethodId,
        notes,
        customer_phone: customerPhone,
        items,
      });
      if (result.success) {
        toast.success(result.message);
        setRows([newRow()]);
        setNotes("");
        setCustomerPhone("");
      } else {
        toast.error(result.message);
      }
    });
  }

  const isBusy = isSaving || isPaying;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesanan Baru</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const selectedMenu = menuById.get(row.menuId);
            return (
              <div
                key={row.key}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
              >
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Menu {index + 1}</Label>
                  <Select
                    value={row.menuId}
                    onValueChange={(value) => updateRow(row.key, { menuId: value })}
                    disabled={isBusy}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Pilih menu" />
                    </SelectTrigger>
                    <SelectContent>
                      {menus.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          {menu.name} — {formatRupiah(menu.current_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5 sm:w-28">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={row.quantity}
                    disabled={isBusy}
                    className="h-11 text-base"
                    onChange={(e) =>
                      updateRow(row.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-2 sm:w-32 sm:justify-end">
                  <span className="text-sm font-medium sm:hidden">Subtotal</span>
                  <span className="text-sm font-medium">
                    {selectedMenu ? formatRupiah(selectedMenu.current_price * row.quantity) : "—"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isBusy || rows.length === 1}
                    onClick={() => removeRow(row.key)}
                    title="Hapus item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="self-start text-base"
            onClick={addRow}
            disabled={isBusy}
          >
            <Plus className="h-4 w-4" />
            Tambah Item
          </Button>
        </div>

        <div className="flex flex-col justify-end gap-1 border-t pt-3">
          <span className="text-sm text-muted-foreground">Estimasi Total</span>
          <span className="text-xl font-semibold">{formatRupiah(estimatedTotal)}</span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="order-notes">Catatan (opsional)</Label>
          <Textarea
            id="order-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isBusy}
            maxLength={500}
            placeholder="Contoh: Meja 4, pedas sedang"
          />
        </div>

        <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Metode Pembayaran (untuk Bayar Sekarang)</Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId} disabled={isBusy}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Pilih metode pembayaran" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="order-phone">No. WhatsApp Pelanggan (opsional)</Label>
            <Input
              id="order-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={isBusy}
              maxLength={20}
              className="h-11 text-base"
              placeholder="Contoh: 0812xxxxxxx"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12 flex-1 text-base"
            onClick={handleSavePesanan}
            disabled={isBusy}
          >
            {isSaving && <Loader2 className="animate-spin" />}
            Simpan Pesanan
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1 text-base"
            onClick={handleBayarSekarang}
            disabled={isBusy}
          >
            {isPaying && <Loader2 className="animate-spin" />}
            Bayar Sekarang
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
