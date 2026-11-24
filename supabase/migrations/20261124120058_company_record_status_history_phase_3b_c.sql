-- Phase 3-B-C: immutable status-change history for project, task and follow-up records.
-- Existing rows are intentionally not backfilled: their historical transition
-- timestamps cannot be reconstructed from updated_at without inventing facts.

begin;

create table public.company_record_status_history (
  id bigint generated always as identity primary key,
  owner_username text not null references public.planner_credentials(username) on update restrict on delete restrict,
  record_id uuid not null references public.company_records(id) on delete cascade,
  record_type text not null check (record_type in ('project', 'task', 'follow_up')),
  old_status text,
  new_status text,
  changed_at timestamptz not null default clock_timestamp(),
  constraint company_record_status_history_status_changed
    check (old_status is distinct from new_status)
);

create index company_record_status_history_owner_record_changed_idx
  on public.company_record_status_history (owner_username, record_id, changed_at desc, id desc);
create index company_record_status_history_owner_type_changed_idx
  on public.company_record_status_history (owner_username, record_type, changed_at desc, id desc);

alter table public.company_record_status_history enable row level security;
revoke all on table public.company_record_status_history from public, anon, authenticated, service_role;

create or replace function public.company_log_record_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if TG_OP = 'INSERT' then
    if NEW.record_type in ('project', 'task', 'follow_up') and NEW.status is not null then
      insert into public.company_record_status_history (
        owner_username, record_id, record_type, old_status, new_status, changed_at
      ) values (
        NEW.owner_username, NEW.id, NEW.record_type, null, NEW.status, clock_timestamp()
      );
    end if;
    return NEW;
  end if;

  if NEW.record_type in ('project', 'task', 'follow_up')
     and OLD.record_type = NEW.record_type
     and OLD.status is distinct from NEW.status then
    insert into public.company_record_status_history (
      owner_username, record_id, record_type, old_status, new_status, changed_at
    ) values (
      NEW.owner_username, NEW.id, NEW.record_type, OLD.status, NEW.status, clock_timestamp()
    );
  end if;
  return NEW;
end;
$function$;

revoke all on function public.company_log_record_status_change() from public, anon, authenticated, service_role;

drop trigger if exists company_record_status_history_after_insert on public.company_records;
create trigger company_record_status_history_after_insert
after insert on public.company_records
for each row
when (NEW.record_type in ('project', 'task', 'follow_up') and NEW.status is not null)
execute function public.company_log_record_status_change();

drop trigger if exists company_record_status_history_after_update on public.company_records;
create trigger company_record_status_history_after_update
after update of status on public.company_records
for each row
when (
  NEW.record_type in ('project', 'task', 'follow_up')
  and OLD.record_type = NEW.record_type
  and OLD.status is distinct from NEW.status
)
execute function public.company_log_record_status_change();

create or replace function public.company_list_status_history(
  p_username text,
  p_password text,
  p_record_id uuid default null,
  p_record_type text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_total bigint;
  v_items jsonb;
  v_record_type text;
begin
  perform public.company_assert_access(p_username, p_password);

  if p_record_id is null and p_record_type is null then
    raise exception 'A record id or record type is required' using errcode = '22023';
  end if;
  if p_record_type is not null and p_record_type not in ('project', 'task', 'follow_up') then
    raise exception 'Invalid status history record type' using errcode = '22023';
  end if;

  if p_record_id is not null then
    select r.record_type into v_record_type
    from public.company_records r
    where r.id = p_record_id and r.owner_username = p_username;
    if not found or v_record_type not in ('project', 'task', 'follow_up') then
      raise exception 'Record not found' using errcode = 'P0002';
    end if;
    if p_record_type is not null and p_record_type <> v_record_type then
      raise exception 'Record not found' using errcode = 'P0002';
    end if;
  end if;

  select count(*) into v_total
  from public.company_record_status_history h
  where h.owner_username = p_username
    and (p_record_id is null or h.record_id = p_record_id)
    and (p_record_type is null or h.record_type = p_record_type);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', page_row.id,
      'record_id', page_row.record_id,
      'record_type', page_row.record_type,
      'title', page_row.title,
      'old_status', page_row.old_status,
      'new_status', page_row.new_status,
      'changed_at', page_row.changed_at
    ) order by page_row.changed_at desc, page_row.id desc
  ), '[]'::jsonb)
  into v_items
  from (
    select h.id, h.record_id, h.record_type, r.title, h.old_status, h.new_status, h.changed_at
    from public.company_record_status_history h
    join public.company_records r
      on r.id = h.record_id and r.owner_username = h.owner_username
    where h.owner_username = p_username
      and (p_record_id is null or h.record_id = p_record_id)
      and (p_record_type is null or h.record_type = p_record_type)
    order by h.changed_at desc, h.id desc
    limit v_limit offset v_offset
  ) as page_row;

  return jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset
  );
end;
$function$;

revoke all on function public.company_list_status_history(text, text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.company_list_status_history(text, text, uuid, text, integer, integer) to service_role;

commit;
