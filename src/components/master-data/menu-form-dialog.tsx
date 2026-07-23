"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createMenuAction, updateMenuAction } from "@/actions/menu-actions";
import { MenuImageUpload } from "./menu-image-upload";
import type { Menu, MenuCategory } from "@/types/database";

export function MenuFormDialog({
  menu,
  categories,
}: {
  menu?: Menu;
  categories: MenuCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(menu?.category_id ?? "");
  const [imageUrl, setImageUrl] = useState(menu?.image_url ?? "");
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(menu);

  function handleSubmit(formData: FormData) {
    if (!categoryId) {
      toast.error("Kategori menu wajib dipilih.");
      return;
    }

    formData.set("category_id", categoryId);
    formData.set("image_url", imageUrl);

    startTransition(async () => {
      const result = isEdit
        ? await updateMenuAction(formData)
        : await createMenuAction(formData);

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
          <Button variant="ghost" size="icon" title="Edit menu">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Tambah Menu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Perubahan harga tidak memengaruhi transaksi yang sudah tercatat."
                : "Menu baru akan langsung aktif dan dapat digunakan pada transaksi."}
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={menu!.id} />}

          <div className="flex flex-col gap-2">
            <Label>Gambar Menu</Label>
            <MenuImageUpload value={imageUrl} onChange={setImageUrl} disabled={isPending} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Menu</Label>
            <Input
              id="name"
              name="name"
              defaultValue={menu?.name}
              required
              maxLength={120}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current_price">Harga (Rp)</Label>
              <Input
                id="current_price"
                name="current_price"
                type="number"
                min={0}
                step="1"
                defaultValue={menu?.current_price}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={menu?.description ?? ""}
              maxLength={1000}
              disabled={isPending}
              placeholder="Contoh: pedas level 2, disajikan dengan nasi hangat."
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
