import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { transactionService } from "@/services/transaction-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "@/components/transactions/receipt";
import { ReceiptActions } from "@/components/transactions/receipt-actions";
import { VoidTransactionDialog } from "@/components/transactions/void-transaction-dialog";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireUser();
  const isOwner = currentUser.profile.role === "OWNER";

  const supabase = await createClient();
  // Returns null both when the transaction doesn't exist and when RLS blocks
  // it (a Karyawan requesting someone else's transaction) — either way the
  // right response is a 404, never a raw error that would confirm the ID
  // belongs to someone.
  const transaction = await transactionService.getTransactionDetail(supabase, id);

  if (!transaction) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/transactions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              Detail Transaksi #{transaction.id.slice(0, 8).toUpperCase()}
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant={transaction.type === "INCOME" ? "success" : "secondary"}>
                {transaction.type === "INCOME" ? "Penjualan" : "Pengeluaran"}
              </Badge>
              <Badge variant={transaction.status === "COMPLETED" ? "success" : "destructive"}>
                {transaction.status === "COMPLETED" ? "Selesai" : "Dibatalkan"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Owner-only, server-enforced: voidTransactionAction re-checks
            requireOwner() itself, so this button being hidden for Karyawan
            is a convenience, not the actual access boundary. */}
        {isOwner && transaction.status === "COMPLETED" && (
          <VoidTransactionDialog transactionId={transaction.id} />
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <Receipt transaction={transaction} />
        <ReceiptActions transaction={transaction} />
      </div>
    </div>
  );
}
