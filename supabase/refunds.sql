-- Refund tracking only. Administrators still return money through the original
-- payment method, then mark the request processed.
create type public.refund_status as enum ('requested','approved','denied','processed');

create table public.refund_requests (
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

create policy "staff read refunds" on public.refund_requests for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level is not null));
create policy "admins manage refunds" on public.refund_requests for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.level='admin'));

create or replace function public.request_refund(p_tracking_code text,p_customer_email text,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare order_row public.orders; new_id uuid;
begin
  select * into order_row from public.orders where tracking_code=upper(trim(p_tracking_code)) and customer_email=lower(trim(p_customer_email));
  if order_row.id is null or order_row.status <> 'completed' or order_row.quoted_cents is null then raise exception 'Completed order not found'; end if;
  if length(trim(p_reason))<5 then raise exception 'Please provide a refund reason'; end if;
  insert into public.refund_requests(order_id,tracking_code,requested_cents,reason)
  values(order_row.id,order_row.tracking_code,order_row.quoted_cents,trim(p_reason)) returning id into new_id;
  return new_id;
end; $$;
revoke all on function public.request_refund(text,text,text) from public;
grant execute on function public.request_refund(text,text,text) to anon,authenticated;

alter table public.completed_order_finance add column if not exists refunded_cents integer not null default 0 check (refunded_cents >= 0);
create or replace function public.apply_processed_refund() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='processed' and old.status is distinct from 'processed' then
    if new.approved_cents is null then raise exception 'Set the approved refund amount first'; end if;
    new.processed_at=now();
    update public.completed_order_finance set refunded_cents=refunded_cents+new.approved_cents where tracking_code=new.tracking_code;
  end if;
  return new;
end; $$;
create trigger apply_processed_refund before update on public.refund_requests for each row execute function public.apply_processed_refund();
