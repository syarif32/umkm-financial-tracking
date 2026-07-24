/**
 * Draws the digital receipt onto a <canvas> so it can be exported as PNG
 * (download / share / attach). Deliberately hand-drawn rather than using a
 * DOM-to-image library: this app's CSS uses oklch() theme colors (Tailwind
 * v4), which libraries like html2canvas are known to mis-render or throw on
 * — and per the Step 5 brief, no new dependency should be added unless
 * truly necessary. A receipt's layout is simple enough to draw directly.
 */

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
  statusLabel: string;
  isVoided: boolean;
  voidReason?: string;
  thankYouMessage: string;
}

const WIDTH = 420;
const PADDING = 24;
const CONTENT_WIDTH = WIDTH - PADDING * 2;
const RENDER_SCALE = 2;

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

  ops.push({ kind: "text", text: data.businessName, font: "bold 20px Arial", align: "center", height: 26 });
  if (data.businessAddress) {
    ops.push({ kind: "text", text: data.businessAddress, font: "12px Arial", align: "center", color: "#555555", height: 16 });
  }
  if (data.businessPhone) {
    ops.push({ kind: "text", text: data.businessPhone, font: "12px Arial", align: "center", color: "#555555", height: 16 });
  }

  ops.push({ kind: "rule", marginTop: 10, marginBottom: 10 });
  ops.push({ kind: "text", text: data.title, font: "bold 14px Arial", align: "center", height: 20 });
  ops.push({ kind: "space", height: 6 });

  ops.push({ kind: "row", left: "No. Transaksi", right: data.transactionId, font: "12px Arial", height: 18 });
  ops.push({ kind: "row", left: "Tanggal", right: data.dateTimeLabel, font: "12px Arial", height: 18 });
  ops.push({ kind: "row", left: "Kasir", right: data.cashierName, font: "12px Arial", height: 18 });

  ops.push({ kind: "rule", marginTop: 10, marginBottom: 10 });

  if (data.type === "INCOME") {
    for (const item of data.items) {
      ctx.font = "bold 12px Arial";
      const name = truncateToWidth(ctx, item.name, CONTENT_WIDTH);
      ops.push({ kind: "text", text: name, font: "bold 12px Arial", align: "left", height: 16 });
      ops.push({
        kind: "row",
        left: `  ${item.quantityLabel} x ${item.priceLabel}`,
        right: item.subtotalLabel,
        font: "12px Arial",
        height: 18,
      });
    }
  } else {
    if (data.expenseCategoryLabel) {
      ops.push({ kind: "row", left: "Kategori", right: data.expenseCategoryLabel, font: "12px Arial", height: 18 });
    }
    if (data.notes) {
      ops.push({ kind: "text", text: "Catatan:", font: "12px Arial", align: "left", height: 16 });
      ctx.font = "12px Arial";
      for (const line of wrapText(ctx, data.notes, CONTENT_WIDTH)) {
        ops.push({ kind: "text", text: line, font: "12px Arial", align: "left", color: "#555555", height: 16 });
      }
    }
  }

  ops.push({ kind: "rule", marginTop: 10, marginBottom: 10 });
  ops.push({ kind: "row", left: "Metode Pembayaran", right: data.paymentMethodName, font: "12px Arial", height: 18 });
  if (data.customerPhoneLabel) {
    ops.push({ kind: "row", left: "No. WhatsApp", right: data.customerPhoneLabel, font: "12px Arial", height: 18 });
  }
  ops.push({ kind: "space", height: 4 });
  ops.push({ kind: "row", left: "TOTAL", right: data.totalLabel, font: "bold 16px Arial", height: 24 });

  ops.push({ kind: "rule", marginTop: 10, marginBottom: 10 });
  ops.push({
    kind: "text",
    text: `Status: ${data.statusLabel}`,
    font: "bold 12px Arial",
    align: "center",
    height: 18,
    color: data.isVoided ? "#dc2626" : "#16a34a",
  });
  if (data.voidReason) {
    ctx.font = "12px Arial";
    for (const line of wrapText(ctx, `Alasan: ${data.voidReason}`, CONTENT_WIDTH)) {
      ops.push({ kind: "text", text: line, font: "12px Arial", align: "center", color: "#dc2626", height: 16 });
    }
  }

  ops.push({ kind: "space", height: 10 });
  ops.push({ kind: "text", text: data.thankYouMessage, font: "italic 12px Arial", align: "center", height: 18 });

  return ops;
}

/** Draws the receipt onto `canvas`, sizing it to fit the content. */
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
  ctx.textBaseline = "alphabetic";

  let y = PADDING;
  for (const op of ops) {
    if (op.kind === "rule") {
      y += op.marginTop ?? 0;
      ctx.strokeStyle = "#999999";
      ctx.setLineDash([2, 2]);
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

    if (op.kind === "text") {
      ctx.font = op.font;
      ctx.fillStyle = op.color ?? "#111111";
      ctx.textAlign = op.align;
      const x = op.align === "left" ? PADDING : op.align === "right" ? WIDTH - PADDING : WIDTH / 2;
      ctx.fillText(op.text, x, y + op.height * 0.7);
    } else {
      ctx.font = op.font;
      ctx.fillStyle = "#111111";
      ctx.textAlign = "left";
      ctx.fillText(op.left, PADDING, y + op.height * 0.7);
      ctx.textAlign = "right";
      ctx.fillText(op.right, WIDTH - PADDING, y + op.height * 0.7);
    }

    y += op.height;
  }
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
