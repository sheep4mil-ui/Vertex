-- Makes the Payments monthly revenue total come from completed orders.
-- Run once in the Supabase SQL Editor after cleanup-completed-orders.sql.

create or replace function public.get_vertex_payroll_plan()
returns table(
  monthly_revenue numeric,
  printer_count integer,
  handout_count integer,
  order_taker_count integer,
  modeler_count integer,
  social_management_count integer
)
language plpgsql stable security definer set search_path=public
as $$
begin
  if public.current_vertex_staff_level() <> 'admin' then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    (coalesce(sum(f.gross_revenue_cents - f.refunded_cents), 0) / 100.0)::numeric as monthly_revenue,
    p.printer_count,
    p.handout_count,
    p.order_taker_count,
    p.modeler_count,
    p.social_management_count
  from public.vertex_payroll_plan p
  left join public.completed_order_finance f
    on f.completed_at >= date_trunc('month', now())
   and f.completed_at < date_trunc('month', now()) + interval '1 month'
  where p.singleton
  group by p.printer_count, p.handout_count, p.order_taker_count,
           p.modeler_count, p.social_management_count;
end;
$$;

revoke all on function public.get_vertex_payroll_plan() from public;
grant execute on function public.get_vertex_payroll_plan() to authenticated;
notify pgrst, 'reload schema';
