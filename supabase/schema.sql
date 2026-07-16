-- Run in the Supabase SQL editor after a parent-managed project is created.
create type public.staff_level as enum ('handout', 'order_taker', 'printer', 'social_management', 'admin');
create type public.order_status as enum ('requested', 'quoted', 'approved', 'printing', 'ready', 'shipped', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  level public.staff_level,
  employee_number text unique check (employee_number ~ '^[0-9]{4}$'),
  employee_discount_percent smallint not null default 0 check (employee_discount_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique default ('VTX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  update_preference text not null check (update_preference in ('email', 'text', 'both')),
  material text,
  quantity integer not null default 1 check (quantity > 0),
  details text not null,
  status public.order_status not null default 'requested',
  completed_at timestamptz,
  assigned_to uuid references public.profiles(id),
  quoted_cents integer check (quoted_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_updates (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  public_message text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.seasonal_discounts (
  id bigint generated always as identity primary key,
  name text not null,
  percent_off smallint not null check (percent_off between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.promo_codes (
  id bigint generated always as identity primary key,
  code text not null unique check (code = upper(code) and length(code) between 3 and 20),
  percent_off smallint not null check (percent_off between 1 and 100),
  expires_at timestamptz not null,
  max_uses integer check (max_uses is null or max_uses > 0),
  times_used integer not null default 0 check (times_used >= 0),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_updates enable row level security;
alter table public.seasonal_discounts enable row level security;
alter table public.promo_codes enable row level security;

-- Staff can see their own profile. Admins can manage all profiles.
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated
using ((select level from public.profiles where id = auth.uid()) = 'admin')
with check ((select level from public.profiles where id = auth.uid()) = 'admin');

-- Approved staff may read assigned work. Order takers, printers, social
-- management, and admins may update order workflow information.
create policy "active staff read orders" on public.orders for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level is not null));
create policy "senior staff update orders" on public.orders for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level in ('order_taker','printer','social_management','admin')));

create policy "everyone reads active discounts" on public.seasonal_discounts for select
using (active and now() between starts_at and ends_at);
create policy "admins manage discounts" on public.seasonal_discounts for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level='admin'));

create policy "admins manage promo codes" on public.promo_codes for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level='admin'));

-- At quote time, use the larger of the active seasonal discount or the
-- verified employee discount. Discounts do not stack by default.

-- Public order creation and tracking should be exposed through rate-limited
-- Supabase Edge Functions, never by granting anonymous table access.
