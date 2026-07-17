-- Keep every open staff dashboard synchronized with order changes.
do $$
declare table_name text;
begin
  foreach table_name in array array['orders','filament_inventory','profiles','vertex_payroll_plan','announcements','staff_messages','staff_message_recipients','seasonal_discounts','promo_codes'] loop
    if to_regclass('public.' || table_name) is not null and not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
