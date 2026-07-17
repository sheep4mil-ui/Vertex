-- Shared staff filament inventory. Run once in Supabase SQL Editor.
create table if not exists public.filament_inventory (
  id uuid primary key default gen_random_uuid(),
  material text not null check (length(trim(material)) between 2 and 30),
  color text not null check (length(trim(color)) between 1 and 50),
  spool_count numeric(8,2) not null default 0 check (spool_count >= 0),
  grams_available integer not null default 0 check (grams_available >= 0),
  in_stock boolean not null default true,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.filament_inventory enable row level security;
drop policy if exists "staff read filament inventory" on public.filament_inventory;
create policy "staff read filament inventory" on public.filament_inventory for select to authenticated using (public.current_vertex_staff_level() is not null);
drop policy if exists "admins manage filament inventory" on public.filament_inventory;
create policy "admins manage filament inventory" on public.filament_inventory for all to authenticated
using (public.current_vertex_staff_level() in ('admin','printer') or exists(select 1 from public.profiles p where p.id=auth.uid() and 'printer'=any(p.employee_roles)))
with check (public.current_vertex_staff_level() in ('admin','printer') or exists(select 1 from public.profiles p where p.id=auth.uid() and 'printer'=any(p.employee_roles)));

create or replace function public.get_public_filament_inventory()
returns table(material text, color text)
language sql stable security definer set search_path=public
as $$ select f.material,f.color from public.filament_inventory f where f.in_stock and f.grams_available>0 order by f.material,f.color $$;
revoke all on function public.get_public_filament_inventory() from public;
grant execute on function public.get_public_filament_inventory() to anon,authenticated;
notify pgrst, 'reload schema';
