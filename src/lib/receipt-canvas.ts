export interface ReceiptItemLine {
  name: string;
  quantityLabel: string;
  priceLabel: string;
  subtotalLabel: string;
}

export interface ReceiptCanvasData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  title: string;
  transactionId: string;
  dateTimeLabel: string;
  cashierName: string;
  type: "INCOME" | "EXPENSE";
  items: ReceiptItemLine[];
  expenseCategoryLabel?: string;
  notes?: string;
  paymentMethodName: string;
  totalLabel: string;
  customerPhoneLabel?: string;
  customerNameLabel?: string; // TAMBAHAN: Properti nama pelanggan
  statusLabel: string;
  isVoided: boolean;
  voidReason?: string;
  thankYouMessage: string;
}

const WIDTH = 400;
const PADDING = 28;
const CONTENT_WIDTH = WIDTH - PADDING * 2;
const RENDER_SCALE = 2;

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type TextOp = {
  kind: "text";
  text: string;
  font: string;
  align: "left" | "center" | "right";
  color?: string;
  height: number;
  marginTop?: number;
};
type RowOp = {
  kind: "row";
  left: string;
  right: string;
  font: string;
  height: number;
  leftColor?: string;
  rightColor?: string;
  marginTop?: number;
};
type RuleOp = { kind: "rule"; marginTop?: number; marginBottom?: number };
type SpaceOp = { kind: "space"; height: number };
type Op = TextOp | RowOp | RuleOp | SpaceOp;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}\u2026`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}\u2026`;
}

