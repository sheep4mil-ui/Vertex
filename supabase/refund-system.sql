-- Persistent customer refund workflow. Run after cleanup-completed-orders.sql.

alter table public.completed_order_finance
  add column if not exists customer_email text;

create or replace function public.set_order_completion_time()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at = now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
    if new.quoted_cents is null then
      raise exception 'Set the final order revenue before completing an order';
    end if;
    insert into public.completed_order_finance(
      tracking_code, customer_email, completed_at, gross_revenue_cents
    ) values (
      new.tracking_code, lower(new.customer_email), now(), new.quoted_cents
    )
    on conflict (tracking_code) do update set
      customer_email = excluded.customer_email,
      completed_at = excluded.completed_at,
      gross_revenue_cents = excluded.gross_revenue_cents;
  elsif new.status is distinct from 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

do $$ begin
  create type public.refund_status as enum ('requested','approved','denied','processed');
exception when duplicate_object then null;
end $$;

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  tracking_code text not null,
  requested_cents integer not null check (requested_cents > 0),
  approved_cents integer check (approved_cents >= 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.refund_requests enable row level security;

drop policy if exists "staff read refunds" on public.refund_requests;
create policy "staff read refunds" on public.refund_requests for select to authenticated
using (public.current_vertex_staff_level() is not null);
drop policy if exists "admins manage refunds" on public.refund_requests;
create policy "admins manage refunds" on public.refund_requests for update to authenticated
using (public.current_vertex_staff_level() = 'admin')
with check (public.current_vertex_staff_level() = 'admin');

create or replace function public.request_refund(p_tracking_code text,p_customer_email text,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare finance_row public.completed_order_finance; new_id uuid;
begin
  select * into finance_row
  from public.completed_order_finance
  where tracking_code = upper(trim(p_tracking_code))
    and customer_email = lower(trim(p_customer_email));
  if finance_row.tracking_code is null then
    raise exception 'Completed order not found';
  end if;
  if length(trim(p_reason)) < 5 then
    raise exception 'Please provide a refund reason';
  end if;
  if exists(select 1 from public.refund_requests where tracking_code=finance_row.tracking_code and status in ('requested','approved')) then
    raise exception 'A refund request is already being reviewed';
  end if;
  insert into public.refund_requests(tracking_code,requested_cents,reason)
  values(finance_row.tracking_code, greatest(finance_row.gross_revenue_cents-finance_row.refunded_cents,1), trim(p_reason))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.apply_processed_refund()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='processed' and old.status is distinct from 'processed' then
    if new.approved_cents is null then raise exception 'Set the approved refund amount first'; end if;
    if new.approved_cents > new.requested_cents then raise exception 'Refund cannot exceed the remaining order amount'; end if;
    new.processed_at=now();
    update public.completed_order_finance
    set refunded_cents=refunded_cents+new.approved_cents
    where tracking_code=new.tracking_code;
  end if;
  return new;
end;
$$;
drop trigger if exists apply_processed_refund on public.refund_requests;
create trigger apply_processed_refund before update on public.refund_requests
for each row execute function public.apply_processed_refund();

revoke all on function public.request_refund(text,text,text) from public;
grant execute on function public.request_refund(text,text,text) to anon,authenticated;
notify pgrst, 'reload schema';
