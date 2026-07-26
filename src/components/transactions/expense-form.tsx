"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { createExpenseTransactionAction } from "@/actions/transaction-actions";
import type { ExpenseCategory, ExpenseCategoryType, PaymentMethod } from "@/types/database";

const TYPE_LABEL: Record<ExpenseCategoryType, string> = {
  OPERATIONAL: "Operasional",
  INCIDENTAL: "Insidental",
  ROUTINE: "Rutin",
};

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ExpenseForm({
  categories,
  paymentMethods,
}: {
  categories: ExpenseCategory[];
  paymentMethods: PaymentMethod[];
}) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => toDatetimeLocalValue(new Date()));
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setAmount("");
    setCategoryId("");
    setPaymentMethodId("");
    setNotes("");
    setTransactionDate(toDatetimeLocalValue(new Date()));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId) {
      toast.error("Kategori pengeluaran wajib dipilih.");
      return;
    }
    if (!paymentMethodId) {
      toast.error("Metode pembayaran wajib dipilih.");
      return;
    }

    startTransition(async () => {
      const result = await createExpenseTransactionAction({
        payment_method_id: paymentMethodId,
        expense_category_id: categoryId,
        amount: Number(amount),
        notes,
        transaction_date: transactionDate,
         customer_name: "",
          customer_phone: "",
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
        <CardTitle>Catat Pengeluaran</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Jumlah (Rp)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="transaction_date">Tanggal &amp; Waktu</Label>
              <Input
                id="transaction_date"
                type="datetime-local"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Kategori Pengeluaran</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({TYPE_LABEL[category.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expense-notes">Catatan (opsional)</Label>
            <Textarea
              id="expense-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              maxLength={500}
            />
          </div>

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending && <Loader2 className="animate-spin" />}
            Simpan Pengeluaran
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
