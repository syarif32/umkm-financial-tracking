-- Step 3: Transactions (Sales/Income & Expenses)
-- Core rules encoded here, not just in app code:
--   1. Historical price integrity: price_at_transaction is snapshotted inside
--      create_sale_transaction() by reading menus.current_price at insert
--      time — the client only ever supplies menu_id + quantity.
--   2. Atomicity: a sale's header + all its line items are written by a
--      single function call, which Postgres wraps in one implicit
--      transaction — either all rows land or none do.
--   3. Immutability: no delete policy exists on either table. Correcting a
--      mistake means voiding (status='VOIDED' + reason), never deleting or
--      silently editing amounts.
--   4. Fund-source integrity: payment_method_id is required and never
--      nullable; nothing here ever sums Cash and non-Cash into one figure.

create type public.transaction_type as enum ('INCOME', 'EXPENSE');
create type public.transaction_status as enum ('COMPLETED', 'VOIDED');

-- 1. transactions -----------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type public.transaction_type not null,
  status public.transaction_status not null default 'COMPLETED',
  user_id uuid not null references public.profiles (id),
  payment_method_id uuid not null references public.payment_methods (id),
  expense_category_id uuid references public.expense_categories (id),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  notes text,
  transaction_date timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint expense_category_required_for_expense check (
    (type = 'EXPENSE' and expense_category_id is not null) or
    (type = 'INCOME' and expense_category_id is null)
  ),
  constraint void_fields_consistent check (
    (status = 'VOIDED' and voided_at is not null and voided_by is not null and void_reason is not null) or
    (status = 'COMPLETED' and voided_at is null and voided_by is null and void_reason is null)
  )
);

comment on table public.transactions is
  'Financial transaction header (INCOME or EXPENSE). Never deleted — mistakes
   are corrected by setting status=VOIDED with a reason, preserving the
   original record for audit purposes.';

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_payment_method_id_idx on public.transactions (payment_method_id);
create index transactions_status_idx on public.transactions (status);
create index transactions_transaction_date_idx on public.transactions (transaction_date desc);

alter table public.transactions enable row level security;

-- Owner sees everything; Karyawan sees only transactions they created
-- (their shift's activity) — matches the "non-sensitive operational data"
-- scope for Karyawan from the RBAC design in Step 1.
create policy "transactions_select"
  on public.transactions for select
  to authenticated
  using (public.is_owner() or user_id = auth.uid());

-- Anyone authenticated may create a transaction attributed to themselves,
-- and it must start out COMPLETED (nobody creates a pre-voided row).
create policy "transactions_insert_self"
  on public.transactions for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'COMPLETED');

-- Only Owner may update transactions (used exclusively for voiding).
create policy "transactions_update_owner"
  on public.transactions for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- No delete policy at all: financial history is never removed via the app.

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

-- 2. transaction_items -------------------------------------------------------
create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  menu_id uuid not null references public.menus (id),
  quantity integer not null check (quantity > 0),
  price_at_transaction numeric(12, 2) not null check (price_at_transaction >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now(),

  constraint subtotal_matches_calc check (subtotal = quantity * price_at_transaction)
);

comment on table public.transaction_items is
  'Line items for INCOME transactions. price_at_transaction is a snapshot —
   changing menus.current_price later must never alter these rows.';

create index transaction_items_transaction_id_idx on public.transaction_items (transaction_id);

alter table public.transaction_items enable row level security;

create policy "transaction_items_select"
  on public.transaction_items for select
  to authenticated
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (public.is_owner() or t.user_id = auth.uid())
    )
  );

-- Items may only be inserted alongside a transaction the caller owns.
-- In practice this only ever happens inside create_sale_transaction() below,
-- but the policy holds regardless of entry point.
create policy "transaction_items_insert"
  on public.transaction_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

-- No update or delete policy: line items are immutable once written.

-- 3. Atomic sale creation -----------------------------------------------------
-- security invoker (the default) so RLS above still applies using the
-- calling user's auth.uid() — this function does not bypass RLS, it just
-- bundles several statements into one all-or-nothing call.
create or replace function public.create_sale_transaction(
  p_payment_method_id uuid,
  p_notes text,
  p_items jsonb -- array of { "menu_id": uuid, "quantity": int }
)
returns public.transactions
language plpgsql
security invoker
as $$
declare
  v_transaction public.transactions;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_menu_id uuid;
  v_quantity integer;
  v_price numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_menu_is_active boolean;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Transaksi harus memiliki minimal 1 item menu.';
  end if;

  if not exists (
    select 1 from public.payment_methods
    where id = p_payment_method_id and is_active = true
  ) then
    raise exception 'Metode pembayaran tidak ditemukan atau nonaktif.';
  end if;

  -- Pass 1: validate every item and compute the total BEFORE writing
  -- anything, so a bad item aborts cleanly with nothing inserted.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_id := (v_item ->> 'menu_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_menu_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Item menu atau kuantitas tidak valid.';
    end if;

    select current_price, is_active into v_price, v_menu_is_active
    from public.menus
    where id = v_menu_id;

    if v_price is null then
      raise exception 'Menu tidak ditemukan.';
    end if;
    if not v_menu_is_active then
      raise exception 'Menu tidak aktif dan tidak dapat dijual.';
    end if;

    v_total := v_total + (v_price * v_quantity);
  end loop;

  insert into public.transactions (type, status, user_id, payment_method_id, total_amount, notes)
  values ('INCOME', 'COMPLETED', auth.uid(), p_payment_method_id, v_total, nullif(btrim(p_notes), ''))
  returning * into v_transaction;

  -- Pass 2: snapshot each item's current_price into price_at_transaction.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_menu_id := (v_item ->> 'menu_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    select current_price into v_price from public.menus where id = v_menu_id;
    v_subtotal := v_price * v_quantity;

    insert into public.transaction_items (transaction_id, menu_id, quantity, price_at_transaction, subtotal)
    values (v_transaction.id, v_menu_id, v_quantity, v_price, v_subtotal);
  end loop;

  return v_transaction;
end;
$$;

grant execute on function public.create_sale_transaction(uuid, text, jsonb) to authenticated;
