"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
} from "@/actions/expense-category-actions";
import type { ExpenseCategory, ExpenseCategoryType } from "@/types/database";

const TYPE_LABEL: Record<ExpenseCategoryType, string> = {
  OPERATIONAL: "Operasional",
  INCIDENTAL: "Insidental",
  ROUTINE: "Rutin",
};

export function ExpenseCategoryFormDialog({ category }: { category?: ExpenseCategory }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ExpenseCategoryType>(category?.type ?? "OPERATIONAL");
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(category);

  function handleSubmit(formData: FormData) {
    formData.set("type", type);

    startTransition(async () => {
      const result = isEdit
        ? await updateExpenseCategoryAction(formData)
        : await createExpenseCategoryAction(formData);

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
          <Button variant="ghost" size="icon" title="Edit kategori">
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
            <DialogTitle>
              {isEdit ? "Edit Kategori Pengeluaran" : "Tambah Kategori Pengeluaran"}
            </DialogTitle>
            <DialogDescription>
              Operasional: bahan baku, listrik, air. Insidental: perbaikan mendadak.
              Rutin: tabungan harian, penarikan modal.
            </DialogDescription>
          </DialogHeader>

          {isEdit && <input type="hidden" name="id" value={category!.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama Kategori</Label>
            <Input
              id="name"
              name="name"
              defaultValue={category?.name}
              required
              maxLength={60}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipe</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as ExpenseCategoryType)}
              disabled={isPending}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as ExpenseCategoryType[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
