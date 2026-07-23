"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListPlus, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Beranda", // Disederhanakan dari Dashboard
    icon: LayoutDashboard,
    roles: ["OWNER", "KARYAWAN"],
  },
  {
    href: "/dashboard/transactions",
    label: "Kasir", // Disederhanakan dari Transaksi untuk kejelasan aksi
    icon: ListPlus,
    roles: ["OWNER", "KARYAWAN"],
  },
  {
    href: "/dashboard/master-data",
    label: "Data Master",
    icon: Package,
    roles: ["OWNER"],
  },
  {
    href: "/dashboard/users",
    label: "Karyawan",
    icon: Users,
    roles: ["OWNER"],
  },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden w-56 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="px-6 py-6 border-b">
          <span className="text-lg font-bold tracking-tight">Sistem UMKM</span>
        </div>
        <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground font-medium hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background pb-safe pt-1 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] md:hidden">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-full flex-1 flex-col items-center justify-center gap-1"
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full p-1.5 transition-colors",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[10px]",
                  isActive ? "text-primary font-bold" : "text-muted-foreground font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}