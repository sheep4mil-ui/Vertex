-- Add the Modeler employee role to an existing Vertex database.
alter type public.staff_level add value if not exists 'modeler' before 'printer';

drop policy if exists "role-aware staff read orders" on public.orders;
create policy "role-aware staff read orders" on public.orders for select to authenticated
using (
  public.current_vertex_staff_level() in ('admin','order_taker','social_management')
  or (
    public.current_vertex_staff_level() in ('handout','modeler','printer')
    and assigned_to = auth.uid()
  )
);

drop policy if exists "role-aware staff update orders" on public.orders;
create policy "role-aware staff update orders" on public.orders for update to authenticated
using (
  public.current_vertex_staff_level() in ('admin','order_taker','social_management')
  or (public.current_vertex_staff_level() in ('modeler','printer') and assigned_to = auth.uid())
)
with check (
  public.current_vertex_staff_level() in ('admin','order_taker','social_management')
  or (public.current_vertex_staff_level() in ('modeler','printer') and assigned_to = auth.uid())
);
