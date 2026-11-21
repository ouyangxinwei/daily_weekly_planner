create table if not exists public.diary_entries(
 id uuid primary key default gen_random_uuid(),
 owner_username text not null references public.planner_credentials(username) on delete cascade,
 date date not null,title text not null check(char_length(btrim(title)) between 1 and 200),
 content text not null default '' check(char_length(content)<=10000),
 category text not null default 'other' check(category in('tech','invest','language','life','other')),
 tags text[] not null default '{}'::text[] check(cardinality(tags)<=5),
 duration_min integer check(duration_min is null or duration_min between 0 and 1440),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists diary_entries_owner_date_idx on public.diary_entries(owner_username,date desc,created_at desc);
alter table public.diary_entries enable row level security;
revoke all on public.diary_entries from public,anon,authenticated;
create or replace function public.diary_touch_updated_at() returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at:=now();return new;end; $$;
create trigger diary_entries_touch before update on public.diary_entries for each row execute function public.diary_touch_updated_at();
create or replace function public.diary_api(p_username text,p_password text,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid;v_row public.diary_entries%rowtype;v_out jsonb;v_start date;v_end date;v_date date;v_title text;v_cat text;v_tags text[];v_duration int;v_kw text;
begin
 if p_username is null or p_password is null or not public.planner_check_password(p_username,p_password) then raise exception 'Invalid diary credentials' using errcode='28000';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid payload' using errcode='22023';end if;
 if p_action='list_week' then
  v_start:=(p_payload->>'week_start')::date;v_end:=(p_payload->>'week_end')::date;
  if v_end<v_start or v_end-v_start>6 then raise exception 'Invalid week' using errcode='22023';end if;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.date desc,e.created_at desc),'[]'::jsonb) into v_out from public.diary_entries e where e.owner_username=p_username and e.date between v_start and v_end;return v_out;
 elsif p_action='list_day' then
  v_date:=(p_payload->>'date')::date;select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) into v_out from public.diary_entries e where e.owner_username=p_username and e.date=v_date;return v_out;
 elsif p_action='search' then
  v_kw:=lower(btrim(coalesce(p_payload->>'keyword','')));if char_length(v_kw)<1 or char_length(v_kw)>100 then raise exception 'Invalid keyword' using errcode='22023';end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.date desc,q.created_at desc),'[]'::jsonb) into v_out from(select e.* from public.diary_entries e where e.owner_username=p_username and(position(v_kw in lower(e.title))>0 or position(v_kw in lower(e.content))>0 or exists(select 1 from unnest(e.tags) z where position(v_kw in lower(z))>0)) order by e.date desc,e.created_at desc limit 50)q;return v_out;
 elsif p_action in('create','update') then
  v_title:=btrim(coalesce(p_payload->>'title',''));if v_title='' or char_length(v_title)>200 then raise exception 'Invalid title' using errcode='22023';end if;
  v_date:=coalesce(nullif(p_payload->>'date','')::date,current_date);v_cat:=coalesce(nullif(p_payload->>'category',''),'other');
  if v_cat not in('tech','invest','language','life','other') then raise exception 'Invalid category' using errcode='22023';end if;
  select coalesce(array_agg(distinct btrim(z)),'{}'::text[]) into v_tags from jsonb_array_elements_text(coalesce(p_payload->'tags','[]'::jsonb)) z where btrim(z)<>'';
  if cardinality(v_tags)>5 then raise exception 'Too many tags' using errcode='22023';end if;
  v_duration:=nullif(p_payload->>'duration_min','')::int;if v_duration is not null and(v_duration<0 or v_duration>1440) then raise exception 'Invalid duration' using errcode='22023';end if;
  if p_action='create' then insert into public.diary_entries(owner_username,date,title,content,category,tags,duration_min) values(p_username,v_date,v_title,coalesce(p_payload->>'content',''),v_cat,v_tags,v_duration) returning * into v_row;
  else v_id:=(p_payload->>'id')::uuid;update public.diary_entries e set date=v_date,title=v_title,content=coalesce(p_payload->>'content',''),category=v_cat,tags=v_tags,duration_min=v_duration where e.id=v_id and e.owner_username=p_username returning * into v_row;if not found then raise exception 'Diary entry not found' using errcode='P0002';end if;end if;return to_jsonb(v_row);
 elsif p_action='delete' then v_id:=(p_payload->>'id')::uuid;delete from public.diary_entries e where e.id=v_id and e.owner_username=p_username returning e.id into v_id;if v_id is null then raise exception 'Diary entry not found' using errcode='P0002';end if;return jsonb_build_object('deleted',true,'id',v_id);
 else raise exception 'Unsupported action' using errcode='22023';end if;
end;$$;
revoke all on function public.diary_api(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.diary_api(text,text,text,jsonb) to anon,authenticated;
revoke all on function public.diary_touch_updated_at() from public,anon,authenticated;
