"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelActiveOrderAction } from "@/actions/active-order-actions";

export function CancelActiveOrderDialog({ activeOrderId }: { activeOrderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelActiveOrderAction({ id: activeOrderId });
      // On success the action redirects to /dashboard/active-orders itself
      // (mirrors signInAction's pattern), so a returned value here only
      // ever represents a failure.
      if (result && !result.success) {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg" className="h-12 text-base">
          <Ban className="h-4 w-4" />
          Batalkan Pesanan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan Pesanan?</DialogTitle>
          <DialogDescription>
            Pesanan ini tidak akan dihapus — statusnya berubah menjadi &quot;Dibatalkan&quot; dan
            tidak akan memengaruhi laporan keuangan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="h-12 text-base"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Ya, Batalkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
