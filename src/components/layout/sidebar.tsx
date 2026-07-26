"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListPlus, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "KARYAWAN"],
  },
  {
    href: "/dashboard/transactions",
    label: "Transaksi",
    icon: ListPlus,
    roles: ["OWNER", "KARYAWAN"],
  },
  // Menu "Tagihan Aktif" telah digabung ke dalam "Transaksi"
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
      <aside className="hidden w-56 shrink-0 border-r bg-white md:flex md:flex-col shadow-sm z-10">
        <div className="px-6 py-5 border-b">
          <span className="text-lg font-bold tracking-tight text-gray-800">Sistem UMKM</span>
        </div>
        <nav className="flex flex-1 flex-col gap-2 px-3 py-4 overflow-y-auto">
          {items.map((item) => {
            // Logika active state: exact match untuk dashboard, startsWith untuk sisanya
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-500 font-medium hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-blue-700" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[999] flex h-16 w-full items-center justify-around border-t bg-white pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
      >
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-full flex-1 flex-col items-center justify-center gap-1 mt-1"
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full px-4 py-1 transition-all duration-200",
                  isActive ? "bg-blue-100/80" : "bg-transparent"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5 transition-colors", isActive ? "text-blue-700" : "text-gray-400")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  isActive ? "text-blue-700 font-bold" : "text-gray-500 font-medium"
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