-- Connect customer-entered promo codes to quote requests.
-- Run this entire file once in the Supabase SQL Editor.

alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists promo_percent_off smallint
  check (promo_percent_off between 1 and 100);

drop function if exists public.submit_order(text,text,text,text,text,text,integer,text,text);
drop function if exists public.submit_order(text,text,text,text,text,text,integer,text,text,text);

create function public.submit_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_update_preference text,
  p_material text,
  p_quantity integer,
  p_details text,
  p_model_url text,
  p_promo_code text
)
returns text language plpgsql security definer set search_path=public as $$
declare
  new_code text;
  new_id uuid;
  normalized_promo text := nullif(upper(trim(p_promo_code)), '');
  promo_percent smallint;
begin
  if length(trim(p_customer_name)) < 2
     or p_customer_email !~* '^[^@]+@[^@]+\.[^@]+$'
     or length(trim(p_details)) < 3
     or p_quantity < 1 or p_quantity > 100
     or (nullif(trim(p_model_url), '') is not null and p_model_url !~* '^https://') then
    raise exception 'Invalid order information';
  end if;

  if normalized_promo is not null then
    select percent_off into promo_percent
    from public.promo_codes
    where code = normalized_promo
      and active
      and expires_at >= now()
      and (max_uses is null or times_used < max_uses)
    for update;

    if promo_percent is null then
      raise exception 'That discount code is invalid, expired, or has reached its use limit';
    end if;

    update public.promo_codes
    set times_used = times_used + 1
    where code = normalized_promo;
  end if;

  insert into public.orders(
    customer_name, customer_email, customer_phone, shipping_address,
    update_preference, material, quantity, details, model_url,
    promo_code, promo_percent_off
  ) values (
    trim(p_customer_name), lower(trim(p_customer_email)), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_shipping_address), ''), p_update_preference, p_material,
    p_quantity, trim(p_details), nullif(trim(p_model_url), ''),
    normalized_promo, promo_percent
  ) returning id, tracking_code into new_id, new_code;

  insert into public.order_updates(order_id, status, public_message)
  values (new_id, 'requested',
    case when normalized_promo is null then 'Your quote request was received.'
         else 'Your quote request and discount code were received.' end);
  return new_code;
end;
$$;

revoke all on function public.submit_order(text,text,text,text,text,text,integer,text,text,text) from public;
grant execute on function public.submit_order(text,text,text,text,text,text,integer,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
