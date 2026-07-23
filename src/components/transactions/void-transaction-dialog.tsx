"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { voidTransactionAction } from "@/actions/transaction-actions";

export function VoidTransactionDialog({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await voidTransactionAction({ id: transactionId, reason });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setReason("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Batalkan transaksi">
          <Ban className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi</DialogTitle>
            <DialogDescription>
              Transaksi tidak akan dihapus — statusnya akan berubah menjadi
              &quot;Dibatalkan&quot; dan tidak lagi dihitung dalam laporan keuangan aktif.
              Tindakan ini memerlukan alasan dan akan tercatat.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="void-reason">Alasan Pembatalan</Label>
            <Textarea
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={300}
              disabled={isPending}
              placeholder="Contoh: salah input jumlah, transaksi duplikat, dll."
            />
          </div>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Batalkan Transaksi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
