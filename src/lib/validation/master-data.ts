import { z } from "zod";

export const menuSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama menu wajib diisi.")
    .max(120, "Nama menu maksimal 120 karakter."),
  current_price: z.coerce
    .number({ message: "Harga harus berupa angka." })
    .nonnegative("Harga tidak boleh negatif.")
    .max(999_999_999, "Harga terlalu besar."),
  category_id: z.string().uuid("Kategori menu wajib dipilih."),
  description: z
    .string()
    .trim()
    .max(1000, "Deskripsi maksimal 1000 karakter.")
    .optional()
    .default(""),
  image_url: z
    .union([z.string().trim().url("URL gambar tidak valid."), z.literal("")])
    .optional()
    .default(""),
});

export const menuCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi.")
    .max(60, "Nama maksimal 60 karakter."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug wajib diisi.")
    .max(60, "Slug maksimal 60 karakter.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung."),
});

export const paymentMethodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama metode pembayaran wajib diisi.")
    .max(60, "Nama maksimal 60 karakter."),
});

export const expenseCategoryTypeSchema = z.enum([
  "OPERATIONAL",
  "INCIDENTAL",
  "ROUTINE",
]);

export const expenseCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi.")
    .max(60, "Nama maksimal 60 karakter."),
  type: expenseCategoryTypeSchema,
});

export const idSchema = z.string().uuid("ID tidak valid.");

export const activeStateSchema = z.object({
  id: idSchema,
  is_active: z.boolean(),
});
