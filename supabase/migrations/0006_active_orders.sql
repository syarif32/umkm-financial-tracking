-- Step 5.5: Active Orders ("Tagihan Berjalan" / "Tagihan Aktif") — a
-- pre-payment running tab. Lives entirely outside the financial reporting
-- surface: dashboard-service, transactionService.listTransactionHistory,
-- and every balance calculation only ever read `transactions`. Only
-- checkout_active_order() below writes into transactions/transaction_items,
-- and it does so exactly like a normal sale (create_sale_transaction).

create type public.active_order_status as enum ('OPEN', 'PAID', 'CANCELLED');

create sequence public.active_order_number_seq;

create table public.active_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('PSN-' || lpad(nextval('public.active_order_number_seq')::text, 5, '0')),
  status public.active_order_status not null default 'OPEN',
  created_by uuid not null references public.profiles (id),
  notes text,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  transaction_id uuid references public.transactions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint transaction_id_only_when_paid check (
    (status = 'PAID' and transaction_id is not null) or
    (status <> 'PAID' and transaction_id is null)
  )
);

comment on table public.active_orders is
  'Pre-payment running tab ("Tagihan Aktif"). OPEN orders are purely
   operational and must never be read by any financial report — only
   checkout_active_order() converts one into a real transactions row.';

create index active_orders_status_idx on public.active_orders (status);
create index active_orders_created_by_idx on public.active_orders (created_by);

alter table public.active_orders enable row level security;

-- Shared operational board: any authenticated staff member can see every
-- active order (unlike `transactions`, which scopes Karyawan to their own
-- rows) — a running tab needs to be picked up by whichever cashier is at
-- the counter, and the brief explicitly requires cross-device access.
create policy "active_orders_select"
  on public.active_orders for select
  to authenticated
  using (true);

create policy "active_orders_insert"
  on public.active_orders for insert
  to authenticated
  with check (created_by = auth.uid() and status = 'OPEN');

-- Anyone may update an order (edit notes, add items, checkout to PAID) —
-- but only OWNER may set status to CANCELLED, mirroring the void-is-
-- owner-only rule already used for transactions.
create policy "active_orders_update"
  on public.active_orders for update
  to authenticated
  using (true)
  with check (status <> 'CANCELLED' or public.is_owner());

-- No delete policy: even a CANCELLED order stays as a record. It never
-- reaches financial reports (those only ever read `transactions`), so
-- keeping it around is harmless and preserves an audit trail.

create trigger set_active_orders_updated_at
  before update on public.active_orders
  for each row execute procedure public.set_updated_at();

