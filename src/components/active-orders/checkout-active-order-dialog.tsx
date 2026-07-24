"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { checkoutActiveOrderAction } from "@/actions/active-order-actions";
import { formatRupiah } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";

export function CheckoutActiveOrderDialog({
  activeOrderId,
  totalAmount,
  paymentMethods,
}: {
  activeOrderId: string;
  totalAmount: number;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!paymentMethodId) {
      toast.error("Pilih metode pembayaran.");
      return;
    }

    startTransition(async () => {
      const result = await checkoutActiveOrderAction({
        active_order_id: activeOrderId,
        payment_method_id: paymentMethodId,
        customer_phone: customerPhone,
        notes: "",
      });

      if (result.success && result.transactionId) {
        toast.success(result.message);
        router.push(`/dashboard/transactions/${result.transactionId}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-12 flex-1 text-base">
          <Wallet className="h-4 w-4" />
          Bayar Sekarang
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar Pesanan</DialogTitle>
          <DialogDescription>
            Total tagihan: <span className="font-semibold">{formatRupiah(totalAmount)}</span>.
            Pesanan akan langsung tercatat sebagai transaksi selesai.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Metode Pembayaran</Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId} disabled={isPending}>
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
            <Label htmlFor="checkout-phone">No. WhatsApp Pelanggan (opsional)</Label>
            <Input
              id="checkout-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={isPending}
              maxLength={20}
              className="h-11 text-base"
              placeholder="Contoh: 0812xxxxxxx"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" size="lg" className="h-12 text-base" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Konfirmasi Bayar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
