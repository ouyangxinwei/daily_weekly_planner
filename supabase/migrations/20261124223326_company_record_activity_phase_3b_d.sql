begin;
create table public.company_record_activity (
 id bigint generated always as identity primary key,
 owner_username text not null references public.planner_credentials(username) on update restrict on delete restrict,
 record_id uuid not null, record_type text not null check(record_type in ('customer','project','task','follow_up')),
 record_title text not null, action text not null check(action in ('created','updated','deleted')),
 changed_fields text[] not null default '{}', occurred_at timestamptz not null default clock_timestamp()
);
create index company_record_activity_owner_record_time_idx on public.company_record_activity(owner_username,record_id,occurred_at desc,id desc);
create index company_record_activity_owner_type_time_idx on public.company_record_activity(owner_username,record_type,occurred_at desc,id desc);
alter table public.company_record_activity enable row level security;
revoke all on table public.company_record_activity from public,anon,authenticated,service_role;
create or replace function public.company_log_record_activity() returns trigger language plpgsql security definer set search_path=''
as $f$
declare v_fields text[]:='{}'; v_key text;
begin
 if TG_OP='INSERT' then
  if NEW.record_type in ('customer','project','task','follow_up') then insert into public.company_record_activity(owner_username,record_id,record_type,record_title,action) values(NEW.owner_username,NEW.id,NEW.record_type,NEW.title,'created'); end if; return NEW;
 elsif TG_OP='DELETE' then
  if OLD.record_type in ('customer','project','task','follow_up') then insert into public.company_record_activity(owner_username,record_id,record_type,record_title,action) values(OLD.owner_username,OLD.id,OLD.record_type,OLD.title,'deleted'); end if; return OLD;
 end if;
 if NEW.record_type not in ('customer','project','task','follow_up') then return NEW; end if;
 if OLD.title is distinct from NEW.title then v_fields:=array_append(v_fields,'title'); end if;
 if OLD.status is distinct from NEW.status then v_fields:=array_append(v_fields,'status'); end if;
 if OLD.parent_record_id is distinct from NEW.parent_record_id then v_fields:=array_append(v_fields,'parent_record_id'); end if;
 if OLD.due_date is distinct from NEW.due_date then v_fields:=array_append(v_fields,'due_date'); end if;
 for v_key in select k from (select jsonb_object_keys(coalesce(OLD.data,'{}'::jsonb)) k union select jsonb_object_keys(coalesce(NEW.data,'{}'::jsonb)) k) x where (coalesce(OLD.data,'{}'::jsonb)->k) is distinct from (coalesce(NEW.data,'{}'::jsonb)->k) loop v_fields:=array_append(v_fields,'data.'||v_key); end loop;
 if cardinality(v_fields)>0 then insert into public.company_record_activity(owner_username,record_id,record_type,record_title,action,changed_fields) values(NEW.owner_username,NEW.id,NEW.record_type,NEW.title,'updated',v_fields); end if;
 return NEW;
end;$f$;
revoke all on function public.company_log_record_activity() from public,anon,authenticated,service_role;
create trigger company_record_activity_after_insert after insert on public.company_records for each row execute function public.company_log_record_activity();
create trigger company_record_activity_after_update after update on public.company_records for each row execute function public.company_log_record_activity();
create trigger company_record_activity_after_delete after delete on public.company_records for each row execute function public.company_log_record_activity();
commit;