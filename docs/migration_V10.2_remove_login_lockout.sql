-- 慢慢计划 V10.2 数据库迁移：移除连续登录失败 5 次锁定 10 分钟的机制。
-- 在 Supabase SQL Editor 中一次性执行本文件。
-- 此迁移保留 planner_login / planner_get_data / planner_put_data 的接口与密码校验。

create or replace function public.planner_check_password(p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $check_password$
declare
  v_valid boolean;
begin
  if p_username is distinct from 'oooo' or p_password is null or length(p_password) > 200 then
    return false;
  end if;

  select exists (
    select 1
    from public.planner_credentials c
    where c.username = p_username
      and extensions.crypt(p_password, c.password_hash) = c.password_hash
  ) into v_valid;

  return coalesce(v_valid, false);
end;
$check_password$;

-- 该表仅用于旧版失败次数/锁定时间统计；新函数不再依赖它。
drop table if exists public.planner_login_attempts;

revoke all on function public.planner_check_password(text, text) from public, anon, authenticated;
revoke all on function public.planner_login(text, text), public.planner_get_data(text, text), public.planner_put_data(text, text, jsonb) from public;
grant execute on function public.planner_login(text, text), public.planner_get_data(text, text), public.planner_put_data(text, text, jsonb) to anon, authenticated;
