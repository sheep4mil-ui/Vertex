-- Sends completed-order finance changes to the private Vertex Google Sheet.
-- Before running, replace REPLACE_WITH_YOUR_VERTEX_SECRET with the same
-- VERTEX_SECRET stored in Google Apps Script Project Settings.

create extension if not exists pg_net with schema extensions;
create schema if not exists private;

create table if not exists private.vertex_sheet_sync_config (
  singleton boolean primary key default true check (singleton),
  web_app_url text not null,
  webhook_secret text not null
);
alter table private.vertex_sheet_sync_config enable row level security;

insert into private.vertex_sheet_sync_config(singleton, web_app_url, webhook_secret)
values (
  true,
  'https://script.google.com/macros/s/AKfycbw31hos8T6CpDqlJgYIPaT9IeVREDGGrg6utOGjOwgNv3CS6Ihws9nnePGwKePFCUU/exec',
  'REPLACE_WITH_YOUR_VERTEX_SECRET'
)
on conflict(singleton) do update set
  web_app_url=excluded.web_app_url,
  webhook_secret=excluded.webhook_secret;

create or replace function public.sync_vertex_finance_to_google_sheet()
returns trigger
language plpgsql
security definer
set search_path=public,private,extensions
as $$
declare
  config private.vertex_sheet_sync_config;
  order_row public.orders;
begin
  select * into config
  from private.vertex_sheet_sync_config
  where singleton;

  select * into order_row
  from public.orders
  where tracking_code = new.tracking_code;

  perform net.http_post(
    url := config.web_app_url || '?secret=' || config.webhook_secret,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'tracking_code', new.tracking_code,
        'customer_email', new.customer_email,
        'completed_at', new.completed_at,
        'gross_revenue_cents', new.gross_revenue_cents,
        'refunded_cents', new.refunded_cents,
        'promo_code', order_row.promo_code,
        'promo_percent_off', order_row.promo_percent_off
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists sync_vertex_finance_to_google_sheet
on public.completed_order_finance;
create trigger sync_vertex_finance_to_google_sheet
after insert or update on public.completed_order_finance
for each row execute function public.sync_vertex_finance_to_google_sheet();

-- Send existing archived rows once. The Apps Script de-duplicates by tracking code.
update public.completed_order_finance
set archived_at = archived_at;
