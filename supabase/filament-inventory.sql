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
create policy "admins manage filament inventory" on public.filament_inventory for all to authenticated using (public.current_vertex_staff_level()='admin') with check (public.current_vertex_staff_level()='admin');
notify pgrst, 'reload schema';
