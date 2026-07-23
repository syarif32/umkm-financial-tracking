"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setPaymentMethodActiveAction } from "@/actions/payment-method-actions";
import type { PaymentMethod } from "@/types/database";
import { PaymentMethodFormDialog } from "./payment-method-form-dialog";

export function PaymentMethodSection({ paymentMethods }: { paymentMethods: PaymentMethod[] }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      const result = await setPaymentMethodActiveAction(id, next);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Metode Pembayaran</h2>
          <p className="text-sm text-muted-foreground">
            Kelola sumber dana yang tersedia untuk transaksi.
          </p>
        </div>
        <PaymentMethodFormDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Belum ada metode pembayaran.
                </TableCell>
              </TableRow>
            )}
            {paymentMethods.map((pm) => (
              <TableRow key={pm.id}>
                <TableCell className="font-medium">{pm.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pm.is_active}
                      disabled={isPending}
                      onCheckedChange={(checked) => handleToggle(pm.id, checked)}
                      aria-label={pm.is_active ? "Nonaktifkan metode" : "Aktifkan metode"}
                    />
                    <Badge variant={pm.is_active ? "success" : "secondary"}>
                      {pm.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <PaymentMethodFormDialog paymentMethod={pm} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
