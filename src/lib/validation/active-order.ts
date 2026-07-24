import { z } from "zod";
import { customerPhoneSchema } from "@/lib/validation/transaction";

export const activeOrderItemSchema = z.object({
  menu_id: z.string().uuid("ID menu tidak valid."),
  quantity: z.coerce
    .number({ message: "Kuantitas harus berupa angka." })
    .int("Kuantitas harus bilangan bulat.")
    .min(1, "Kuantitas minimal 1.")
    .max(9999, "Kuantitas terlalu besar."),
});

export const createActiveOrderSchema = z.object({
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().default(""),
  items: z.array(activeOrderItemSchema).max(50, "Maksimal 50 item per pesanan.").default([]),
});

export const addActiveOrderItemSchema = z.object({
  active_order_id: z.string().uuid("ID pesanan tidak valid."),
  menu_id: z.string().uuid("ID menu tidak valid."),
  quantity: z.coerce
    .number({ message: "Kuantitas harus berupa angka." })
    .int("Kuantitas harus bilangan bulat.")
    .min(1, "Kuantitas minimal 1.")
    .max(9999, "Kuantitas terlalu besar."),
});

export const updateActiveOrderItemQuantitySchema = z.object({
  id: z.string().uuid("ID item tidak valid."),
  quantity: z.coerce
    .number({ message: "Kuantitas harus berupa angka." })
    .int("Kuantitas harus bilangan bulat.")
    .min(1, "Kuantitas minimal 1.")
    .max(9999, "Kuantitas terlalu besar."),
});

export const removeActiveOrderItemSchema = z.object({
  id: z.string().uuid("ID item tidak valid."),
});

export const updateActiveOrderNotesSchema = z.object({
  id: z.string().uuid("ID pesanan tidak valid."),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
});

export const cancelActiveOrderSchema = z.object({
  id: z.string().uuid("ID pesanan tidak valid."),
});

export const checkoutActiveOrderSchema = z.object({
  active_order_id: z.string().uuid("ID pesanan tidak valid."),
  payment_method_id: z.string().uuid("Metode pembayaran wajib dipilih."),
  customer_phone: customerPhoneSchema,
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().default(""),
});
