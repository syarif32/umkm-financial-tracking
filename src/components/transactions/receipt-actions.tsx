"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_INFO } from "@/lib/business-info";
import { formatRupiah } from "@/lib/utils";
import { canvasToPngBlob, drawReceipt } from "@/lib/receipt-canvas";
import type { TransactionListItem } from "@/types/transaction";
import { WhatsAppShareDialog } from "./whatsapp-share-dialog";

const TYPE_LABEL: Record<"OPERATIONAL" | "INCIDENTAL" | "ROUTINE", string> = {
  OPERATIONAL: "Operasional",
  INCIDENTAL: "Insidental",
  ROUTINE: "Rutin",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
}

function buildFileName(transaction: TransactionListItem): string {
  return `struk-${transaction.id.slice(0, 8)}.png`;
}

function buildWhatsAppMessage(transaction: TransactionListItem): string {
  return `Halo Kak 👋\n\nBerikut struk pembelian Anda.\n\nTotal: ${formatRupiah(
    transaction.total_amount
  )}\nPembayaran: ${transaction.payment_method_name}\n\nTerima kasih sudah berbelanja 🙏`;
}

export function ReceiptActions({ transaction }: { transaction: TransactionListItem }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const handleGetReceiptBlob = async () => {
  try {
    // 1. Siapkan data struk sesuai format Canvas Anda
    const canvasData = {
      businessName: BUSINESS_INFO.name,
      businessAddress: BUSINESS_INFO.address || "",
      businessPhone: BUSINESS_INFO.phone || "",
      title: transaction.type === "INCOME" ? "STRUK PENJUALAN" : "STRUK PENGELUARAN",
      transactionId: transaction.id.slice(0, 8).toUpperCase(),
      dateTimeLabel: new Date(transaction.transaction_date).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }),
      cashierName: transaction.creator_name,
      customerNameLabel: transaction.customer_name || undefined, // Mengambil nama pelanggan yang baru dibuat!
      type: transaction.type,
      items: transaction.items.map(item => ({
        name: item.menu_name,
        quantityLabel: String(item.quantity),
        priceLabel: formatRupiah(item.price_at_transaction),
        subtotalLabel: formatRupiah(item.subtotal)
      })),
      expenseCategoryLabel: transaction.expense_category_name || undefined,
      notes: transaction.notes || undefined,
      paymentMethodName: transaction.payment_method_name,
      totalLabel: formatRupiah(transaction.total_amount),
      customerPhoneLabel: transaction.customer_phone || undefined,
      statusLabel: transaction.status === "VOIDED" ? "Dibatalkan" : "Selesai",
      isVoided: transaction.status === "VOIDED",
      voidReason: transaction.void_reason || undefined,
      thankYouMessage: "Terima kasih sudah berbelanja 🙏"
    };

    // 2. Buat Canvas di memori belakang layar (tidak perlu tampil di layar)
    const canvas = document.createElement("canvas");
    
    // 3. Gambar struk ke Canvas menggunakan fungsi yang sudah Anda miliki
    drawReceipt(canvas, canvasData);
    
    // 4. Ubah Canvas jadi bentuk Blob PNG
    const blob = await canvasToPngBlob(canvas);
    return blob;
  } catch (error) {
    console.error("Canvas Render Error:", error);
    return null;
  }
};
  function renderToHiddenCanvas(): HTMLCanvasElement {
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;

    drawReceipt(canvas, {
      businessName: BUSINESS_INFO.name,
      businessAddress: BUSINESS_INFO.address,
      businessPhone: BUSINESS_INFO.phone,
      title: transaction.type === "INCOME" ? "STRUK PENJUALAN" : "STRUK PENGELUARAN",
      transactionId: transaction.id.slice(0, 8).toUpperCase(),
      dateTimeLabel: formatDateTime(transaction.transaction_date),
      cashierName: transaction.creator_name,
      type: transaction.type,
      items: transaction.items.map((item) => ({
        name: item.menu_name,
        quantityLabel: String(item.quantity),
        priceLabel: formatRupiah(item.price_at_transaction),
        subtotalLabel: formatRupiah(item.subtotal),
      })),
      expenseCategoryLabel: transaction.expense_category_name
        ? `${transaction.expense_category_name}${
            transaction.expense_category_type ? ` (${TYPE_LABEL[transaction.expense_category_type]})` : ""
          }`
        : undefined,
      notes: transaction.notes ?? undefined,
      paymentMethodName: transaction.payment_method_name,
      totalLabel: formatRupiah(transaction.total_amount),
      customerPhoneLabel: transaction.customer_phone ?? undefined,
      statusLabel: transaction.status === "VOIDED" ? "Dibatalkan" : "Selesai",
      isVoided: transaction.status === "VOIDED",
      voidReason: transaction.void_reason ?? undefined,
      thankYouMessage: "Terima kasih sudah berbelanja 🙏",
    });

    return canvas;
  }

  async function handleDownload() {
    setIsWorking(true);
    try {
      const canvas = renderToHiddenCanvas();
      const blob = await canvasToPngBlob(canvas);
      if (!blob) {
        toast.error("Gagal membuat gambar struk.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildFileName(transaction);
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Struk berhasil diunduh.");
    } finally {
      setIsWorking(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    setIsWorking(true);
    try {
      const canvas = renderToHiddenCanvas();
      const blob = await canvasToPngBlob(canvas);
      if (!blob) {
        toast.error("Gagal membuat gambar struk.");
        return;
      }

      const file = new File([blob], buildFileName(transaction), { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "Struk Transaksi",
          text: `Struk transaksi ${transaction.id.slice(0, 8).toUpperCase()}`,
        });
        return;
      }

      // Web Share API (with files) isn't supported on this browser/device —
      // fall back to downloading the image instead so the user still gets it.
      toast.info("Berbagi langsung tidak didukung di perangkat ini — struk akan diunduh.");
      await handleDownload();
    } catch (err) {
      // AbortError happens when the user just cancels the native share sheet.
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Gagal membagikan struk.");
      }
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={isWorking}>
        {isWorking ? <Loader2 className="animate-spin" /> : <Download className="h-4 w-4" />}
        Download PNG
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleShare} disabled={isWorking}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      {transaction.type === "INCOME" && (
        <WhatsAppShareDialog
          defaultPhone={transaction.customer_phone ?? ""}
          message={buildWhatsAppMessage(transaction)}
          getReceiptBlob={handleGetReceiptBlob}
        />
      )}
    </div>
  );
}
