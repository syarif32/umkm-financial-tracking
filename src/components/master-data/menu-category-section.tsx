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
import { setMenuCategoryActiveAction } from "@/actions/menu-category-actions";
import type { MenuCategory } from "@/types/database";
import { MenuCategoryFormDialog } from "./menu-category-form-dialog";

export function MenuCategorySection({ categories }: { categories: MenuCategory[] }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      const result = await setMenuCategoryActiveAction(id, next);
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
          <h2 className="text-base font-semibold">Kategori Menu</h2>
          <p className="text-sm text-muted-foreground">
            Kelompokkan menu menjadi Makanan, Minuman, Snack, Dessert, dsb.
          </p>
        </div>
        <MenuCategoryFormDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Belum ada kategori menu.
                </TableCell>
              </TableRow>
            )}
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.is_active}
                      disabled={isPending}
                      onCheckedChange={(checked) => handleToggle(category.id, checked)}
                      aria-label={category.is_active ? "Nonaktifkan kategori" : "Aktifkan kategori"}
                    />
                    <Badge variant={category.is_active ? "success" : "secondary"}>
                      {category.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <MenuCategoryFormDialog category={category} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
