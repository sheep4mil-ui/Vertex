-- Add private shipping addresses to orders. Run once in Supabase SQL Editor.
alter table public.orders add column if not exists shipping_address text;

drop function if exists public.submit_order(text,text,text,text,text,integer,text,text);
create or replace function public.submit_order(p_customer_name text,p_customer_email text,p_customer_phone text,p_shipping_address text,p_update_preference text,p_material text,p_quantity integer,p_details text,p_model_url text)
returns text language plpgsql security definer set search_path=public as $$
declare new_code text; new_id uuid;
begin
  if length(trim(p_customer_name))<2 or p_customer_email !~* '^[^@]+@[^@]+\.[^@]+$' or length(trim(p_details))<3 or p_quantity<1 or p_quantity>100 or length(coalesce(p_shipping_address,''))>500 or (nullif(trim(p_model_url),'') is not null and p_model_url !~* '^https://') then raise exception 'Invalid order information'; end if;
  insert into public.orders(customer_name,customer_email,customer_phone,shipping_address,update_preference,material,quantity,details,model_url)
  values(trim(p_customer_name),lower(trim(p_customer_email)),nullif(trim(p_customer_phone),''),nullif(trim(p_shipping_address),''),p_update_preference,p_material,p_quantity,trim(p_details),nullif(trim(p_model_url),'')) returning id,tracking_code into new_id,new_code;
  insert into public.order_updates(order_id,status,public_message) values(new_id,'requested','Your quote request was received.');
  return new_code;
end; $$;

revoke all on function public.submit_order(text,text,text,text,text,text,integer,text,text) from public;
grant execute on function public.submit_order(text,text,text,text,text,text,integer,text,text) to anon,authenticated;
