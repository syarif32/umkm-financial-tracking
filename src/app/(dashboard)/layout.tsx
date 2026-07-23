import { requireUser } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: redirects to /login if there's no valid session.
  // (middleware.ts already redirects unauthenticated requests, this is the
  // defense-in-depth check at the layout/data-access level.)
  const { profile } = await requireUser();

  return (
    <div className="flex min-h-svh">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header name={profile.full_name} role={profile.role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
