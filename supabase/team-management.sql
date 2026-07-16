-- Real administrator Team management. Run once in Supabase SQL Editor.
alter type public.staff_level add value if not exists 'modeler' before 'printer';

create or replace function public.get_vertex_team()
returns table(
  id uuid,
  email text,
  level public.staff_level,
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
  select p.id,p.email,p.level,p.employee_discount_percent,p.active
  from public.profiles p
  where p.level is distinct from 'admin'::public.staff_level
  order by p.email;
end; $$;

create or replace function public.update_vertex_employee(
  p_employee_id uuid,
  p_level text,
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
  if p_level not in ('handout','order_taker','modeler','printer','social_management') then
    raise exception 'Invalid employee role';
  end if;
  if p_discount < 0 or p_discount > 100 then
    raise exception 'Invalid employee discount';
  end if;
  update public.profiles
  set level=p_level::public.staff_level,
      employee_discount_percent=p_discount,
      active=p_active
  where id=p_employee_id and level is distinct from 'admin'::public.staff_level;
  if not found then raise exception 'Employee was not found'; end if;
end; $$;

revoke all on function public.get_vertex_team() from public;
revoke all on function public.update_vertex_employee(uuid,text,smallint,boolean) from public;
grant execute on function public.get_vertex_team() to authenticated;
grant execute on function public.update_vertex_employee(uuid,text,smallint,boolean) to authenticated;
