-- Prevent quotes and assignments until an administrator accepts the order.
-- Run this entire file once in the Supabase SQL Editor.

create or replace function public.enforce_assignment_after_acceptance()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.assigned_to is not null and new.status in ('requested', 'quoted') then
    raise exception 'Accept the order before assigning an employee';
  end if;
  if tg_op = 'UPDATE'
     and old.status in ('requested', 'quoted')
     and new.quoted_cents is distinct from old.quoted_cents then
    raise exception 'Accept the order before saving a quote';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_assignment_after_acceptance on public.orders;
create trigger enforce_assignment_after_acceptance
before insert or update on public.orders
for each row execute function public.enforce_assignment_after_acceptance();
notify pgrst, 'reload schema';
