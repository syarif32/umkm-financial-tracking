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
import { formatRupiah, cn } from "@/lib/utils";
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
    <div className="flex flex-col gap-5">
      {/* Header & Tombol Tambah */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Daftar Menu</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola daftar menu beserta harga, kategori, dan gambarnya.
          </p>
        </div>
        <div className="w-full sm:w-auto flex shrink-0">
          <div className="w-full sm:w-auto [&>button]:w-full [&>button]:rounded-xl">
            <MenuFormDialog categories={categories} />
          </div>
        </div>
      </div>

      {/* Filter Kategori */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">Filter kategori:</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-white rounded-xl">
            <SelectValue placeholder="Semua Kategori" />
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

      <div className="w-full">
        {/* --- TAMPILAN MOBILE: KARTU --- */}
        <div className="flex flex-col gap-3 md:hidden">
          {filteredMenus.length === 0 && (
            <div className="text-center py-10 bg-white border border-dashed rounded-2xl">
              <p className="text-muted-foreground font-medium text-sm">Belum ada menu.</p>
            </div>
          )}
          {filteredMenus.map((menu) => (
            <div key={menu.id} className="flex flex-col bg-white p-4 rounded-2xl border shadow-sm gap-3">
              <div className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-gray-50">
                  {menu.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={menu.image_url} alt={menu.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-6 w-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-gray-800 leading-tight">{menu.name}</h3>
                  <Badge variant="outline" className="w-fit mt-1 text-[10px] bg-gray-50 text-gray-600">
                    {categoryNameById.get(menu.category_id) ?? "Tidak diketahui"}
                  </Badge>
                  <span className="text-sm font-bold text-blue-600 mt-1">
                    {formatRupiah(menu.current_price)}
                  </span>
                </div>
              </div>

              {menu.description && (
                <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-2 rounded-lg">
                  {menu.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={menu.is_active}
                    disabled={isPending}
                    onCheckedChange={(checked) => handleToggle(menu.id, checked)}
                    aria-label={menu.is_active ? "Nonaktifkan menu" : "Aktifkan menu"}
                  />
                  <Badge variant={menu.is_active ? "success" : "secondary"} className="text-[10px] px-1.5 py-0">
                    {menu.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <MenuFormDialog menu={menu} categories={categories} />
              </div>
            </div>
          ))}
        </div>

        {/* --- TAMPILAN DESKTOP: TABEL --- */}
        <div className="hidden md:block rounded-xl border bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-20">Gambar</TableHead>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada menu.
                  </TableCell>
                </TableRow>
              )}
              {filteredMenus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell>
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {menu.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={menu.image_url} alt={menu.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-800">{menu.name}</span>
                      {menu.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {menu.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white">
                      {categoryNameById.get(menu.category_id) ?? "Tidak diketahui"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-gray-700">{formatRupiah(menu.current_price)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={menu.is_active}
                        disabled={isPending}
                        onCheckedChange={(checked) => handleToggle(menu.id, checked)}
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
    </div>
  );
}