import "server-only";
import { cache } from "react"; 
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export interface CurrentUser {
  id: string;
  email: string | undefined;
  profile: Profile;
}

/**
 * Fetches the authenticated user plus their profile (role, name).
 * Wrapped with cache() to deduplicate requests across layout and page.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    profile,
  };
});

/**
 * Requires an authenticated user. Redirects to /login if there is none.
 * Use in Server Components / layouts that guard an entire route subtree.
 */
export async function requireUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  return currentUser;
}

// requireRole dan requireOwner TIDAK PERLU DIUBAH, biarkan seperti semula
export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUser> {
  const currentUser = await requireUser();
  if (!allowedRoles.includes(currentUser.profile.role)) {
    redirect("/dashboard");
  }
  return currentUser;
}

export async function requireOwner(): Promise<CurrentUser> {
  return requireRole(["OWNER"]);
}