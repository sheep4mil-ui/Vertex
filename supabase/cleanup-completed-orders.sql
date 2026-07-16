-- Permanently delete completed orders 24 hours after completion.
-- Related order_updates are removed automatically by ON DELETE CASCADE.

create extension if not exists pg_cron;

alter table public.orders
  add column if not exists completed_at timestamptz;

create or replace function public.set_order_completion_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
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
