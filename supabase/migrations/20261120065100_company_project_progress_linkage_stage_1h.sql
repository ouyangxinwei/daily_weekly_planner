-- Stage 1-H: keep automatic project progress synchronized with linked tasks.
-- A project remains in manual mode unless data.progress_mode is explicitly "auto".
-- Automatic progress is the rounded percentage of tasks whose status is "completed".

create or replace function public.company_recalculate_project_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_owner_username text;
  v_project_ids uuid[];
  v_project_id uuid;
  v_project_data jsonb;
  v_total integer;
  v_completed integer;
  v_progress integer;
  v_manual_progress integer;
begin
  if TG_ARGV[0] = 'task' then
    if TG_OP = 'DELETE' then
      v_owner_username := OLD.owner_username;
      v_project_ids := array[OLD.parent_record_id];
    elsif TG_OP = 'UPDATE' then
      v_owner_username := NEW.owner_username;
      v_project_ids := array[OLD.parent_record_id, NEW.parent_record_id];
    else
      v_owner_username := NEW.owner_username;
      v_project_ids := array[NEW.parent_record_id];
    end if;
  elsif TG_ARGV[0] = 'project' then
    v_owner_username := NEW.owner_username;
    v_project_ids := array[NEW.id];
  else
    return null;
  end if;

  -- Lock affected projects in a stable order to avoid concurrent task updates
  -- leaving a stale aggregate or deadlocking when a task is moved.
  for v_project_id in
    select distinct candidate.project_id
    from unnest(v_project_ids) as candidate(project_id)
    where candidate.project_id is not null
    order by candidate.project_id
  loop
    perform 1
    from public.company_records project
    where project.id = v_project_id
      and project.owner_username = v_owner_username
      and project.record_type = 'project'
    for update;

    if not found then
      continue;
    end if;

    select project.data
      into v_project_data
    from public.company_records project
    where project.id = v_project_id
      and project.owner_username = v_owner_username
      and project.record_type = 'project';

    if coalesce(v_project_data->>'progress_mode', 'manual') = 'auto' then
      select
        count(*)::integer,
        count(*) filter (where task.status = 'completed')::integer
      into v_total, v_completed
      from public.company_records task
      where task.owner_username = v_owner_username
        and task.record_type = 'task'
        and task.parent_record_id = v_project_id;

      v_progress := case
        when v_total = 0 then 0
        else round((v_completed::numeric * 100) / v_total)::integer
      end;

      update public.company_records project
      set data = jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(project.data, '{}'::jsonb),
            '{progress_percent}', to_jsonb(v_progress), true),
          '{progress_task_total}', to_jsonb(v_total), true),
        '{progress_task_completed}', to_jsonb(v_completed), true),
        updated_at = now()
      where project.id = v_project_id
        and project.owner_username = v_owner_username
        and project.record_type = 'project';
    elsif TG_ARGV[0] = 'project'
      and coalesce(v_project_data->>'progress_mode', 'manual') = 'manual'
      and OLD.data->>'progress_mode' = 'auto' then
      v_manual_progress := coalesce(
        nullif(v_project_data->>'manual_progress_percent', '')::integer,
        nullif(v_project_data->>'progress_percent', '')::integer,
        0
      );
      update public.company_records project
      set data = jsonb_set(coalesce(project.data, '{}'::jsonb),
        '{progress_percent}', to_jsonb(v_manual_progress), true),
        updated_at = now()
      where project.id = v_project_id
        and project.owner_username = v_owner_username
        and project.record_type = 'project';
    end if;
  end loop;

  return null;
end;
$function$;

revoke all on function public.company_recalculate_project_progress() from public;
revoke all on function public.company_recalculate_project_progress() from anon, authenticated;

drop trigger if exists company_task_progress_after_insert on public.company_records;
create trigger company_task_progress_after_insert
after insert on public.company_records
for each row
when (new.record_type = 'task')
execute function public.company_recalculate_project_progress('task');

drop trigger if exists company_task_progress_after_update on public.company_records;
create trigger company_task_progress_after_update
after update of record_type, parent_record_id, status on public.company_records
for each row
when (old.record_type = 'task' or new.record_type = 'task')
execute function public.company_recalculate_project_progress('task');

drop trigger if exists company_task_progress_after_delete on public.company_records;
create trigger company_task_progress_after_delete
after delete on public.company_records
for each row
when (old.record_type = 'task')
execute function public.company_recalculate_project_progress('task');

drop trigger if exists company_project_progress_after_insert on public.company_records;
create trigger company_project_progress_after_insert
after insert on public.company_records
for each row
when (new.record_type = 'project' and new.data->>'progress_mode' = 'auto')
execute function public.company_recalculate_project_progress('project');

drop trigger if exists company_project_progress_mode_after_update on public.company_records;
create trigger company_project_progress_mode_after_update
after update of data on public.company_records
for each row
when (
  old.record_type = 'project'
  and new.record_type = 'project'
  and old.data->>'progress_mode' is distinct from new.data->>'progress_mode'
)
execute function public.company_recalculate_project_progress('project');
