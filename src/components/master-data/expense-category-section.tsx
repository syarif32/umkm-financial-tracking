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
import { setExpenseCategoryActiveAction } from "@/actions/expense-category-actions";
import type { ExpenseCategory, ExpenseCategoryType } from "@/types/database";
import { ExpenseCategoryFormDialog } from "./expense-category-form-dialog";

const TYPE_LABEL: Record<ExpenseCategoryType, string> = {
  OPERATIONAL: "Operasional",
  INCIDENTAL: "Insidental",
  ROUTINE: "Rutin",
};

export function ExpenseCategorySection({ categories }: { categories: ExpenseCategory[] }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      const result = await setExpenseCategoryActiveAction(id, next);
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
          <h2 className="text-base font-semibold">Kategori Pengeluaran</h2>
          <p className="text-sm text-muted-foreground">
            Kelompokkan pengeluaran menjadi Operasional, Insidental, atau Rutin.
          </p>
        </div>
        <ExpenseCategoryFormDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Belum ada kategori pengeluaran.
                </TableCell>
              </TableRow>
            )}
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{TYPE_LABEL[category.type]}</Badge>
                </TableCell>
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
                  <ExpenseCategoryFormDialog category={category} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
