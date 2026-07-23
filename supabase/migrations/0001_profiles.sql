-- Step 1: Foundational auth + RBAC schema
-- Creates the `profiles` table (1:1 with auth.users), the OWNER/KARYAWAN role
-- enum, row-level security policies, and a trigger that auto-provisions a
-- profile row whenever a new user signs up via Supabase Auth.

-- 1. Role enum -----------------------------------------------------------
create type public.user_role as enum ('OWNER', 'KARYAWAN');

-- 2. profiles table -------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'KARYAWAN',
  full_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'App-level user profile: role (OWNER/KARYAWAN) and display name. One row per auth.users row.';

-- 3. Enable RLS -------------------------------------------------------------
alter table public.profiles enable row level security;

-- Any authenticated user may read profiles (needed for role checks, and for
-- Owners to list Karyawan). No sensitive financial data lives here.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Users may update their own profile's full_name only — never their own role.
-- Role changes must go through an Owner-only Server Action using the service
-- role / an explicit Owner-authorized update policy below.
create policy "profiles_update_own_name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Owners may update any profile (e.g. change a Karyawan's role or name).
create policy "profiles_update_owner"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'OWNER'
    )
  );

-- Only Owners may insert profiles directly (normal signup uses the trigger
-- below via the SECURITY DEFINER function, which bypasses RLS).
create policy "profiles_insert_owner"
  on public.profiles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'OWNER'
    )
  );

-- Only Owners may delete profiles.
create policy "profiles_delete_owner"
  on public.profiles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'OWNER'
    )
  );

-- 4. Auto-provision a profile row on signup --------------------------------
-- New signups default to KARYAWAN. Promote the first Owner manually via the
-- Supabase SQL editor: update public.profiles set role = 'OWNER' where id = '<uuid>';
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'KARYAWAN'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
