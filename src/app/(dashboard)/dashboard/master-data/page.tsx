import { requireOwner } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { menuService } from "@/services/menu-service";
import { menuCategoryService } from "@/services/menu-category-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { expenseCategoryService } from "@/services/expense-category-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuSection } from "@/components/master-data/menu-section";
import { MenuCategorySection } from "@/components/master-data/menu-category-section";
import { PaymentMethodSection } from "@/components/master-data/payment-method-section";
import { ExpenseCategorySection } from "@/components/master-data/expense-category-section";

export default async function MasterDataPage() {
  // Server-side guard: even if a Karyawan navigates here directly (the nav
  // link is hidden for them, but hidden UI is not a security boundary),
  // this redirects them to /dashboard before any data is fetched.
  await requireOwner();

  const supabase = await createClient();

  const [menus, menuCategories, paymentMethods, expenseCategories] = await Promise.all([
    menuService.list(supabase),
    menuCategoryService.list(supabase),
    paymentMethodService.list(supabase),
    expenseCategoryService.list(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Data Master</h1>
        <p className="text-sm text-muted-foreground">
          Kelola menu, kategori menu, metode pembayaran, dan kategori pengeluaran.
        </p>
      </div>

      <Tabs defaultValue="menus">
        <TabsList>
          <TabsTrigger value="menus">Menu</TabsTrigger>
          <TabsTrigger value="menu-categories">Kategori Menu</TabsTrigger>
          <TabsTrigger value="payment-methods">Metode Pembayaran</TabsTrigger>
          <TabsTrigger value="expense-categories">Kategori Pengeluaran</TabsTrigger>
        </TabsList>

        <TabsContent value="menus">
          <MenuSection menus={menus} categories={menuCategories} />
        </TabsContent>
        <TabsContent value="menu-categories">
          <MenuCategorySection categories={menuCategories} />
        </TabsContent>
        <TabsContent value="payment-methods">
          <PaymentMethodSection paymentMethods={paymentMethods} />
        </TabsContent>
        <TabsContent value="expense-categories">
          <ExpenseCategorySection categories={expenseCategories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
