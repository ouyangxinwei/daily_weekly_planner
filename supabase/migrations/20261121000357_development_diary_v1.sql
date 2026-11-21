-- Development Diary V1. The planner uses its existing username/password RPC, not Supabase Auth.
create table if not exists public.diary_entries(
 id uuid primary key default gen_random_uuid(),
 user_id text not null references public.planner_credentials(username) on delete cascade,
 date date not null,
 title text not null check(char_length(btrim(title)) between 1 and 200),
 content text not null default '',
 category text not null default 'other' check(category in('tech','invest','language','life','other')),
 tags text[] not null default '{}'::text[],
 duration_min integer check(duration_min is null or duration_min>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists diary_entries_user_date_idx on public.diary_entries(user_id,date desc,created_at desc);
alter table public.diary_entries enable row level security;
revoke all on public.diary_entries from public,anon,authenticated;

create or replace function public.diary_entries_set_updated_at()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at:=pg_catalog.now();return new;end;$$;
drop trigger if exists diary_entries_set_updated_at on public.diary_entries;
create trigger diary_entries_set_updated_at before update on public.diary_entries for each row execute function public.diary_entries_set_updated_at();

create or replace function public.planner_diary_create(p_username text,p_password text,p_date date,p_title text,p_content text default '',p_category text default 'other',p_tags text[] default '{}',p_duration_min integer default null)
returns setof public.diary_entries language plpgsql security definer set search_path=''
as $$
declare v_tags text[];v_title text:=pg_catalog.btrim(coalesce(p_title,''));
begin
 if not public.planner_check_password(p_username,p_password) then raise exception 'Invalid login credentials';end if;
 if p_date is null then raise exception 'Diary date is required';end if;
 if v_title='' or pg_catalog.char_length(v_title)>200 then raise exception 'Title must contain 1 to 200 characters';end if;
 if p_category not in('tech','invest','language','life','other') then raise exception 'Invalid diary category';end if;
 if p_duration_min is not null and p_duration_min<0 then raise exception 'Duration cannot be negative';end if;
 select coalesce(pg_catalog.array_agg(tag order by tag),'{}'::text[]) into v_tags
 from(select distinct pg_catalog.btrim(value) as tag from pg_catalog.unnest(coalesce(p_tags,'{}'::text[])) as value where pg_catalog.btrim(value)<>'') cleaned;
 if pg_catalog.cardinality(v_tags)>5 then raise exception 'A maximum of 5 tags is allowed';end if;
 return query insert into public.diary_entries(user_id,date,title,content,category,tags,duration_min)
 values(p_username,p_date,v_title,coalesce(p_content,''),p_category,v_tags,p_duration_min) returning *;
end;$$;

create or replace function public.planner_diary_update(p_username text,p_password text,p_id uuid,p_date date,p_title text,p_content text default '',p_category text default 'other',p_tags text[] default '{}',p_duration_min integer default null)
returns setof public.diary_entries language plpgsql security definer set search_path=''
as $$
declare v_tags text[];v_title text:=pg_catalog.btrim(coalesce(p_title,''));
begin
 if not public.planner_check_password(p_username,p_password) then raise exception 'Invalid login credentials';end if;
 if p_id is null or p_date is null then raise exception 'Diary ID and date are required';end if;
 if v_title='' or pg_catalog.char_length(v_title)>200 then raise exception 'Title must contain 1 to 200 characters';end if;
 if p_category not in('tech','invest','language','life','other') then raise exception 'Invalid diary category';end if;
 if p_duration_min is not null and p_duration_min<0 then raise exception 'Duration cannot be negative';end if;
 select coalesce(pg_catalog.array_agg(tag order by tag),'{}'::text[]) into v_tags
 from(select distinct pg_catalog.btrim(value) as tag from pg_catalog.unnest(coalesce(p_tags,'{}'::text[])) as value where pg_catalog.btrim(value)<>'') cleaned;
 if pg_catalog.cardinality(v_tags)>5 then raise exception 'A maximum of 5 tags is allowed';end if;
 return query update public.diary_entries e set date=p_date,title=v_title,content=coalesce(p_content,''),category=p_category,tags=v_tags,duration_min=p_duration_min where e.id=p_id and e.user_id=p_username returning e.*;
end;$$;

create or replace function public.planner_diary_delete(p_username text,p_password text,p_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ declare v_deleted boolean:=false;begin
 if not public.planner_check_password(p_username,p_password) then raise exception 'Invalid login credentials';end if;
 delete from public.diary_entries e where e.id=p_id and e.user_id=p_username;v_deleted:=found;return v_deleted;
end;$$;

create or replace function public.planner_diary_list_day(p_username text,p_password text,p_date date)
returns setof public.diary_entries language plpgsql security definer set search_path=''
as $$ begin
 if not public.planner_check_password(p_username,p_password) then raise exception 'Invalid login credentials';end if;
 if p_date is null then raise exception 'Diary date is required';end if;
 return query select e.* from public.diary_entries e where e.user_id=p_username and e.date=p_date order by e.created_at desc;
end;$$;

create or replace function public.planner_diary_list_week(p_username text,p_password text,p_week_start date,p_week_end date)
returns setof public.diary_entries language plpgsql security definer set search_path=''
as $$ begin
 if not public.planner_check_password(p_username,p_password) then raise exception 'Invalid login credentials';end if;
 if p_week_start is null or p_week_end is null or p_week_end<p_week_start or p_week_end-p_week_start>6 then raise exception 'Invalid diary week range';end if;
 return query select e.* from public.diary_entries e where e.user_id=p_username and e.date between p_week_start and p_week_end order by e.date desc,e.created_at desc;
end;$$;

create or replace function public.planner_diary_search(p_username text,p_password text,p_keyword text,p_category text default null)
returns setof public.diary_entries language plpgsql security definer set search_path=''
as $$ declare v_keyword text:=pg_catalog.lower(pg_catalog.btrim(coalesce(p_keyword,'')));begin
 if not public.planner_check_password(p_username,p_password) then raise exception 'Invalid login credentials';end if;
 if v_keyword='' then raise exception 'Search keyword is required';end if;
 if p_category is not null and p_category not in('tech','invest','language','life','other') then raise exception 'Invalid diary category';end if;
 return query select e.* from public.diary_entries e where e.user_id=p_username and(p_category is null or e.category=p_category)
 and pg_catalog.strpos(pg_catalog.lower(e.title||' '||coalesce(e.content,' ')||' '||pg_catalog.array_to_string(e.tags,' ')),v_keyword)>0
 order by e.date desc,e.created_at desc limit 50;
end;$$;

revoke all on function public.planner_diary_create(text,text,date,text,text,text,text[],integer) from public;
revoke all on function public.planner_diary_update(text,text,uuid,date,text,text,text,text[],integer) from public;
revoke all on function public.planner_diary_delete(text,text,uuid) from public;
revoke all on function public.planner_diary_list_day(text,text,date) from public;
revoke all on function public.planner_diary_list_week(text,text,date,date) from public;
revoke all on function public.planner_diary_search(text,text,text,text) from public;
grant execute on function public.planner_diary_create(text,text,date,text,text,text,text[],integer) to anon,authenticated;
grant execute on function public.planner_diary_update(text,text,uuid,date,text,text,text,text[],integer) to anon,authenticated;
grant execute on function public.planner_diary_delete(text,text,uuid) to anon,authenticated;
grant execute on function public.planner_diary_list_day(text,text,date) to anon,authenticated;
grant execute on function public.planner_diary_list_week(text,text,date,date) to anon,authenticated;
grant execute on function public.planner_diary_search(text,text,text,text) to anon,authenticated;
