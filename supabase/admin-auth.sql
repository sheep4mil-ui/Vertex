-- Fixed administrator allowlist. Email values are added privately in the
-- Supabase SQL Editor and must never be committed to the public repository.
create schema if not exists private;

create table if not exists private.admin_allowlist (
  email text primary key check (email = lower(trim(email))),
  added_at timestamptz not null default now()
);

create or replace function public.create_vertex_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles(id,email,display_name,level,active)
  values(
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    case when exists(select 1 from private.admin_allowlist a where a.email=lower(new.email)) then 'admin'::public.staff_level else null end,
    case when exists(select 1 from private.admin_allowlist a where a.email=lower(new.email)) then true else false end
  )
  on conflict (id) do update set
    email=excluded.email,
    level=case when exists(select 1 from private.admin_allowlist a where a.email=excluded.email) then 'admin'::public.staff_level else public.profiles.level end,
    active=case when exists(select 1 from private.admin_allowlist a where a.email=excluded.email) then true else public.profiles.active end;
  return new;
end;
$$;

drop trigger if exists create_vertex_profile_after_signup on auth.users;
create trigger create_vertex_profile_after_signup
after insert or update of email on auth.users
for each row execute function public.create_vertex_profile();

-- Apply the allowlist to accounts that may already exist.
insert into public.profiles(id,email,display_name,level,active)
select u.id,lower(u.email),coalesce(u.raw_user_meta_data->>'display_name',split_part(u.email,'@',1)),'admin',true
from auth.users u join private.admin_allowlist a on a.email=lower(u.email)
on conflict (id) do update set level='admin',active=true;
