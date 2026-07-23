"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
} from "@/actions/payment-method-actions";
import type { PaymentMethod } from "@/types/database";

export function PaymentMethodFormDialog({ paymentMethod }: { paymentMethod?: PaymentMethod }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(paymentMethod);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updatePaymentMethodAction(formData)
        : await createPaymentMethodAction(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Edit metode pembayaran">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Tambah Metode
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Metode Pembayaran" : "Tambah Metode Pembayaran"}
            </DialogTitle>
            <DialogDescription>
              Contoh: Cash, QRIS, Transfer Bank, E-Wallet.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={paymentMethod!.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Metode</Label>
            <Input
              id="name"
              name="name"
              defaultValue={paymentMethod?.name}
              required
              maxLength={60}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
