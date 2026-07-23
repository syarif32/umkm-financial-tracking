import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/utils";
import type { PaymentMethodBalance } from "@/types/dashboard";

export function PaymentMethodBalances({ balances }: { balances: PaymentMethodBalance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo per Metode Pembayaran</CardTitle>
        <p className="text-sm text-muted-foreground">
          Akumulasi sepanjang waktu (tidak dibatasi rentang tanggal) — Cash, QRIS, Bank, dan
          sumber dana lainnya tetap terpisah, tidak digabung.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Pemasukan</TableHead>
                <TableHead className="text-right">Pengeluaran</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Belum ada metode pembayaran.
                  </TableCell>
                </TableRow>
              )}
              {balances.map((b) => (
                <TableRow key={b.payment_method_id}>
                  <TableCell className="font-medium">{b.payment_method_name}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {formatRupiah(b.total_income)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatRupiah(b.total_expense)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      b.balance >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {formatRupiah(b.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
