create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'received' check (status in ('received', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20)
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

insert into public.products (slug, name, category, description, price, stock) values
  ('fone-pulse', 'Fone Pulse', 'Áudio', 'Som imersivo, sem distrações.', 349.90, 25),
  ('smartwatch-move', 'Smartwatch Move', 'Bem-estar', 'Seu dia, no seu ritmo.', 589.00, 18),
  ('caixa-beat', 'Caixa Beat', 'Som', 'A trilha sonora vai com você.', 269.90, 32),
  ('celular-neo', 'Celular Neo', 'Mobile', 'Potência para ir mais longe.', 1899.00, 12)
on conflict (slug) do nothing;

create or replace function public.create_store_order(
  p_customer_name text,
  p_customer_email text,
  p_items jsonb
)
returns table(order_id uuid, total numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_order_id uuid := gen_random_uuid();
  computed_total numeric(10,2) := 0;
  item_record record;
  product_record public.products%rowtype;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_items';
  end if;

  -- Lock products in a stable order to prevent overselling and reduce deadlocks.
  for item_record in
    select (entry->>'product_id')::uuid as product_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) entry
    group by (entry->>'product_id')::uuid
    order by (entry->>'product_id')::uuid
  loop
    select * into product_record from public.products p
    where p.id = item_record.product_id and p.active = true
    for update;
    if not found then raise exception 'product_unavailable'; end if;
    if product_record.stock < item_record.quantity then raise exception 'insufficient_stock'; end if;
    computed_total := computed_total + product_record.price * item_record.quantity;
  end loop;

  insert into public.orders(id, customer_name, customer_email, total)
  values (new_order_id, trim(p_customer_name), lower(trim(p_customer_email)), computed_total);

  for item_record in
    select (entry->>'product_id')::uuid as product_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) entry
    group by (entry->>'product_id')::uuid
  loop
    select * into product_record from public.products where id = item_record.product_id;
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity)
    values (new_order_id, product_record.id, product_record.name, product_record.price, item_record.quantity);
    update public.products set stock = stock - item_record.quantity where id = item_record.product_id;
  end loop;

  return query select new_order_id, computed_total;
end;
$$;

revoke all on function public.create_store_order(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order(text, text, jsonb) to service_role;
