"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransactionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged client-side only — no sensitive data, just for local debugging.
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <CardTitle>Gagal memuat data transaksi</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Terjadi kesalahan saat memuat halaman ini. Silakan coba lagi.
        </p>
        <Button onClick={reset} className="self-start">
          Coba Lagi
        </Button>
      </CardContent>
    </Card>
  );
}