function buildOps(ctx: CanvasRenderingContext2D, data: ReceiptCanvasData): Op[] {
  const ops: Op[] = [];

  // Header Bisnis (Dilindungi dengan fallback string kosong)
  ops.push({ kind: "text", text: (data.businessName || "").toUpperCase(), font: `600 18px ${FONT_FAMILY}`, align: "center", height: 22, color: "#0f172a" });
  
  // Perbaikan: Alamat sekarang di-wrap (bisa turun baris jika terlalu panjang)
  if (data.businessAddress) {
    ops.push({ kind: "space", height: 2 });
    for (const line of wrapText(ctx, data.businessAddress, CONTENT_WIDTH)) {
      ops.push({ kind: "text", text: line, font: `400 11px ${FONT_FAMILY}`, align: "center", color: "#64748b", height: 14 });
    }
  }
  if (data.businessPhone) {
    ops.push({ kind: "text", text: data.businessPhone, font: `400 11px ${FONT_FAMILY}`, align: "center", color: "#64748b", height: 14 });
  }

  ops.push({ kind: "rule", marginTop: 14, marginBottom: 14 });
  
  // Judul & Transaksi Info (Dilindungi fallback agar tidak error toUpperCase)
  ops.push({ kind: "text", text: (data.title || "STRUK").toUpperCase(), font: `600 12px ${FONT_FAMILY}`, align: "center", color: "#334155", height: 16 });
  ops.push({ kind: "space", height: 8 });

  ops.push({ kind: "row", left: "No. Transaksi", right: data.transactionId || "-", font: `400 11px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
  ops.push({ kind: "row", left: "Tanggal", right: data.dateTimeLabel || "-", font: `400 11px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
  ops.push({ kind: "row", left: "Kasir", right: data.cashierName || "-", font: `400 11px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
  
  if (data.customerNameLabel) {
    ops.push({ kind: "row", left: "Pelanggan", right: data.customerNameLabel, font: `600 11px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
  }

  ops.push({ kind: "rule", marginTop: 12, marginBottom: 12 });

  // Daftar Barang
  const items = data.items || []; // Pastikan selalu array
  if (data.type === "INCOME") {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (i > 0) ops.push({ kind: "space", height: 6 });

      ctx.font = `500 12px ${FONT_FAMILY}`;
      const name = truncateToWidth(ctx, item.name || "Item", CONTENT_WIDTH);
      ops.push({ kind: "text", text: name, font: `500 12px ${FONT_FAMILY}`, align: "left", color: "#0f172a", height: 16 });
      ops.push({
        kind: "row",
        left: `${item.quantityLabel} x ${item.priceLabel}`,
        right: item.subtotalLabel,
        font: `400 11px ${FONT_FAMILY}`,
        leftColor: "#64748b",
        rightColor: "#0f172a",
        height: 16,
      });
    }
  } else {
    if (data.expenseCategoryLabel) {
      ops.push({ kind: "row", left: "Kategori", right: data.expenseCategoryLabel, font: `400 12px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
    }
    if (data.notes) {
      ops.push({ kind: "space", height: 4 });
      ops.push({ kind: "text", text: "Catatan:", font: `500 11px ${FONT_FAMILY}`, align: "left", color: "#334155", height: 14 });
      ctx.font = `400 11px ${FONT_FAMILY}`;
      for (const line of wrapText(ctx, data.notes, CONTENT_WIDTH)) {
        ops.push({ kind: "text", text: line, font: `400 11px ${FONT_FAMILY}`, align: "left", color: "#64748b", height: 15 });
      }
    }
  }

  ops.push({ kind: "rule", marginTop: 12, marginBottom: 12 });

  // Pembayaran & Total
  ops.push({ kind: "row", left: "Metode Pembayaran", right: data.paymentMethodName || "-", font: `400 12px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
  if (data.customerPhoneLabel) {
    ops.push({ kind: "row", left: "No. WhatsApp", right: data.customerPhoneLabel, font: `400 12px ${FONT_FAMILY}`, leftColor: "#64748b", rightColor: "#0f172a", height: 18 });
  }
  
  ops.push({ kind: "space", height: 8 });
  ops.push({ kind: "row", left: "TOTAL", right: data.totalLabel || "Rp 0", font: `700 15px ${FONT_FAMILY}`, leftColor: "#0f172a", rightColor: "#0f172a", height: 22 });

  ops.push({ kind: "rule", marginTop: 12, marginBottom: 12 });

  // Status
  const statusColor = data.isVoided ? "#dc2626" : "#16a34a";
  ops.push({
    kind: "text",
    text: `• ${(data.statusLabel || "").toUpperCase()} •`,
    font: `600 11px ${FONT_FAMILY}`,
    align: "center",
    height: 16,
    color: statusColor,
  });

  if (data.voidReason) {
    ops.push({ kind: "space", height: 2 });
    ctx.font = `400 11px ${FONT_FAMILY}`;
    for (const line of wrapText(ctx, `Alasan: ${data.voidReason}`, CONTENT_WIDTH)) {
      ops.push({ kind: "text", text: line, font: `400 11px ${FONT_FAMILY}`, align: "center", color: "#dc2626", height: 15 });
    }
  }

  ops.push({ kind: "space", height: 12 });
  ops.push({ kind: "text", text: data.thankYouMessage || "Terima kasih!", font: `400 11px ${FONT_FAMILY}`, align: "center", color: "#64748b", height: 16 });

  return ops;
}
export function drawReceipt(canvas: HTMLCanvasElement, data: ReceiptCanvasData): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ops = buildOps(ctx, data);

  let height = PADDING;
  for (const op of ops) {
    if (op.kind === "rule") {
      height += (op.marginTop ?? 0) + 1 + (op.marginBottom ?? 0);
      continue;
    }
    if (op.kind === "space") {
      height += op.height;
      continue;
    }
    height += (op.marginTop ?? 0) + op.height;
  }
  height += PADDING;

  canvas.width = WIDTH * RENDER_SCALE;
  canvas.height = height * RENDER_SCALE;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(RENDER_SCALE, RENDER_SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "middle";

  let y = PADDING;
  for (const op of ops) {
    if (op.kind === "rule") {
      y += op.marginTop ?? 0;
      ctx.strokeStyle = "#cbd5e1"; 
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]); 
      ctx.beginPath();
      ctx.moveTo(PADDING, y + 0.5);
      ctx.lineTo(WIDTH - PADDING, y + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      y += 1 + (op.marginBottom ?? 0);
      continue;
    }

    if (op.kind === "space") {
      y += op.height;
      continue;
    }

    y += op.marginTop ?? 0;
    const centerY = y + op.height / 2;

    if (op.kind === "text") {
      ctx.font = op.font;
      ctx.fillStyle = op.color ?? "#0f172a";
      ctx.textAlign = op.align;
      const x = op.align === "left" ? PADDING : op.align === "right" ? WIDTH - PADDING : WIDTH / 2;
      ctx.fillText(op.text, x, centerY);
    } else {
      ctx.font = op.font;
      ctx.textAlign = "left";
      ctx.fillStyle = op.leftColor ?? "#0f172a";
      ctx.fillText(op.left, PADDING, centerY);

      ctx.textAlign = "right";
      ctx.fillStyle = op.rightColor ?? "#0f172a";
      ctx.fillText(op.right, WIDTH - PADDING, centerY);
    }

    y += op.height;
  }
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}