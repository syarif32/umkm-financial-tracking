"use client";

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

export function SaleForm({
  menus,
  paymentMethods,
}: {
  menus: Menu[];
  paymentMethods: PaymentMethod[];
}) {
  const [rows, setRows] = useState<ItemRow[]>([newRow()]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const menuById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  // Client-side estimate only — for the cashier's convenience while typing.
  // The authoritative price and total are computed server-side from
  // menus.current_price at the moment the transaction is created.
  const estimatedTotal = rows.reduce((sum, row) => {
    const menu = menuById.get(row.menuId);
    if (!menu) return sum;
    return sum + menu.current_price * row.quantity;
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

  function resetForm() {
    setRows([newRow()]);
    setPaymentMethodId("");
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!paymentMethodId) {
      toast.error("Metode pembayaran wajib dipilih.");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Penjualan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {rows.map((row, index) => {
              const selectedMenu = menuById.get(row.menuId);
              return (
                <div
                  key={row.key}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
                >
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Menu {index + 1}
                    </Label>
                    <Select
                      value={row.menuId}
                      onValueChange={(value) => updateRow(row.key, { menuId: value })}
                      disabled={isPending}
                    >
                      <SelectTrigger>
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
                      disabled={isPending}
                      onChange={(e) =>
                        updateRow(row.key, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:w-32 sm:justify-end">
                    <span className="text-sm text-muted-foreground sm:hidden">
                      Subtotal
                    </span>
                    <span className="text-sm font-medium">
                      {selectedMenu
                        ? formatRupiah(selectedMenu.current_price * row.quantity)
                        : "—"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isPending || rows.length === 1}
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
              size="sm"
              className="self-start"
              onClick={addRow}
              disabled={isPending}
            >
              <Plus className="h-4 w-4" />
              Tambah Item
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Metode Pembayaran</Label>
              <Select
                value={paymentMethodId}
                onValueChange={setPaymentMethodId}
                disabled={isPending}
              >
                <SelectTrigger>
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

            <div className="flex flex-col justify-end gap-1">
              <span className="text-sm text-muted-foreground">Estimasi Total</span>
              <span className="text-lg font-semibold">{formatRupiah(estimatedTotal)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sale-notes">Catatan (opsional)</Label>
            <Textarea
              id="sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              maxLength={500}
            />
          </div>

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending && <Loader2 className="animate-spin" />}
            Simpan Transaksi
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
