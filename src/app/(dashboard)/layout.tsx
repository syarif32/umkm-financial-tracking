import { requireUser } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard tetap aman dan dipertahankan.
  const { profile } = await requireUser();

  return (
    <div className="flex min-h-svh bg-zinc-50/50">
      <Sidebar role={profile.role} />
      {/* pb-16 ditambahkan agar konten halaman tidak tertutup Bottom Navigation di HP */}
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <Header name={profile.full_name} role={profile.role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}