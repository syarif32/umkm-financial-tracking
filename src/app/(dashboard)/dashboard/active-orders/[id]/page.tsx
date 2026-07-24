import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { activeOrderService } from "@/services/active-order-service";
import { menuService } from "@/services/menu-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { ActiveOrderItemList } from "@/components/active-orders/active-order-item-list";
import { AddActiveOrderItemForm } from "@/components/active-orders/add-active-order-item-form";
import { ActiveOrderNotesEditor } from "@/components/active-orders/active-order-notes-editor";
import { CheckoutActiveOrderDialog } from "@/components/active-orders/checkout-active-order-dialog";
import { CancelActiveOrderDialog } from "@/components/active-orders/cancel-active-order-dialog";
import type { ActiveOrderStatus } from "@/types/database";

const STATUS_LABEL: Record<ActiveOrderStatus, string> = {
  OPEN: "Aktif",
  PAID: "Sudah Dibayar",
  CANCELLED: "Dibatalkan",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
}

export default async function ActiveOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireUser();
  const isOwner = currentUser.profile.role === "OWNER";

  const supabase = await createClient();
  const order = await activeOrderService.getActiveOrderDetail(supabase, id);
  if (!order) {
    notFound();
  }

  const isOpen = order.status === "OPEN";

  const [menus, paymentMethods] = isOpen
    ? await Promise.all([menuService.list(supabase), paymentMethodService.list(supabase)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/active-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{order.order_number}</h1>
          <div className="flex items-center gap-2 pt-1">
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
            <span className="text-xs text-muted-foreground">
              Dibuat {formatDateTime(order.created_at)} oleh {order.creator_name}
            </span>
          </div>
        </div>
      </div>

      {order.status === "PAID" && order.transaction_id && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Pesanan ini sudah dibayar dan tercatat sebagai transaksi.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/transactions/${order.transaction_id}`}>
                <Receipt className="h-4 w-4" />
                Lihat Transaksi
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Item Pesanan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActiveOrderItemList activeOrderId={order.id} items={order.items} editable={isOpen} />

          {isOpen && <AddActiveOrderItemForm activeOrderId={order.id} menus={menus.filter((m) => m.is_active)} />}

          <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{formatRupiah(order.total_amount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catatan</CardTitle>
        </CardHeader>
        <CardContent>
          {isOpen ? (
            <ActiveOrderNotesEditor activeOrderId={order.id} initialNotes={order.notes ?? ""} />
          ) : (
            <p className="text-sm text-muted-foreground">{order.notes || "Tidak ada catatan."}</p>
          )}
        </CardContent>
      </Card>

      {isOpen && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <CheckoutActiveOrderDialog
            activeOrderId={order.id}
            totalAmount={order.total_amount}
            paymentMethods={paymentMethods.filter((pm) => pm.is_active)}
          />
          {isOwner && <CancelActiveOrderDialog activeOrderId={order.id} />}
        </div>
      )}
    </div>
  );
}
