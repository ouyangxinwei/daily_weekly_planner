-- V10.68: private cloud storage for the GitHub repository management module.
-- Access is exclusively through company-api after existing oooo credential verification.
create table if not exists public.repository_cloud_data (
  username text primary key references public.planner_credentials(username) on delete cascade,
  repositories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint repository_cloud_data_array check (jsonb_typeof(repositories) = 'array'),
  constraint repository_cloud_data_count check (case when jsonb_typeof(repositories) = 'array' then jsonb_array_length(repositories) <= 1000 else false end)
);

alter table public.repository_cloud_data enable row level security;
revoke all on public.repository_cloud_data from public, anon, authenticated;

create or replace function public.repository_get_data(p_username text, p_password text)
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

  select jsonb_build_object('repositories', repositories, 'updated_at', updated_at)
    into v_result
    from public.repository_cloud_data
   where username = p_username;
  return v_result;
end;
$function$;

create or replace function public.repository_put_data(
  p_username text,
  p_password text,
  p_repositories jsonb
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
  if p_repositories is null
     or jsonb_typeof(p_repositories) <> 'array'
     or jsonb_array_length(p_repositories) > 1000 then
    raise exception 'Invalid repository snapshot' using errcode = '22023';
  end if;

  insert into public.repository_cloud_data(username, repositories, updated_at)
  values (p_username, p_repositories, v_updated_at)
  on conflict (username) do update
    set repositories = excluded.repositories,
        updated_at = excluded.updated_at;
  return jsonb_build_object('saved', true, 'updated_at', v_updated_at);
end;
$function$;

revoke all on function public.repository_get_data(text, text) from public, anon, authenticated;
revoke all on function public.repository_put_data(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.repository_get_data(text, text) to service_role;
grant execute on function public.repository_put_data(text, text, jsonb) to service_role;
