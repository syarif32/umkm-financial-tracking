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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Identitas Aplikasi untuk Layar Mobile */}
      <div className="flex items-center">
        <span className="text-base font-bold md:hidden">Kopyok</span>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{ROLE_LABEL[role]}</p>
        </div>
        <form action={signOutAction}>
          <Button 
            type="submit" 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-muted-foreground hover:bg-red-50 hover:text-red-600" 
            title="Keluar"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </header>
  );
}