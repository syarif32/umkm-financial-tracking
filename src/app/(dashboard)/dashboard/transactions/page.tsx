import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { menuService } from "@/services/menu-service";
import { paymentMethodService } from "@/services/payment-method-service";
import { expenseCategoryService } from "@/services/expense-category-service";
import { transactionService } from "@/services/transaction-service";
import { activeOrderService } from "@/services/active-order-service"; // <-- Tambahan
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaleForm } from "@/components/transactions/sale-form";
import { ExpenseForm } from "@/components/transactions/expense-form";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionHistoryTable } from "@/components/transactions/transaction-history-table";
import { ActiveOrderTable } from "@/components/active-orders/active-order-table"; // <-- Tambahan
import type { TransactionStatus, TransactionType } from "@/types/database";

const ALL_VALUE = "all";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

interface SearchParams {
  search?: string;
  from?: string;
  to?: string;
  type?: string;
  status?: string;
  paymentMethodId?: string;
  expenseCategoryId?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await requireUser();
  const isOwner = currentUser.profile.role === "OWNER";
  const params = await searchParams;

  const type: TransactionType | undefined =
    params.type === "INCOME" || params.type === "EXPENSE" ? params.type : undefined;
  const status: TransactionStatus | undefined =
    params.status === "COMPLETED" || params.status === "VOIDED" ? params.status : undefined;
  const paymentMethodId =
    params.paymentMethodId && uuidPattern.test(params.paymentMethodId)
      ? params.paymentMethodId
      : undefined;
  const expenseCategoryId =
    params.expenseCategoryId && uuidPattern.test(params.expenseCategoryId)
      ? params.expenseCategoryId
      : undefined;
  const fromDate = params.from && datePattern.test(params.from) ? params.from : undefined;
  const toDate = params.to && datePattern.test(params.to) ? params.to : undefined;
  const search = params.search?.trim() || undefined;
  const sortAscending = params.sort === "asc";
  
  const page = parseInt(params.page || "1", 10);
  const limit = parseInt(params.limit || "20", 10);

  const hasActiveFilters = Boolean(
    search || fromDate || toDate || type || status || paymentMethodId || expenseCategoryId
  );

  const supabase = await createClient();

  // Fetch data secara paralel, TERMASUK Active Orders
  const [menus, paymentMethods, expenseCategories, activeOrders] = await Promise.all([
    menuService.list(supabase),
    paymentMethodService.list(supabase),
    expenseCategoryService.list(supabase),
    activeOrderService.listActiveOrders(supabase, { status: "OPEN" }), // <-- Ambil yang belum lunas saja
  ]);

  const paginatedHistory = await transactionService.listTransactionHistory(
    supabase,
    { id: currentUser.id, isOwner },
    {
      type,
      status,
      paymentMethodId,
      expenseCategoryId,
      fromDate,
      toDate,
      search,
      sortAscending,
      page,
      limit,
    },
    { 
      menus, 
      paymentMethods, 
      categories: expenseCategories 
    }
  );

  const activeMenus = menus.filter((m) => m.is_active);
  const activePaymentMethods = paymentMethods.filter((pm) => pm.is_active);
  const activeExpenseCategories = expenseCategories.filter((c) => c.is_active);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Catat transaksi baru, kelola tagihan yang belum lunas, dan pantau riwayat."
            : "Catat transaksi penjualan dan pengeluaran selama shift Anda."}
        </p>
      </div>

      <Tabs defaultValue="new">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="new">Input</TabsTrigger>
          <TabsTrigger value="active">Belum Lunas</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="flex flex-col gap-6 mt-4">
          <SaleForm menus={activeMenus} paymentMethods={activePaymentMethods} />
          <ExpenseForm
            categories={activeExpenseCategories}
            paymentMethods={activePaymentMethods}
          />
        </TabsContent>

        {/* TAB BARU: TAGIHAN AKTIF */}
        <TabsContent value="active" className="mt-4">
          <ActiveOrderTable orders={activeOrders} />
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-4 mt-4">
          <TransactionFilters
            value={{
              search: search ?? "",
              from: fromDate ?? "",
              to: toDate ?? "",
              type: type ?? ALL_VALUE,
              status: status ?? ALL_VALUE,
              paymentMethodId: paymentMethodId ?? ALL_VALUE,
              expenseCategoryId: expenseCategoryId ?? ALL_VALUE,
              sort: sortAscending ? "asc" : "desc",
            }}
            paymentMethods={paymentMethods}
            expenseCategories={expenseCategories}
          />
          <TransactionHistoryTable
            transactions={paginatedHistory.data}
            isOwner={isOwner}
            currentPage={paginatedHistory.metadata.page}
            totalPages={paginatedHistory.metadata.totalPages}
            emptyMessage={
              hasActiveFilters
                ? "Tidak ada transaksi yang cocok dengan filter yang dipilih."
                : "Belum ada transaksi."
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}