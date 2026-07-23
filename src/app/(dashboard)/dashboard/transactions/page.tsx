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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Catat transaksi baru dan kelola seluruh riwayat transaksi."
            : "Catat transaksi penjualan dan pengeluaran selama shift Anda."}
        </p>
      </div>

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">Input Transaksi</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="flex flex-col gap-6">
          <SaleForm menus={activeMenus} paymentMethods={activePaymentMethods} />
          <ExpenseForm
            categories={activeExpenseCategories}
            paymentMethods={activePaymentMethods}
          />
        </TabsContent>

        <TabsContent value="history">
          <TransactionHistoryTable transactions={history} isOwner={isOwner} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
