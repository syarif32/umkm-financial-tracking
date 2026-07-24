"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseCategory, PaymentMethod } from "@/types/database";

const ALL_VALUE = "all";

export interface TransactionFiltersValue {
  search: string;
  from: string;
  to: string;
  type: string;
  status: string;
  paymentMethodId: string;
  expenseCategoryId: string;
  sort: string;
}

export function TransactionFilters({
  value,
  paymentMethods,
  expenseCategories,
}: {
  value: TransactionFiltersValue;
  paymentMethods: PaymentMethod[];
  expenseCategories: ExpenseCategory[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(value);
  const [isPending, startTransition] = useTransition();

  function update(patch: Partial<TransactionFiltersValue>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (form.search.trim()) params.set("search", form.search.trim());
    if (form.from) params.set("from", form.from);
    if (form.to) params.set("to", form.to);
    if (form.type !== ALL_VALUE) params.set("type", form.type);
    if (form.status !== ALL_VALUE) params.set("status", form.status);
    if (form.paymentMethodId !== ALL_VALUE) params.set("paymentMethodId", form.paymentMethodId);
    if (form.expenseCategoryId !== ALL_VALUE) params.set("expenseCategoryId", form.expenseCategoryId);
    if (form.sort !== "desc") params.set("sort", form.sort);

    startTransition(() => {
      router.push(`/dashboard/transactions?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push("/dashboard/transactions");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="search" className="text-xs text-muted-foreground">
            Cari ID Transaksi / No. WhatsApp
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              value={form.search}
              onChange={(e) => update({ search: e.target.value })}
              placeholder="mis. A1B2C3D4 atau 0812..."
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
          <Input
            type="date"
            value={form.from}
            max={form.to || undefined}
            onChange={(e) => update({ from: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
          <Input
            type="date"
            value={form.to}
            min={form.from || undefined}
            onChange={(e) => update({ to: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Tipe</Label>
          <Select value={form.type} onValueChange={(v) => update({ type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua Tipe</SelectItem>
              <SelectItem value="INCOME">Penjualan</SelectItem>
              <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={form.status} onValueChange={(v) => update({ status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua Status</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="VOIDED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Metode Pembayaran</Label>
          <Select
            value={form.paymentMethodId}
            onValueChange={(v) => update({ paymentMethodId: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua Metode</SelectItem>
              {paymentMethods.map((pm) => (
                <SelectItem key={pm.id} value={pm.id}>
                  {pm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Kategori Pengeluaran</Label>
          <Select
            value={form.expenseCategoryId}
            onValueChange={(v) => update({ expenseCategoryId: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua Kategori</SelectItem>
              {expenseCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Urutkan</Label>
          <Select value={form.sort} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Terbaru</SelectItem>
              <SelectItem value="asc">Terlama</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Terapkan Filter
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleReset} disabled={isPending}>
          Reset
        </Button>
      </div>
    </form>
  );
}
