-- Step 2: Master data (Menus, Payment Methods, Expense Categories)
-- Owner-only writes; readable by any authenticated user (Karyawan needs to
-- read active menus/payment methods when entering transactions in a later step).

-- Shared updated_at trigger helper -----------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Reusable "is the current user an Owner?" check, so RLS policies below
-- don't each repeat the same subquery.
create function public.is_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'OWNER'
  );
$$;

-- 1. Menus -------------------------------------------------------------
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  current_price numeric(12, 2) not null check (current_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.menus is
  'Menu master data. current_price is the live price; transactions must snapshot
   it into transaction_items.price_at_transaction and never read this table for
   historical totals.';

alter table public.menus enable row level security;

create policy "menus_select_authenticated"
  on public.menus for select
  to authenticated
  using (true);

create policy "menus_write_owner"
  on public.menus for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create trigger set_menus_updated_at
  before update on public.menus
  for each row execute procedure public.set_updated_at();

-- 2. Payment methods -----------------------------------------------------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_methods is
  'Payment method / fund source master data (Cash, QRIS, Bank, etc.).
   Deactivating a method must never cascade-delete or alter past transactions
   that reference it — transactions keep their payment_method_id regardless.';

alter table public.payment_methods enable row level security;

create policy "payment_methods_select_authenticated"
  on public.payment_methods for select
  to authenticated
  using (true);

create policy "payment_methods_write_owner"
  on public.payment_methods for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create trigger set_payment_methods_updated_at
  before update on public.payment_methods
  for each row execute procedure public.set_updated_at();

-- 3. Expense categories ----------------------------------------------------
create type public.expense_category_type as enum ('OPERATIONAL', 'INCIDENTAL', 'ROUTINE');

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  type public.expense_category_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expense_categories is
  'Expense category master data, classified as OPERATIONAL, INCIDENTAL, or ROUTINE.';

alter table public.expense_categories enable row level security;

create policy "expense_categories_select_authenticated"
  on public.expense_categories for select
  to authenticated
  using (true);

create policy "expense_categories_write_owner"
  on public.expense_categories for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create trigger set_expense_categories_updated_at
  before update on public.expense_categories
  for each row execute procedure public.set_updated_at();
