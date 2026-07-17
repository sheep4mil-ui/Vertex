-- Persistent shared payroll plan. Run once in the Supabase SQL Editor.
create table if not exists public.vertex_payroll_plan (
  singleton boolean primary key default true check (singleton),
  monthly_revenue numeric(12,2) not null default 205 check (monthly_revenue >= 0),
  printer_count integer not null default 2 check (printer_count >= 0),
  handout_count integer not null default 0 check (handout_count >= 0),
  order_taker_count integer not null default 0 check (order_taker_count >= 0),
  modeler_count integer not null default 0 check (modeler_count >= 0),
  social_management_count integer not null default 0 check (social_management_count >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.vertex_payroll_plan enable row level security;
insert into public.vertex_payroll_plan(singleton) values (true) on conflict (singleton) do nothing;

create or replace function public.get_vertex_payroll_plan()
returns table(monthly_revenue numeric, printer_count integer, handout_count integer, order_taker_count integer, modeler_count integer, social_management_count integer)
language plpgsql stable security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then raise exception 'Administrator access required'; end if;
  return query select p.monthly_revenue,p.printer_count,p.handout_count,p.order_taker_count,p.modeler_count,p.social_management_count from public.vertex_payroll_plan p where p.singleton;
end; $$;

create or replace function public.save_vertex_payroll_plan(p_monthly_revenue numeric, p_printer_count integer, p_handout_count integer, p_order_taker_count integer, p_modeler_count integer, p_social_management_count integer)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then raise exception 'Administrator access required'; end if;
  if p_monthly_revenue < 0 or least(p_printer_count,p_handout_count,p_order_taker_count,p_modeler_count,p_social_management_count) < 0 then raise exception 'Revenue and counts cannot be negative'; end if;
  insert into public.vertex_payroll_plan(singleton,monthly_revenue,printer_count,handout_count,order_taker_count,modeler_count,social_management_count,updated_at,updated_by)
  values(true,p_monthly_revenue,p_printer_count,p_handout_count,p_order_taker_count,p_modeler_count,p_social_management_count,now(),auth.uid())
  on conflict(singleton) do update set monthly_revenue=excluded.monthly_revenue,printer_count=excluded.printer_count,handout_count=excluded.handout_count,order_taker_count=excluded.order_taker_count,modeler_count=excluded.modeler_count,social_management_count=excluded.social_management_count,updated_at=now(),updated_by=auth.uid();
end; $$;

revoke all on function public.get_vertex_payroll_plan() from public;
revoke all on function public.save_vertex_payroll_plan(numeric,integer,integer,integer,integer,integer) from public;
grant execute on function public.get_vertex_payroll_plan() to authenticated;
grant execute on function public.save_vertex_payroll_plan(numeric,integer,integer,integer,integer,integer) to authenticated;
