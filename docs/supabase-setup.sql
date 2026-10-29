-- 慢慢计划 V9：单账号用户名/密码认证与云端数据快照。
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.planner_credentials (
  username text primary key check (username = 'oooo'),
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.planner_login_attempts (
  username text primary key,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);
create table if not exists public.planner_cloud_data (
  username text primary key references public.planner_credentials(username) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_credentials enable row level security;
alter table public.planner_login_attempts enable row level security;
alter table public.planner_cloud_data enable row level security;
revoke all on public.planner_credentials, public.planner_login_attempts, public.planner_cloud_data from public, anon, authenticated;

create or replace function public.planner_check_password(p_username text, p_password text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, extensions as $check_password$
declare v_failed integer; v_locked_until timestamptz; v_valid boolean;
begin
  if p_username is distinct from 'oooo' or p_password is null or length(p_password) > 200 then return false; end if;
  insert into public.planner_login_attempts(username) values (p_username) on conflict (username) do nothing;
  select failed_attempts, locked_until into v_failed, v_locked_until from public.planner_login_attempts where username = p_username for update;
  if v_locked_until is not null and v_locked_until > now() then return false; end if;
  select exists (select 1 from public.planner_credentials c where c.username = p_username and extensions.crypt(p_password, c.password_hash) = c.password_hash) into v_valid;
  if v_valid then
    update public.planner_login_attempts set failed_attempts = 0, locked_until = null where username = p_username;
    return true;
  end if;
  v_failed := coalesce(v_failed, 0) + 1;
  update public.planner_login_attempts set failed_attempts = case when v_failed >= 5 then 0 else v_failed end, locked_until = case when v_failed >= 5 then now() + interval '10 minutes' else null end where username = p_username;
  return false;
end;
$check_password$;

create or replace function public.planner_login(p_username text, p_password text)
returns boolean language sql security definer set search_path = pg_catalog, public as $login$
  select public.planner_check_password(p_username, p_password);
$login$;

create or replace function public.planner_get_data(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $get_data$
declare v_data jsonb;
begin
  if not public.planner_check_password(p_username, p_password) then raise exception 'Invalid login credentials'; end if;
  select data into v_data from public.planner_cloud_data where username = p_username;
  return v_data;
end;
$get_data$;

create or replace function public.planner_put_data(p_username text, p_password text, p_data jsonb)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $put_data$
begin
  if not public.planner_check_password(p_username, p_password) then raise exception 'Invalid login credentials'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or coalesce(p_data->>'schemaVersion', '') <> '1' or jsonb_typeof(p_data->'plans') <> 'array' or jsonb_typeof(p_data->'completions') <> 'object' then raise exception 'Invalid planner data'; end if;
  insert into public.planner_cloud_data(username, data, updated_at) values (p_username, p_data, now())
  on conflict (username) do update set data = excluded.data, updated_at = excluded.updated_at;
  return true;
end;
$put_data$;

revoke all on function public.planner_check_password(text, text) from public, anon, authenticated;
revoke all on function public.planner_login(text, text), public.planner_get_data(text, text), public.planner_put_data(text, text, jsonb) from public;
grant execute on function public.planner_login(text, text), public.planner_get_data(text, text), public.planner_put_data(text, text, jsonb) to anon, authenticated;

-- 首次设置账号请在 SQL Editor 单独执行：
-- insert into public.planner_credentials(username, password_hash)
-- values ('oooo', extensions.crypt('请替换为你的密码', extensions.gen_salt('bf')))
-- on conflict (username) do update set password_hash = excluded.password_hash;
-- 不要把实际密码写入公开仓库。
