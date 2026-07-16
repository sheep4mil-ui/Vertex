-- Run after schema.sql and admin-auth.sql.
-- Makes staff access role-aware without exposing the private admin allowlist.
create or replace function public.current_vertex_staff_level()
returns public.staff_level
language sql
stable
security definer
set search_path = public
as $$
  select level from public.profiles
  where id = auth.uid() and active = true;
$$;

revoke all on function public.current_vertex_staff_level() from public;
grant execute on function public.current_vertex_staff_level() to authenticated;

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all to authenticated
using (public.current_vertex_staff_level() = 'admin')
with check (public.current_vertex_staff_level() = 'admin');

drop policy if exists "active staff read orders" on public.orders;
create policy "role-aware staff read orders" on public.orders for select to authenticated
using (
  public.current_vertex_staff_level() in ('admin','order_taker','social_management')
  or (
    public.current_vertex_staff_level() in ('handout','modeler','printer')
    and assigned_to = auth.uid()
  )
);

drop policy if exists "senior staff update orders" on public.orders;
create policy "role-aware staff update orders" on public.orders for update to authenticated
using (
  public.current_vertex_staff_level() in ('admin','order_taker','social_management')
  or (public.current_vertex_staff_level() in ('modeler','printer') and assigned_to = auth.uid())
)
with check (
  public.current_vertex_staff_level() in ('admin','order_taker','social_management')
  or (public.current_vertex_staff_level() in ('modeler','printer') and assigned_to = auth.uid())
);
