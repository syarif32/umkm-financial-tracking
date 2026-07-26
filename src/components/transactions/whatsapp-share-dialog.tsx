"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle, Loader2 } from "lucide-react";
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
import { buildWhatsAppLink, normalizeIndonesianPhone } from "@/lib/phone";

export function WhatsAppShareDialog({
  defaultPhone,
  message,
  getReceiptBlob,
}: {
  defaultPhone: string;
  message: string;
  // KUNCI: Komponen ini butuh fungsi dari Anda untuk mencetak Canvas menjadi Blob PNG
  getReceiptBlob: () => Promise<Blob | null>;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    const normalized = normalizeIndonesianPhone(phone);
    if (!normalized) {
      toast.error("Nomor WhatsApp tidak valid.");
      return;
    }

    startTransition(async () => {
      try {
        const blob = await getReceiptBlob();
        if (!blob) throw new Error("Gagal memproses gambar struk.");

        const file = new File([blob], `struk-${Date.now()}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Struk Transaksi",
            text: message, // Teks bawaan
          });
          setOpen(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          toast.success("Gambar disalin ke Clipboard! Silakan Paste (Ctrl+V) di WhatsApp.", {
            duration: 6000,
          });
        } catch (clipErr) {
        
          toast.info("Membuka WhatsApp...");
        }

        window.open(buildWhatsAppLink(normalized, message), "_blank", "noopener,noreferrer");
        setOpen(false);
      } catch (error) {
        toast.error("Gagal menyiapkan gambar struk.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
          <MessageCircle className="h-4 w-4 mr-2" />
          Kirim via WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kirim Struk via WhatsApp</DialogTitle>
          <DialogDescription>
            Masukkan nomor pelanggan. Gambar struk akan otomatis disertakan jika perangkat Anda mendukung.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wa-phone">Nomor WhatsApp Pelanggan</Label>
          <Input
            id="wa-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contoh: 0812xxxxxxx"
            maxLength={20}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleOpen} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buka WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}