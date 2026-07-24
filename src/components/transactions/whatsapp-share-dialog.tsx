"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
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
}: {
  defaultPhone: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);

  function handleOpen() {
    // wa.me only opens WhatsApp with the message prefilled — the person
    // still has to tap send themselves, nothing here transmits anything.
    const normalized = normalizeIndonesianPhone(phone);
    if (!normalized) {
      toast.error("Nomor WhatsApp tidak valid.");
      return;
    }

    window.open(buildWhatsAppLink(normalized, message), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircle className="h-4 w-4" />
          Kirim via WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kirim Struk via WhatsApp</DialogTitle>
          <DialogDescription>
            WhatsApp akan terbuka dengan pesan yang sudah disiapkan — Anda tetap perlu menekan
            tombol kirim secara manual.
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
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleOpen}>
            Buka WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
