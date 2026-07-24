import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { menuService } from "@/services/menu-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { ActiveOrderForm } from "@/components/active-orders/active-order-form";

export default async function NewActiveOrderPage() {
  await requireUser();

  const supabase = await createClient();
  const [menus, paymentMethods] = await Promise.all([
    menuService.list(supabase),
    paymentMethodService.list(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pesanan Baru</h1>
        <p className="text-sm text-muted-foreground">
          Pilih menu pelanggan. Simpan sebagai Tagihan Aktif jika belum bayar, atau bayar langsung.
        </p>
      </div>

      <ActiveOrderForm
        menus={menus.filter((m) => m.is_active)}
        paymentMethods={paymentMethods.filter((pm) => pm.is_active)}
      />
    </div>
  );
}
