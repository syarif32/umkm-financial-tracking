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
  await requireOwner();

  const supabase = await createClient();

  const [menus, menuCategories, paymentMethods, expenseCategories] = await Promise.all([
    menuService.list(supabase),
    menuCategoryService.list(supabase),
    paymentMethodService.list(supabase),
    expenseCategoryService.list(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="bg-white p-5 rounded-2xl border shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Data Master</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola menu, kategori menu, metode pembayaran, dan kategori pengeluaran.
        </p>
      </div>

      <Tabs defaultValue="menus" className="flex flex-col flex-1">
        {/* Modifikasi TabsList agar ramah jempol dan bisa di-scroll horizontal di HP */}
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap rounded-xl bg-white border p-1 h-auto no-scrollbar">
          <TabsTrigger value="menus" className="py-2.5 px-4 rounded-lg text-sm whitespace-nowrap">Menu</TabsTrigger>
          <TabsTrigger value="menu-categories" className="py-2.5 px-4 rounded-lg text-sm whitespace-nowrap">Kategori Menu</TabsTrigger>
          <TabsTrigger value="payment-methods" className="py-2.5 px-4 rounded-lg text-sm whitespace-nowrap">Metode Pembayaran</TabsTrigger>
          <TabsTrigger value="expense-categories" className="py-2.5 px-4 rounded-lg text-sm whitespace-nowrap">Kategori Pengeluaran</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="menus" className="m-0">
            <MenuSection menus={menus} categories={menuCategories} />
          </TabsContent>
          <TabsContent value="menu-categories" className="m-0">
            <MenuCategorySection categories={menuCategories} />
          </TabsContent>
          <TabsContent value="payment-methods" className="m-0">
            <PaymentMethodSection paymentMethods={paymentMethods} />
          </TabsContent>
          <TabsContent value="expense-categories" className="m-0">
            <ExpenseCategorySection categories={expenseCategories} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}