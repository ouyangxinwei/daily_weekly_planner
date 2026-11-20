begin;

create table public.company_api_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.company_api_rate_limits enable row level security;
revoke all on table public.company_api_rate_limits from public, anon, authenticated, service_role;

create or replace function public.company_consume_ip_rate_limit(
  p_ip_hash text,
  p_max_requests integer default 30,
  p_window_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
  v_started_at timestamptz;
  v_allowed boolean;
  v_retry_after integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'
     or p_max_requests < 1 or p_max_requests > 300
     or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.company_api_rate_limits(ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update
    set request_count = case
          when public.company_api_rate_limits.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
          then 1
          else public.company_api_rate_limits.request_count + 1
        end,
        window_started_at = case
          when public.company_api_rate_limits.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
          then now()
          else public.company_api_rate_limits.window_started_at
        end,
        updated_at = now()
  returning request_count, window_started_at
  into v_count, v_started_at;

  v_allowed := v_count <= p_max_requests;
  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (v_started_at + make_interval(secs => p_window_seconds) - now())))::integer
  );

  if mod(hashtext(p_ip_hash)::bigint, 100) = 0 then
    delete from public.company_api_rate_limits
    where updated_at < now() - interval '1 day';
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'remaining', greatest(0, p_max_requests - v_count),
    'retry_after', case when v_allowed then 0 else v_retry_after end
  );
end;
$function$;

revoke all on function public.company_consume_ip_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.company_consume_ip_rate_limit(text, integer, integer)
  to service_role;

commit;