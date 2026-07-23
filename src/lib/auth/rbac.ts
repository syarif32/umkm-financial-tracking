import "server-only";
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
 * Returns null if there is no authenticated session or no matching profile row.
 *
 * Always re-validates against Supabase Auth server-side (auth.getUser()) rather
 * than trusting any client-supplied role — this is the source of truth for RBAC.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
}

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

/**
 * Requires an authenticated user whose role is included in `allowedRoles`.
 * Redirects to /login if unauthenticated, or to /dashboard if authenticated
 * but not authorized — never throws raw errors to the UI.
 *
 * Use this at the top of Server Actions and role-restricted pages, e.g.:
 *   await requireRole(["OWNER"]);
 */
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
