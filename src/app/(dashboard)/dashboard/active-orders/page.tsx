import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { activeOrderService } from "@/services/active-order-service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActiveOrderTable } from "@/components/active-orders/active-order-table";
import type { ActiveOrderStatus } from "@/types/database";

const STATUS_TABS: { value: ActiveOrderStatus | "ALL"; label: string }[] = [
  { value: "OPEN", label: "Aktif" },
  { value: "PAID", label: "Sudah Dibayar" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "ALL", label: "Semua" },
];

export default async function ActiveOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const status: ActiveOrderStatus | undefined =
    params.status === "PAID" || params.status === "CANCELLED" || params.status === "OPEN"
      ? params.status
      : undefined;
  const activeTab = status ?? "OPEN";

  const supabase = await createClient();
  const orders = await activeOrderService.listActiveOrders(supabase, { status });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tagihan Aktif</h1>
          <p className="text-sm text-muted-foreground">
            Pesanan pelanggan yang belum dibayar — belum masuk laporan keuangan.
          </p>
        </div>
        <Button asChild size="lg" className="h-12 text-base">
          <Link href="/dashboard/active-orders/new">
            <Plus className="h-4 w-4" />
            Pesanan Baru
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            asChild
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            className={cn(activeTab === tab.value && "pointer-events-none")}
          >
            <Link
              href={
                tab.value === "ALL"
                  ? "/dashboard/active-orders"
                  : `/dashboard/active-orders?status=${tab.value}`
              }
            >
              {tab.label}
            </Link>
          </Button>
        ))}
      </div>

      <ActiveOrderTable orders={orders} />
    </div>
  );
}