-- active_order_items ----------------------------------------------------
create table public.active_order_items (
  id uuid primary key default gen_random_uuid(),
  active_order_id uuid not null references public.active_orders (id) on delete cascade,
  menu_id uuid not null references public.menus (id),
  menu_name_snapshot text not null,
  price_snapshot numeric(12, 2) not null check (price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint active_order_item_subtotal_matches_calc check (subtotal = quantity * price_snapshot)
);

comment on column public.active_order_items.menu_name_snapshot is
  'Name captured when the item was added to the tab. A later menu rename
   does not change already-added lines — only new lines use the new name.';
comment on column public.active_order_items.price_snapshot is
  'Price captured when the item was added to the tab. A later price change
   on the menu does not change already-added lines. Checkout carries this
   same price forward into transaction_items.price_at_transaction — it does
   not re-price against menus.current_price at payment time.';

create index active_order_items_active_order_id_idx on public.active_order_items (active_order_id);

alter table public.active_order_items enable row level security;

create policy "active_order_items_select"
  on public.active_order_items for select
  to authenticated
  using (true);

-- Items may only be inserted/updated/deleted while the parent order is
-- still OPEN — once PAID or CANCELLED, line items are frozen. This is what
-- makes checkout safe: nothing can mutate an order's items out from under
-- a checkout in progress once it flips to PAID.
create policy "active_order_items_write"
  on public.active_order_items for all
  to authenticated
  using (
    exists (
      select 1 from public.active_orders ao
      where ao.id = active_order_id and ao.status = 'OPEN'
    )
  )
  with check (
    exists (
      select 1 from public.active_orders ao
      where ao.id = active_order_id and ao.status = 'OPEN'
    )
  );

create trigger set_active_order_items_updated_at
  before update on public.active_order_items
  for each row execute procedure public.set_updated_at();

-- Keep active_orders.total_amount in sync with its items automatically,
-- regardless of which code path inserts/updates/deletes an item — a
-- DB-level invariant the app never has to remember to maintain by hand.
create function public.recalculate_active_order_total()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid;
begin
  v_order_id := coalesce(new.active_order_id, old.active_order_id);

  update public.active_orders
  set total_amount = (
    select coalesce(sum(subtotal), 0)
    from public.active_order_items
    where active_order_id = v_order_id
  )
  where id = v_order_id;

  return coalesce(new, old);
end;
$$;

create trigger recalculate_active_order_total_on_item_change
  after insert or update or delete on public.active_order_items
  for each row execute procedure public.recalculate_active_order_total();

-- create_active_order: creates the header and (optionally) its initial
-- items in one atomic call, snapshotting each item's current menu price
-- and name exactly like create_sale_transaction does for real sales.
create or replace function public.create_active_order(
  p_notes text,
  p_items jsonb default '[]'::jsonb -- array of { "menu_id": uuid, "quantity": int }
)
returns public.active_orders
language plpgsql
security invoker
as $$
declare
  v_order public.active_orders;
  v_item jsonb;
  v_menu_id uuid;
  v_quantity integer;
  v_price numeric(12, 2);
  v_name text;
  v_menu_is_active boolean;
begin
  insert into public.active_orders (created_by, notes)
  values (auth.uid(), nullif(btrim(p_notes), ''))
  returning * into v_order;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      v_menu_id := (v_item ->> 'menu_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;

      if v_menu_id is null or v_quantity is null or v_quantity <= 0 then
        raise exception 'Item menu atau kuantitas tidak valid.';
      end if;

      select current_price, name, is_active into v_price, v_name, v_menu_is_active
      from public.menus
      where id = v_menu_id;

      if v_price is null then
        raise exception 'Menu tidak ditemukan.';
      end if;
      if not v_menu_is_active then
        raise exception 'Menu tidak aktif dan tidak dapat ditambahkan.';
      end if;

      insert into public.active_order_items
        (active_order_id, menu_id, menu_name_snapshot, price_snapshot, quantity, subtotal)
      values
        (v_order.id, v_menu_id, v_name, v_price, v_quantity, v_price * v_quantity);
    end loop;
  end if;

  select * into v_order from public.active_orders where id = v_order.id;
  return v_order;
end;
$$;

grant execute on function public.create_active_order(text, jsonb) to authenticated;

-- checkout_active_order: the OPEN -> PAID conversion. Locks the order row
-- (FOR UPDATE) so two people cannot check the same tab out twice at once,
-- validates it's still OPEN and has items, creates the transaction +
-- transaction_items using each item's ALREADY-SNAPSHOTTED price (the price
-- the customer was quoted when the item was added to the tab — checkout
-- does not re-price against menus.current_price), then marks the order PAID.
create or replace function public.checkout_active_order(
  p_active_order_id uuid,
  p_payment_method_id uuid,
  p_notes text,
  p_customer_phone text default null
)
returns public.transactions
language plpgsql
security invoker
as $$
declare
  v_order public.active_orders;
  v_transaction public.transactions;
  v_total numeric(12, 2) := 0;
  v_item record;
  v_item_count integer;
begin
  select * into v_order
  from public.active_orders
  where id = p_active_order_id
  for update;

  if v_order.id is null then
    raise exception 'Pesanan tidak ditemukan.';
  end if;
  if v_order.status <> 'OPEN' then
    raise exception 'Pesanan sudah dibayar atau dibatalkan.';
  end if;

  select count(*), coalesce(sum(subtotal), 0) into v_item_count, v_total
  from public.active_order_items
  where active_order_id = p_active_order_id;

  if v_item_count = 0 then
    raise exception 'Pesanan harus memiliki minimal 1 item sebelum dibayar.';
  end if;

  if not exists (
    select 1 from public.payment_methods
    where id = p_payment_method_id and is_active = true
  ) then
    raise exception 'Metode pembayaran tidak ditemukan atau nonaktif.';
  end if;

  insert into public.transactions
    (type, status, user_id, payment_method_id, total_amount, notes, customer_phone)
  values
    ('INCOME', 'COMPLETED', auth.uid(), p_payment_method_id, v_total,
     nullif(btrim(p_notes), ''), nullif(btrim(p_customer_phone), ''))
  returning * into v_transaction;

  for v_item in
    select menu_id, quantity, price_snapshot, subtotal
    from public.active_order_items
    where active_order_id = p_active_order_id
  loop
    insert into public.transaction_items
      (transaction_id, menu_id, quantity, price_at_transaction, subtotal)
    values
      (v_transaction.id, v_item.menu_id, v_item.quantity, v_item.price_snapshot, v_item.subtotal);
  end loop;

  update public.active_orders
  set status = 'PAID', transaction_id = v_transaction.id
  where id = p_active_order_id;

  return v_transaction;
end;
$$;

grant execute on function public.checkout_active_order(uuid, uuid, text, text) to authenticated;
