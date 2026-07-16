-- Permanently delete completed orders 24 hours after completion.
-- Related order_updates are removed automatically by ON DELETE CASCADE.

create extension if not exists pg_cron;

alter table public.orders
  add column if not exists completed_at timestamptz;

create table if not exists public.completed_order_finance (
  tracking_code text primary key,
  completed_at timestamptz not null,
  gross_revenue_cents integer not null check (gross_revenue_cents >= 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  archived_at timestamptz not null default now()
);

alter table public.completed_order_finance enable row level security;

create or replace view public.revenue_summary as
select count(*)::integer as completed_orders,
       coalesce(sum(gross_revenue_cents-refunded_cents),0)::bigint as total_net_revenue_cents,
       coalesce(avg(gross_revenue_cents-refunded_cents),0)::numeric(12,2) as average_net_revenue_cents
from public.completed_order_finance;

create or replace view public.revenue_export as
select tracking_code as order_number,
       completed_at::date as date_completed,
       ((gross_revenue_cents-refunded_cents) / 100.0)::numeric(12,2) as money_received
from public.completed_order_finance
order by completed_at;

create or replace function public.set_order_completion_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
    if new.quoted_cents is null then
      raise exception 'Set the final order revenue before completing an order';
    end if;
    insert into public.completed_order_finance(tracking_code, completed_at, gross_revenue_cents)
    values(new.tracking_code, now(), new.quoted_cents)
    on conflict (tracking_code) do update set completed_at=excluded.completed_at, gross_revenue_cents=excluded.gross_revenue_cents;
  elsif new.status is distinct from 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_order_completion_time on public.orders;
create trigger set_order_completion_time
before update on public.orders
for each row execute function public.set_order_completion_time();

-- Re-running this migration updates the existing job instead of duplicating it.
select cron.schedule(
  'vertex-delete-completed-orders',
  '15 * * * *',
  $$delete from public.orders
    where status = 'completed'
      and completed_at <= now() - interval '24 hours'$$
);
