-- Employees may only load and update orders explicitly assigned to them.
drop policy if exists "active staff read orders" on public.orders;
drop policy if exists "role-aware staff read orders" on public.orders;
create policy "role-aware staff read orders" on public.orders for select to authenticated using (
  public.current_vertex_staff_level()='admin' or assigned_to=auth.uid()
);

drop policy if exists "senior staff update orders" on public.orders;
drop policy if exists "role-aware staff update orders" on public.orders;
create policy "role-aware staff update orders" on public.orders for update to authenticated
using (public.current_vertex_staff_level()='admin' or assigned_to=auth.uid())
with check (public.current_vertex_staff_level()='admin' or assigned_to=auth.uid());

-- Clear old accidental pre-acceptance assignments and prevent new ones.
update public.orders set assigned_to=null where status in ('requested','quoted') and assigned_to is not null;
create or replace function public.enforce_assignment_after_acceptance()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.assigned_to is not null and new.status in ('requested','quoted') then
    raise exception 'Accept the order before assigning an employee';
  end if;
  return new;
end; $$;
drop trigger if exists enforce_assignment_after_acceptance on public.orders;
create trigger enforce_assignment_after_acceptance before insert or update on public.orders for each row execute function public.enforce_assignment_after_acceptance();
notify pgrst, 'reload schema';
