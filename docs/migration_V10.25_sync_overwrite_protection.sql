-- V10.25: return server-side snapshot revision and per-module sync timestamps.
-- No table schema changes. Legacy snapshots fall back to planner_cloud_data.updated_at.
create or replace function public.planner_get_data(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $get_data$
declare
  v_data jsonb;
  v_updated_at timestamptz;
  v_modules jsonb;
begin
  if not public.planner_check_password(p_username, p_password) then
    raise exception 'Invalid login credentials';
  end if;

  select data, updated_at
    into v_data, v_updated_at
    from public.planner_cloud_data
   where username = p_username;

  if v_data is null then
    return null;
  end if;

  v_modules := jsonb_build_object(
    'plan', coalesce(nullif(v_data #>> '{_syncMeta,modules,plan}', '')::timestamptz, v_updated_at),
    'work', coalesce(nullif(v_data #>> '{_syncMeta,modules,work}', '')::timestamptz, v_updated_at),
    'language', coalesce(nullif(v_data #>> '{_syncMeta,modules,language}', '')::timestamptz, v_updated_at),
    'organize', coalesce(nullif(v_data #>> '{_syncMeta,modules,organize}', '')::timestamptz, v_updated_at),
    'results', coalesce(nullif(v_data #>> '{_syncMeta,modules,results}', '')::timestamptz, v_updated_at),
    'future', coalesce(nullif(v_data #>> '{_syncMeta,modules,future}', '')::timestamptz, v_updated_at)
  );

  return jsonb_set(
    v_data,
    '{_syncMeta}',
    jsonb_build_object('updatedAt', v_updated_at, 'modules', v_modules),
    true
  );
end;
$get_data$;
