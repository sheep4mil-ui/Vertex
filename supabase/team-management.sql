-- Real administrator Team management. Run once in Supabase SQL Editor.
alter type public.staff_level add value if not exists 'modeler' before 'printer';
alter table public.profiles add column if not exists employee_roles public.staff_level[] not null default '{}';
update public.profiles set employee_roles=array[level]
where level is not null and level <> 'admin' and cardinality(employee_roles)=0;

create or replace function public.get_vertex_team()
returns table(
  id uuid,
  email text,
  level public.staff_level,
  employee_roles public.staff_level[],
  employee_discount_percent smallint,
  active boolean
)
language plpgsql stable security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then
    raise exception 'Administrator access required';
  end if;
  return query
  select p.id,p.email,p.level,p.employee_roles,p.employee_discount_percent,p.active
  from public.profiles p
  where p.level is distinct from 'admin'::public.staff_level
  order by p.email;
end; $$;

drop function if exists public.update_vertex_employee(uuid,text,smallint,boolean);
create or replace function public.update_vertex_employee(
  p_employee_id uuid,
  p_roles text[],
  p_discount smallint,
  p_active boolean
)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then
    raise exception 'Administrator access required';
  end if;
  if coalesce(array_length(p_roles,1),0)>5 or exists(
    select 1 from unnest(coalesce(p_roles,'{}')) role
    where role not in ('handout','order_taker','modeler','printer','social_management')
  ) then
    raise exception 'Invalid employee roles';
  end if;
  if p_discount < 0 or p_discount > 100 then
    raise exception 'Invalid employee discount';
  end if;
  update public.profiles
  set employee_roles=coalesce(p_roles,'{}')::public.staff_level[],
      level=case
        when 'social_management'=any(coalesce(p_roles,'{}')) then 'social_management'::public.staff_level
        when 'printer'=any(coalesce(p_roles,'{}')) then 'printer'::public.staff_level
        when 'modeler'=any(coalesce(p_roles,'{}')) then 'modeler'::public.staff_level
        when 'order_taker'=any(coalesce(p_roles,'{}')) then 'order_taker'::public.staff_level
        when 'handout'=any(coalesce(p_roles,'{}')) then 'handout'::public.staff_level
        else null end,
      employee_discount_percent=p_discount,
      active=p_active
  where id=p_employee_id and level is distinct from 'admin'::public.staff_level;
  if not found then raise exception 'Employee was not found'; end if;
end; $$;

revoke all on function public.get_vertex_team() from public;
revoke all on function public.update_vertex_employee(uuid,text[],smallint,boolean) from public;
grant execute on function public.get_vertex_team() to authenticated;
grant execute on function public.update_vertex_employee(uuid,text[],smallint,boolean) to authenticated;
