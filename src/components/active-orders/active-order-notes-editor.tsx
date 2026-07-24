"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateActiveOrderNotesAction } from "@/actions/active-order-actions";

export function ActiveOrderNotesEditor({
  activeOrderId,
  initialNotes,
}: {
  activeOrderId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateActiveOrderNotesAction({ id: activeOrderId, notes });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  const isUnchanged = notes === initialNotes;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={isPending}
        maxLength={500}
        placeholder="Contoh: Meja 4, pedas sedang"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={handleSave}
        disabled={isPending || isUnchanged}
      >
        {isPending && <Loader2 className="animate-spin" />}
        Simpan Catatan
      </Button>
    </div>
  );
}
