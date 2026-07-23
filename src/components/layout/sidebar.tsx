import Link from "next/link";
import { LayoutDashboard, ListPlus, Package, Users } from "lucide-react";
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
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-background md:flex md:flex-col">
      <div className="px-4 py-5">
        <span className="text-sm font-semibold">UMKM Finance</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
