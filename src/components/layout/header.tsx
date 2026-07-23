import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/login/actions";
import type { UserRole } from "@/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: "Owner",
  KARYAWAN: "Karyawan",
};

export function Header({ name, role }: { name: string; role: UserRole }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="icon" title="Keluar">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
