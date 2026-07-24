-- Step 5: Customer WhatsApp number on transactions (for digital receipts).
-- Purely additive — no existing table is recreated, no historical row is
-- rewritten. customer_phone is nullable, so every existing transaction is
-- valid immediately with customer_phone = NULL.

alter table public.transactions add column customer_phone text;

comment on column public.transactions.customer_phone is
  'Optional customer WhatsApp number (normalized to 62XXXXXXXXXX, no plus
   sign), captured at sale time so a digital receipt can later be shared via
   a wa.me link. No customer table — this is the only place it is stored.';

-- Loose sanity check only (normalization/validation happens in the app);
-- keeps obviously-garbage values out without risking false rejections.
alter table public.transactions
  add constraint customer_phone_length check (
    customer_phone is null or char_length(customer_phone) between 8 and 20
  );

-- Extend create_sale_transaction to accept and store the customer's number.
-- Adding a parameter with a default at the end keeps this backward
-- compatible with any existing caller that omits it.
-- Adding a parameter changes the function's signature, so `create or replace`
-- alone would leave the old 3-arg version sitting alongside the new one.
-- Drop it explicitly first to avoid two overloads of the same function.
drop function if exists public.create_sale_transaction(uuid, text, jsonb);

create or replace function public.create_sale_transaction(
  p_payment_method_id uuid,
  p_notes text,
  p_items jsonb, -- array of { "menu_id": uuid, "quantity": int }
  p_customer_phone text default null
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

  insert into public.transactions
    (type, status, user_id, payment_method_id, total_amount, notes, customer_phone)
  values
    ('INCOME', 'COMPLETED', auth.uid(), p_payment_method_id, v_total,
     nullif(btrim(p_notes), ''), nullif(btrim(p_customer_phone), ''))
  returning * into v_transaction;

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

grant execute on function public.create_sale_transaction(uuid, text, jsonb, text) to authenticated;
