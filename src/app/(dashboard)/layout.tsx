import { requireUser } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard
  const { profile } = await requireUser();

  return (
    // KUNCI 1: Gunakan h-[100dvh] dan overflow-hidden untuk mengunci ukuran layar HP
    <div className="flex h-[100dvh] w-full overflow-hidden bg-zinc-50/50 relative">
      <Sidebar role={profile.role} />
      
      {/* KUNCI 2: pb-24 di mode mobile memberi ruang cukup di bawah agar konten (dan form actions) tidak tertutup nav */}
      <div className="flex min-w-0 flex-1 flex-col h-full pb-24 md:pb-0 relative">
        <Header name={profile.full_name} role={profile.role} />
        
        {/* Hanya area ini yang bisa di-scroll, badan website akan tetap diam */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}