"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  removeActiveOrderItemAction,
  updateActiveOrderItemQuantityAction,
} from "@/actions/active-order-actions";
import { formatRupiah } from "@/lib/utils";
import type { ActiveOrderItem } from "@/types/database";

export function ActiveOrderItemList({
  activeOrderId,
  items,
  editable,
}: {
  activeOrderId: string;
  items: ActiveOrderItem[];
  editable: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleQuantityChange(item: ActiveOrderItem, nextQuantity: number) {
    if (nextQuantity < 1) return;
    startTransition(async () => {
      const result = await updateActiveOrderItemQuantityAction({
        id: item.id,
        active_order_id: activeOrderId,
        quantity: nextQuantity,
      });
      if (!result.success) toast.error(result.message);
    });
  }

  function handleRemove(item: ActiveOrderItem) {
    startTransition(async () => {
      const result = await removeActiveOrderItemAction({
        id: item.id,
        active_order_id: activeOrderId,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Belum ada item. Tambahkan menu di bawah.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col">
            <span className="font-medium">{item.menu_name_snapshot}</span>
            <span className="text-sm text-muted-foreground">
              {formatRupiah(item.price_snapshot)} / item
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {editable ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  disabled={isPending || item.quantity <= 1}
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  title="Kurangi"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-base font-medium">{item.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  disabled={isPending}
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                  title="Tambah"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="text-base">{item.quantity}x</span>
            )}

            <span className="w-28 text-right font-semibold">{formatRupiah(item.subtotal)}</span>

            {editable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => handleRemove(item)}
                title="Hapus item"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
