"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addActiveOrderItemAction } from "@/actions/active-order-actions";
import { formatRupiah } from "@/lib/utils";
import type { Menu } from "@/types/database";

export function AddActiveOrderItemForm({
  activeOrderId,
  menus,
}: {
  activeOrderId: string;
  menus: Menu[];
}) {
  const [menuId, setMenuId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!menuId) {
      toast.error("Pilih menu terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const result = await addActiveOrderItemAction({
        active_order_id: activeOrderId,
        menu_id: menuId,
        quantity,
      });
      if (result.success) {
        toast.success(result.message);
        setMenuId("");
        setQuantity(1);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Select value={menuId} onValueChange={setMenuId} disabled={isPending}>
          <SelectTrigger className="h-11 text-base">
            <SelectValue placeholder="Pilih menu untuk ditambahkan" />
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
      <div className="flex gap-2 sm:w-auto">
        <Input
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          disabled={isPending}
          className="h-11 w-20 text-base"
        />
        <Button
          type="button"
          size="lg"
          className="h-11 flex-1 text-base sm:flex-none"
          onClick={handleAdd}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
          Tambah Item
        </Button>
      </div>
    </div>
  );
}
