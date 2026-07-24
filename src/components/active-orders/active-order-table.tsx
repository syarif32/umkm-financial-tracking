import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/utils";
import type { ActiveOrderListItem } from "@/types/active-order";
import type { ActiveOrderStatus } from "@/types/database";

const STATUS_LABEL: Record<ActiveOrderStatus, string> = {
  OPEN: "Aktif",
  PAID: "Sudah Dibayar",
  CANCELLED: "Dibatalkan",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function ActiveOrderTable({ orders }: { orders: ActiveOrderListItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Pesanan</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead>Kasir</TableHead>
            <TableHead className="text-right">Item</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-16 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tidak ada pesanan.
              </TableCell>
            </TableRow>
          )}
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.order_number}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {formatDateTime(order.created_at)}
              </TableCell>
              <TableCell>{order.creator_name}</TableCell>
              <TableCell className="text-right">{order.item_count}</TableCell>
              <TableCell className="text-right font-medium">
                {formatRupiah(order.total_amount)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    order.status === "OPEN"
                      ? "default"
                      : order.status === "PAID"
                        ? "success"
                        : "destructive"
                  }
                >
                  {STATUS_LABEL[order.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon" title="Lihat pesanan">
                  <Link href={`/dashboard/active-orders/${order.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
