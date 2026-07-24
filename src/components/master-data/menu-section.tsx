"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setMenuActiveAction } from "@/actions/menu-actions";
import { formatRupiah } from "@/lib/utils";
import type { Menu, MenuCategory } from "@/types/database";
import { MenuFormDialog } from "./menu-form-dialog";

const ALL_CATEGORIES_VALUE = "all";

export function MenuSection({
  menus,
  categories,
}: {
  menus: Menu[];
  categories: MenuCategory[];
}) {
  const [isPending, startTransition] = useTransition();
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const filteredMenus = useMemo(
    () =>
      categoryFilter === ALL_CATEGORIES_VALUE
        ? menus
        : menus.filter((m) => m.category_id === categoryFilter),
    [menus, categoryFilter]
  );

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      const result = await setMenuActiveAction(id, next);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Menu</h2>
          <p className="text-sm text-muted-foreground">
            Kelola daftar menu beserta harga, kategori, dan gambarnya.
          </p>
        </div>
        <MenuFormDialog categories={categories} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter kategori:</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>Semua Kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Gambar</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenus.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada menu.
                </TableCell>
              </TableRow>
            )}
            {filteredMenus.map((menu) => (
              <TableRow key={menu.id}>
                <TableCell>
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {menu.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, host varies per project
                      <img
                        src={menu.image_url}
                        alt={menu.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{menu.name}</span>
                    {menu.description && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {menu.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {categoryNameById.get(menu.category_id) ?? "Tidak diketahui"}
                  </Badge>
                </TableCell>
                <TableCell>{formatRupiah(menu.current_price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={menu.is_active}
                      disabled={isPending}
                      onCheckedChange={(checked) => handleToggle(menu.id, checked)}
                      aria-label={menu.is_active ? "Nonaktifkan menu" : "Aktifkan menu"}
                    />
                    <Badge variant={menu.is_active ? "success" : "secondary"}>
                      {menu.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <MenuFormDialog menu={menu} categories={categories} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
