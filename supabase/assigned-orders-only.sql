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
notify pgrst, 'reload schema';
