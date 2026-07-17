-- Run once in the Supabase SQL Editor to activate the Vertex hiring system.
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('APP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  full_name text not null,
  email text not null,
  phone text,
  age_range text not null,
  school_or_program text,
  roles text[] not null default '{}',
  availability text not null,
  experience text not null,
  skills text not null,
  why_vertex text not null,
  portfolio_url text,
  reference_info text,
  application_pin text not null check (application_pin ~ '^[0-9]{4}$'),
  guardian_permission boolean not null default false,
  status text not null default 'new' check (status in ('new','reviewing','interview','accepted','declined')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_applications enable row level security;
alter table public.job_applications add column if not exists application_pin text;
revoke all on public.job_applications from anon, authenticated;

drop function if exists public.submit_vertex_application(text,text,text,text,text,text[],text,text,text,text,text,text,boolean);
drop function if exists public.submit_vertex_application(text,text,text,text,text,text[],text,text,text,text,text,text,text,boolean);
create or replace function public.submit_vertex_application(
  p_full_name text, p_email text, p_phone text, p_age_range text,
  p_school_or_program text, p_roles text[], p_availability text,
  p_experience text, p_skills text, p_why_vertex text,
  p_portfolio_url text, p_reference_info text, p_application_pin text,
  p_guardian_permission boolean, p_terms_accepted boolean
) returns text
language plpgsql security definer set search_path=public
as $$
declare result_code text;
begin
  if length(trim(p_full_name)) < 2 or length(trim(p_email)) < 5 then raise exception 'Name and email are required'; end if;
  if p_age_range not in ('Under 14','14–15','16–17','18 or older') then raise exception 'Choose a valid age range'; end if;
  if p_application_pin !~ '^[0-9]{4}$' then raise exception 'A four-digit applicant code is required'; end if;
  if not coalesce(p_terms_accepted,false) then raise exception 'Application terms must be accepted'; end if;
  insert into public.job_applications(full_name,email,phone,age_range,school_or_program,roles,availability,experience,skills,why_vertex,portfolio_url,reference_info,application_pin,guardian_permission)
  values(trim(p_full_name),lower(trim(p_email)),nullif(trim(p_phone),''),p_age_range,nullif(trim(p_school_or_program),''),coalesce(p_roles,'{}'),trim(p_availability),trim(p_experience),trim(p_skills),trim(p_why_vertex),nullif(trim(p_portfolio_url),''),nullif(trim(p_reference_info),''),p_application_pin,coalesce(p_guardian_permission,false))
  returning reference_code into result_code;
  return result_code;
end; $$;

create or replace function public.get_vertex_applications()
returns setof public.job_applications
language plpgsql stable security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then raise exception 'Administrator access required'; end if;
  return query select * from public.job_applications order by created_at desc;
end; $$;

create or replace function public.update_vertex_application(p_id uuid, p_status text, p_admin_notes text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then raise exception 'Administrator access required'; end if;
  if p_status not in ('new','reviewing','interview','accepted','declined') then raise exception 'Invalid application status'; end if;
  if p_status in ('accepted','declined') then
    delete from public.job_applications where id=p_id;
    if not found then raise exception 'Application not found'; end if;
    return;
  end if;
  update public.job_applications set status=p_status,admin_notes=coalesce(p_admin_notes,''),updated_at=now() where id=p_id;
  if not found then raise exception 'Application not found'; end if;
end; $$;

revoke all on function public.submit_vertex_application(text,text,text,text,text,text[],text,text,text,text,text,text,text,boolean,boolean) from public;
grant execute on function public.submit_vertex_application(text,text,text,text,text,text[],text,text,text,text,text,text,text,boolean,boolean) to anon, authenticated;
revoke all on function public.get_vertex_applications() from public;
grant execute on function public.get_vertex_applications() to authenticated;
revoke all on function public.update_vertex_application(uuid,text,text) from public;
grant execute on function public.update_vertex_application(uuid,text,text) to authenticated;
