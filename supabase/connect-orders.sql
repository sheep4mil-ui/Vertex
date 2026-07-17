-- Safe to run again after schema.sql. This connects public quote and tracking forms
-- without exposing private orders to anonymous reads.
alter table public.orders add column if not exists model_url text check (model_url is null or model_url ~* '^https://');
alter table public.orders add column if not exists shipping_address text;
drop function if exists public.submit_order(text,text,text,text,text,integer,text);
drop function if exists public.submit_order(text,text,text,text,text,integer,text,text);
create or replace function public.submit_order(p_customer_name text,p_customer_email text,p_customer_phone text,p_shipping_address text,p_update_preference text,p_material text,p_quantity integer,p_details text,p_model_url text)
returns text language plpgsql security definer set search_path=public as $$
declare new_code text; new_id uuid;
begin
  if length(trim(p_customer_name))<2 or p_customer_email !~* '^[^@]+@[^@]+\.[^@]+$' or length(trim(p_details))<3 or p_quantity<1 or p_quantity>100 or (nullif(trim(p_model_url),'') is not null and p_model_url !~* '^https://') then raise exception 'Invalid order information'; end if;
  insert into public.orders(customer_name,customer_email,customer_phone,shipping_address,update_preference,material,quantity,details,model_url)
  values(trim(p_customer_name),lower(trim(p_customer_email)),nullif(trim(p_customer_phone),''),nullif(trim(p_shipping_address),''),p_update_preference,p_material,p_quantity,trim(p_details),nullif(trim(p_model_url),''))
  returning id,tracking_code into new_id,new_code;
  insert into public.order_updates(order_id,status,public_message) values(new_id,'requested','Your quote request was received.');
  return new_code;
end; $$;

create or replace function public.track_order(p_tracking_code text,p_customer_email text)
returns table(tracking_code text,status public.order_status,public_message text,updated_at timestamptz)
language sql security definer set search_path=public as $$
  select o.tracking_code,o.status,coalesce((select u.public_message from public.order_updates u where u.order_id=o.id order by u.created_at desc limit 1),'Order received.'),o.updated_at
  from public.orders o where o.tracking_code=upper(trim(p_tracking_code)) and o.customer_email=lower(trim(p_customer_email));
$$;
revoke all on function public.submit_order(text,text,text,text,text,text,integer,text,text) from public;
revoke all on function public.track_order(text,text) from public;
grant execute on function public.submit_order(text,text,text,text,text,text,integer,text,text) to anon,authenticated;
grant execute on function public.track_order(text,text) to anon,authenticated;
