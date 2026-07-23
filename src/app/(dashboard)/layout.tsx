import { requireUser } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    // UBAH BARIS INI: Gunakan h-[100dvh] dan overflow-hidden
    <div className="flex h-[100dvh] w-full overflow-hidden bg-zinc-50/50 relative">
      <Sidebar role={profile.role} />
      
      {/* pb-16 untuk memberikan ruang navigasi mobile */}
      <div className="flex min-w-0 flex-1 flex-col h-full pb-16 md:pb-0">
        <Header name={profile.full_name} role={profile.role} />
        
        {/* Hanya area ini yang bisa di-scroll */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}