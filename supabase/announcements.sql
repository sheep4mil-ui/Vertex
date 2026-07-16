-- Run once in the Supabase SQL Editor after staff-access.sql.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(trim(subject)) between 3 and 120),
  message text not null check (char_length(trim(message)) between 3 and 4000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "staff read announcements" on public.announcements;
create policy "staff read announcements" on public.announcements
for select to authenticated
using (public.current_vertex_staff_level() is not null);

drop policy if exists "admins create announcements" on public.announcements;
create policy "admins create announcements" on public.announcements
for insert to authenticated
with check (public.current_vertex_staff_level() = 'admin' and created_by = auth.uid());

drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements
for update to authenticated
using (public.current_vertex_staff_level() = 'admin')
with check (public.current_vertex_staff_level() = 'admin');

drop policy if exists "admins delete announcements" on public.announcements;
create policy "admins delete announcements" on public.announcements
for delete to authenticated
using (public.current_vertex_staff_level() = 'admin');
