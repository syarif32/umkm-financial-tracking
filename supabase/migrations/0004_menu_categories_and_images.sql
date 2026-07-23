-- Step 3.5: Menu Categories + Menu Images
-- Additive only — does not touch transactions, transaction_items, payment
-- methods, profiles, or existing menus rows beyond backfilling the new
-- category_id column. No historical financial data is affected.

-- 1. menu_categories ---------------------------------------------------------
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.menu_categories is
  'Menu grouping (Makanan, Minuman, Snack, Dessert, Other, ...). Owner-managed.';

alter table public.menu_categories enable row level security;

create policy "menu_categories_select_authenticated"
  on public.menu_categories for select
  to authenticated
  using (true);

create policy "menu_categories_write_owner"
  on public.menu_categories for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create trigger set_menu_categories_updated_at
  before update on public.menu_categories
  for each row execute procedure public.set_updated_at();

insert into public.menu_categories (name, slug) values
  ('Makanan', 'makanan'),
  ('Minuman', 'minuman'),
  ('Snack', 'snack'),
  ('Dessert', 'dessert'),
  ('Other', 'other')
on conflict (slug) do nothing;

-- 2. Extend menus -------------------------------------------------------------
alter table public.menus add column category_id uuid references public.menu_categories (id);
alter table public.menus add column description text;
alter table public.menus add column image_url text;

-- Backfill existing menus to "Other" so category_id can be made mandatory
-- going forward without losing or altering any existing row.
update public.menus
set category_id = (select id from public.menu_categories where slug = 'other')
where category_id is null;

alter table public.menus alter column category_id set not null;

-- Note: transaction_items.menu_id still points at the same menus.id rows —
-- this migration never touches transactions or transaction_items, so every
-- existing price_at_transaction snapshot is completely unaffected.

-- 3. Storage bucket for menu images -------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Public (anonymous) read so <img src="..."> works directly from the bucket's
-- public URL. Writes are Owner-only, mirroring the menus table's own RLS.
create policy "menu_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'menu-images');

create policy "menu_images_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images' and public.is_owner());

create policy "menu_images_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images' and public.is_owner())
  with check (bucket_id = 'menu-images' and public.is_owner());

create policy "menu_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images' and public.is_owner());

-- If your Supabase project role running this migration lacks permission to
-- create policies on storage.objects, create the bucket and these 4 policies
-- manually instead via Dashboard -> Storage -> menu-images -> Policies.
