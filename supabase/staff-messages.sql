-- Private, in-site staff messaging. Run once in the Supabase SQL Editor.

create table if not exists public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles(id),
  subject text not null check (char_length(trim(subject)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.staff_message_recipients (
  message_id uuid not null references public.staff_messages(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id),
  read_at timestamptz,
  primary key (message_id, recipient_id)
);
alter table public.staff_messages enable row level security;
alter table public.staff_message_recipients enable row level security;

create or replace function public.staff_directory()
returns table(id uuid, email text, level public.staff_level)
language sql stable security definer set search_path=public
as $$
  select p.id, p.email, p.level
  from public.profiles p
  where p.active and p.level is not null and p.id <> auth.uid()
  order by 2;
$$;

create or replace function public.send_staff_message(p_recipient_ids uuid[], p_subject text, p_body text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if public.current_vertex_staff_level() is null then raise exception 'Staff access required'; end if;
  if coalesce(array_length(p_recipient_ids,1),0)=0 or length(trim(p_subject))<1 or length(trim(p_body))<1 then raise exception 'Missing message information'; end if;
  insert into public.staff_messages(sender_id,subject,body) values(auth.uid(),trim(p_subject),trim(p_body)) returning id into v_id;
  insert into public.staff_message_recipients(message_id,recipient_id)
  select v_id,p.id from public.profiles p
  where p.id=any(p_recipient_ids) and p.active and p.level is not null and p.id<>auth.uid();
  if not found then raise exception 'No valid recipients'; end if;
  return v_id;
end; $$;

create or replace function public.get_staff_messages()
returns table(message_id uuid, direction text, sender_email text, recipient_emails text[], subject text, body text, created_at timestamptz, read_at timestamptz)
language sql stable security definer set search_path=public
as $$
  select m.id,
    case when m.sender_id=auth.uid() then 'sent' else 'inbox' end,
    s.email,
    array(select rp.email
          from public.staff_message_recipients rr join public.profiles rp on rp.id=rr.recipient_id where rr.message_id=m.id order by 1),
    m.subject,m.body,m.created_at,
    case when m.sender_id=auth.uid() then null else mine.read_at end
  from public.staff_messages m
  join public.profiles s on s.id=m.sender_id
  left join public.staff_message_recipients mine on mine.message_id=m.id and mine.recipient_id=auth.uid()
  where m.sender_id=auth.uid() or mine.recipient_id=auth.uid()
  order by m.created_at desc;
$$;

create or replace function public.mark_staff_message_read(p_message_id uuid)
returns void language sql security definer set search_path=public
as $$ update public.staff_message_recipients set read_at=coalesce(read_at,now()) where message_id=p_message_id and recipient_id=auth.uid(); $$;

revoke all on function public.staff_directory() from public;
revoke all on function public.send_staff_message(uuid[],text,text) from public;
revoke all on function public.get_staff_messages() from public;
revoke all on function public.mark_staff_message_read(uuid) from public;
grant execute on function public.staff_directory(), public.get_staff_messages(), public.mark_staff_message_read(uuid) to authenticated;
grant execute on function public.send_staff_message(uuid[],text,text) to authenticated;
