-- V10.71: private cloud storage for the learning meetings module.
-- Same pattern as V10.68 repository_cloud_data: one JSON snapshot row per planner account,
-- no direct table access, every call re-verifies the existing planner credentials,
-- and only company-api (service_role) may execute the functions.
create table if not exists public.learning_meetings_data (
  username text primary key references public.planner_credentials(username) on delete cascade,
  meetings jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint learning_meetings_data_array check (jsonb_typeof(meetings) = 'array'),
  constraint learning_meetings_data_count check (case when jsonb_typeof(meetings) = 'array' then jsonb_array_length(meetings) <= 1000 else false end)
);

alter table public.learning_meetings_data enable row level security;
revoke all on public.learning_meetings_data from public, anon, authenticated;

create or replace function public.learning_meetings_get_data(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_result jsonb;
begin
  if not public.company_verify_credentials(p_username, p_password) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;

  select jsonb_build_object('meetings', meetings, 'updated_at', updated_at)
    into v_result
    from public.learning_meetings_data
   where username = p_username;
  return v_result;
end;
$function$;

create or replace function public.learning_meetings_put_data(
  p_username text,
  p_password text,
  p_meetings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_updated_at timestamptz := now();
begin
  if not public.company_verify_credentials(p_username, p_password) then
    raise exception 'Invalid credentials' using errcode = '28000';
  end if;
  if p_meetings is null
     or jsonb_typeof(p_meetings) <> 'array'
     or jsonb_array_length(p_meetings) > 1000 then
    raise exception 'Invalid learning meetings snapshot' using errcode = '22023';
  end if;

  insert into public.learning_meetings_data(username, meetings, updated_at)
  values (p_username, p_meetings, v_updated_at)
  on conflict (username) do update
    set meetings = excluded.meetings,
        updated_at = excluded.updated_at;
  return jsonb_build_object('saved', true, 'updated_at', v_updated_at);
end;
$function$;

revoke all on function public.learning_meetings_get_data(text, text) from public, anon, authenticated;
revoke all on function public.learning_meetings_put_data(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.learning_meetings_get_data(text, text) to service_role;
grant execute on function public.learning_meetings_put_data(text, text, jsonb) to service_role;
