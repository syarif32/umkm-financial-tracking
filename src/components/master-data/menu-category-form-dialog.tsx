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
  createMenuCategoryAction,
  updateMenuCategoryAction,
} from "@/actions/menu-category-actions";
import { slugify } from "@/lib/utils";
import type { MenuCategory } from "@/types/database";

export function MenuCategoryFormDialog({ category }: { category?: MenuCategory }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(category);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEditedManually) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateMenuCategoryAction(formData)
        : await createMenuCategoryAction(formData);

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
          <Button variant="ghost" size="icon" title="Edit kategori menu">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Tambah Kategori
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Kategori Menu" : "Tambah Kategori Menu"}</DialogTitle>
            <DialogDescription>
              Contoh: Makanan, Minuman, Snack, Dessert, Other.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={category!.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Nama Kategori</Label>
            <Input
              id="category-name"
              name="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={60}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input
              id="category-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugEditedManually(true);
                setSlug(e.target.value);
              }}
              required
              maxLength={60}
              disabled={isPending}
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            />
            <p className="text-xs text-muted-foreground">
              Huruf kecil, angka, dan tanda hubung saja (mis. &quot;makanan-berat&quot;).
            </p>
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
