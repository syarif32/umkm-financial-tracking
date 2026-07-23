import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { menuService } from "@/services/menu-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { expenseCategoryService } from "@/services/expense-category-service";
import { transactionService } from "@/services/transaction-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaleForm } from "@/components/transactions/sale-form";
import { ExpenseForm } from "@/components/transactions/expense-form";
import { TransactionHistoryTable } from "@/components/transactions/transaction-history-table";

export default async function TransactionsPage() {
  const currentUser = await requireUser();
  const isOwner = currentUser.profile.role === "OWNER";
  const supabase = await createClient();

  const [menus, paymentMethods, expenseCategories, history] = await Promise.all([
    menuService.list(supabase),
    paymentMethodService.list(supabase),
    expenseCategoryService.list(supabase),
    transactionService.listTransactionHistory(supabase, {
      id: currentUser.id,
      isOwner,
    }),
  ]);

  const activeMenus = menus.filter((m) => m.is_active);
  const activePaymentMethods = paymentMethods.filter((pm) => pm.is_active);
  const activeExpenseCategories = expenseCategories.filter((c) => c.is_active);

  return (
    // Tambahkan h-full agar form bisa menggunakan area layar secara maksimal
    <div className="flex flex-col gap-6 h-full pb-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Transaksi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isOwner
            ? "Catat transaksi baru dan kelola seluruh riwayat transaksi."
            : "Catat transaksi penjualan dan pengeluaran selama shift Anda."}
        </p>
      </div>

      <Tabs defaultValue="new" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-white border p-1 h-auto">
          <TabsTrigger value="new" className="py-2.5 px-4 rounded-lg text-sm">Penjualan & Pengeluaran</TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 px-4 rounded-lg text-sm">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="flex-1 mt-4">
          <div className="flex flex-col gap-8">
            <SaleForm menus={activeMenus} paymentMethods={activePaymentMethods} />
            
            {/* Divider visual untuk memisahkan Penjualan dan Pengeluaran */}
            <div className="border-t-2 border-dashed border-gray-200" />
            
            <ExpenseForm
              categories={activeExpenseCategories}
              paymentMethods={activePaymentMethods}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <TransactionHistoryTable transactions={history} isOwner={isOwner} />
        </TabsContent>
      </Tabs>
    </div>
  );
}