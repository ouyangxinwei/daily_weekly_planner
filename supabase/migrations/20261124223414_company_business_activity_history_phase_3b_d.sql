begin;
create table public.company_record_activity_history (
 id bigint generated always as identity primary key,
 owner_username text not null references public.planner_credentials(username) on update restrict on delete restrict,
 record_id uuid not null, record_type text not null check(record_type in ('customer','project','task','follow_up')),
 record_title text not null, action text not null check(action in ('created','updated','deleted')),
 changed_fields text[] not null default '{}', occurred_at timestamptz not null default clock_timestamp()
);
create index company_record_activity_owner_record_time_idx on public.company_record_activity_history(owner_username,record_id,occurred_at desc,id desc);
create index company_record_activity_owner_type_time_idx on public.company_record_activity_history(owner_username,record_type,occurred_at desc,id desc);
alter table public.company_record_activity_history enable row level security;
revoke all on table public.company_record_activity_history from public,anon,authenticated,service_role;
create or replace function public.company_list_activity_history(p_username text,p_password text,p_record_id uuid,p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path=''
as $f$
declare v_limit integer:=least(greatest(coalesce(p_limit,100),1),100); v_offset integer:=greatest(coalesce(p_offset,0),0); v_total bigint; v_items jsonb;
begin
 perform public.company_assert_access(p_username,p_password);
 if p_record_id is null then raise exception 'A record id is required' using errcode='22023'; end if;
 if not exists(select 1 from public.company_record_activity_history a where a.owner_username=p_username and a.record_id=p_record_id union all select 1 from public.company_record_status_history h where h.owner_username=p_username and h.record_id=p_record_id) then raise exception 'Record not found' using errcode='P0002'; end if;
 with events as (
  select 'activity-'||a.id::text event_id,a.record_id,a.record_type,a.record_title title,a.action event_type,null::text old_status,null::text new_status,a.changed_fields,a.occurred_at from public.company_record_activity_history a where a.owner_username=p_username and a.record_id=p_record_id
  union all
  select 'status-'||h.id::text,h.record_id,h.record_type,coalesce(r.title,'[deleted record]'),'status_changed',h.old_status,h.new_status,array['status']::text[],h.changed_at from public.company_record_status_history h left join public.company_records r on r.id=h.record_id and r.owner_username=h.owner_username where h.owner_username=p_username and h.record_id=p_record_id
 ) select count(*) into v_total from events;
 with events as (
  select 'activity-'||a.id::text event_id,a.record_id,a.record_type,a.record_title title,a.action event_type,null::text old_status,null::text new_status,a.changed_fields,a.occurred_at from public.company_record_activity_history a where a.owner_username=p_username and a.record_id=p_record_id
  union all
  select 'status-'||h.id::text,h.record_id,h.record_type,coalesce(r.title,'[deleted record]'),'status_changed',h.old_status,h.new_status,array['status']::text[],h.changed_at from public.company_record_status_history h left join public.company_records r on r.id=h.record_id and r.owner_username=h.owner_username where h.owner_username=p_username and h.record_id=p_record_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('event_id',p.event_id,'record_id',p.record_id,'record_type',p.record_type,'title',p.title,'event_type',p.event_type,'old_status',p.old_status,'new_status',p.new_status,'changed_fields',p.changed_fields,'occurred_at',p.occurred_at) order by p.occurred_at desc,p.event_id desc),'[]'::jsonb) into v_items from (select * from events order by occurred_at desc,event_id desc limit v_limit offset v_offset) p;
 return jsonb_build_object('items',v_items,'total',v_total,'limit',v_limit,'offset',v_offset);
end;$f$;
revoke all on function public.company_list_activity_history(text,text,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.company_list_activity_history(text,text,uuid,integer,integer) to service_role;
commit;