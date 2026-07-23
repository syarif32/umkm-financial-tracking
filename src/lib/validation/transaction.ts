import { z } from "zod";

export const saleItemSchema = z.object({
  menu_id: z.string().uuid("ID menu tidak valid."),
  quantity: z.coerce
    .number({ message: "Kuantitas harus berupa angka." })
    .int("Kuantitas harus bilangan bulat.")
    .min(1, "Kuantitas minimal 1.")
    .max(9999, "Kuantitas terlalu besar."),
});

export const createSaleTransactionSchema = z.object({
  payment_method_id: z.string().uuid("Metode pembayaran wajib dipilih."),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().default(""),
  items: z
    .array(saleItemSchema)
    .min(1, "Transaksi harus memiliki minimal 1 item menu.")
    .max(50, "Maksimal 50 item per transaksi."),
});

export const expenseCategoryTypeSchema = z.enum([
  "OPERATIONAL",
  "INCIDENTAL",
  "ROUTINE",
]);

export const createExpenseTransactionSchema = z.object({
  payment_method_id: z.string().uuid("Metode pembayaran wajib dipilih."),
  expense_category_id: z.string().uuid("Kategori pengeluaran wajib dipilih."),
  amount: z.coerce
    .number({ message: "Jumlah harus berupa angka." })
    .positive("Jumlah harus lebih dari 0.")
    .max(999_999_999, "Jumlah terlalu besar."),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().default(""),
  transaction_date: z.coerce.date({ message: "Tanggal tidak valid." }).optional(),
});

export const voidTransactionSchema = z.object({
  id: z.string().uuid("ID transaksi tidak valid."),
  reason: z
    .string()
    .trim()
    .min(3, "Alasan pembatalan wajib diisi (minimal 3 karakter).")
    .max(300, "Alasan maksimal 300 karakter."),
});
