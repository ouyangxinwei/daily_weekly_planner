-- Stage 1-B: company records and restricted database RPCs.
-- This migration is intentionally isolated from planner snapshot/auth RPCs.

begin;

create table public.company_records (
  id uuid primary key default gen_random_uuid(),
  owner_username text not null references public.planner_credentials(username) on update restrict on delete restrict,
  record_type text not null check (record_type in (
    'customer', 'project', 'task', 'follow_up', 'transaction', 'document', 'file'
  )),
  business_type text check (business_type is null or business_type in ('trade', 'software', 'ecommerce')),
  title text not null check (length(btrim(title)) between 1 and 300),
  status text,
  parent_record_id uuid references public.company_records(id) on delete restrict,
  related_record_ids uuid[] not null default '{}'::uuid[],
  amount numeric(20,6),
  currency text check (currency is null or currency in ('JPY', 'CNY', 'USD')),
  record_date timestamptz,
  due_date timestamptz,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  schema_version smallint not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_records_amount_currency_pair check (
    (amount is null and currency is null) or (amount is not null and currency is not null)
  ),
  constraint company_records_transaction_amount check (
    record_type <> 'transaction' or (amount is not null and currency is not null)
  ),
  constraint company_records_no_self_parent check (
    parent_record_id is null or parent_record_id <> id
  )
);

create index company_records_owner_type_created_idx
  on public.company_records (owner_username, record_type, created_at desc);
create index company_records_owner_business_date_idx
  on public.company_records (owner_username, business_type, record_date desc);
create index company_records_parent_record_idx
  on public.company_records (parent_record_id);

alter table public.company_records enable row level security;
revoke all on table public.company_records from public, anon, authenticated, service_role;

-- Internal authorization and relation validation. Only the table/function owner
-- can invoke these helpers directly; public RPCs call them as SECURITY DEFINER.
create or replace function public.company_assert_access(
  p_username text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_username is distinct from 'oooo'
     or not coalesce(public.planner_check_password(p_username, p_password), false) then
    raise exception 'Authentication failed' using errcode = '28000';
  end if;
end;
$function$;

create or replace function public.company_assert_relations(
  p_username text,
  p_parent_record_id uuid,
  p_related_record_ids uuid[],
  p_current_record_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected integer;
  v_found integer;
begin
  if p_parent_record_id is not null then
    if p_parent_record_id = p_current_record_id then
      raise exception 'A record cannot be its own parent' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.company_records r
      where r.id = p_parent_record_id and r.owner_username = p_username
    ) then
      raise exception 'Related parent record not found' using errcode = '23503';
    end if;
  end if;

  if coalesce(array_length(p_related_record_ids, 1), 0) > 0 then
    if p_current_record_id = any(p_related_record_ids) then
      raise exception 'A record cannot relate to itself' using errcode = '23514';
    end if;
    select count(distinct x) into v_expected
    from unnest(p_related_record_ids) as x;
    select count(distinct r.id) into v_found
    from public.company_records r
    where r.owner_username = p_username
      and r.id = any(p_related_record_ids);
    if v_found <> v_expected then
      raise exception 'One or more related records were not found' using errcode = '23503';
    end if;
  end if;
end;
$function$;

create or replace function public.company_verify_credentials(
  p_username text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  return coalesce(public.planner_check_password(p_username, p_password), false)
    and p_username = 'oooo';
end;
$function$;

create or replace function public.company_list_records(
  p_username text,
  p_password text,
  p_record_type text default null,
  p_business_type text default null,
  p_status text default null,
  p_keyword text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_total bigint;
  v_items jsonb;
begin
  perform public.company_assert_access(p_username, p_password);

  if p_record_type is not null and p_record_type not in
    ('customer', 'project', 'task', 'follow_up', 'transaction', 'document', 'file') then
    raise exception 'Invalid record type' using errcode = '22023';
  end if;
  if p_business_type is not null and p_business_type not in ('trade', 'software', 'ecommerce') then
    raise exception 'Invalid business type' using errcode = '22023';
  end if;

  select count(*) into v_total
  from public.company_records r
  where r.owner_username = p_username
    and (p_record_type is null or r.record_type = p_record_type)
    and (p_business_type is null or r.business_type = p_business_type)
    and (p_status is null or r.status = p_status)
    and (nullif(btrim(p_keyword), '') is null or r.title ilike '%' || btrim(p_keyword) || '%');

  select coalesce(jsonb_agg(to_jsonb(page_row) order by page_row.updated_at desc), '[]'::jsonb)
    into v_items
  from (
    select r.*
    from public.company_records r
    where r.owner_username = p_username
      and (p_record_type is null or r.record_type = p_record_type)
      and (p_business_type is null or r.business_type = p_business_type)
      and (p_status is null or r.status = p_status)
      and (nullif(btrim(p_keyword), '') is null or r.title ilike '%' || btrim(p_keyword) || '%')
    order by r.updated_at desc
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

create or replace function public.company_get_record(
  p_username text,
  p_password text,
  p_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_record jsonb;
begin
  perform public.company_assert_access(p_username, p_password);
  select to_jsonb(r) into v_record
  from public.company_records r
  where r.id = p_record_id and r.owner_username = p_username;

  if v_record is null then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;
  return v_record;
end;
$function$;

create or replace function public.company_create_record(
  p_username text,
  p_password text,
  p_record jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_record_type text;
  v_parent_id uuid;
  v_related_ids uuid[] := '{}'::uuid[];
  v_amount numeric(20,6);
  v_currency text;
  v_data jsonb;
  v_result public.company_records%rowtype;
begin
  perform public.company_assert_access(p_username, p_password);

  if p_record is null or jsonb_typeof(p_record) <> 'object' then
    raise exception 'Record payload must be a JSON object' using errcode = '22023';
  end if;
  if p_record ?| array['id', 'owner_username', 'created_at', 'updated_at'] then
    raise exception 'Immutable fields are not accepted' using errcode = '22023';
  end if;

  v_record_type := p_record->>'record_type';
  if v_record_type not in ('customer', 'project', 'task', 'follow_up', 'transaction', 'document', 'file') then
    raise exception 'Invalid record type' using errcode = '22023';
  end if;

  if nullif(p_record->>'parent_record_id', '') is not null then
    v_parent_id := (p_record->>'parent_record_id')::uuid;
  end if;
  if p_record ? 'related_record_ids' then
    if jsonb_typeof(p_record->'related_record_ids') <> 'array' then
      raise exception 'related_record_ids must be an array' using errcode = '22023';
    end if;
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_related_ids
    from jsonb_array_elements_text(p_record->'related_record_ids') as items(value);
  end if;

  if nullif(p_record->>'amount', '') is not null then
    v_amount := (p_record->>'amount')::numeric(20,6);
  end if;
  v_currency := p_record->>'currency';
  v_data := coalesce(p_record->'data', '{}'::jsonb);
  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'data must be a JSON object' using errcode = '22023';
  end if;

  perform public.company_assert_relations(p_username, v_parent_id, v_related_ids);

  insert into public.company_records (
    owner_username, record_type, business_type, title, status,
    parent_record_id, related_record_ids, amount, currency,
    record_date, due_date, data
  ) values (
    p_username,
    v_record_type,
    p_record->>'business_type',
    btrim(coalesce(p_record->>'title', '')),
    p_record->>'status',
    v_parent_id,
    v_related_ids,
    v_amount,
    v_currency,
    nullif(p_record->>'record_date', '')::timestamptz,
    nullif(p_record->>'due_date', '')::timestamptz,
    v_data
  )
  returning * into v_result;

  return to_jsonb(v_result);
end;
$function$;

create or replace function public.company_update_record(
  p_username text,
  p_password text,
  p_record_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current public.company_records%rowtype;
  v_parent_id uuid;
  v_related_ids uuid[];
  v_amount numeric(20,6);
  v_currency text;
  v_data jsonb;
  v_result public.company_records%rowtype;
  v_allowed constant text[] := array[
    'business_type', 'title', 'status', 'parent_record_id',
    'related_record_ids', 'amount', 'currency', 'record_date',
    'due_date', 'data'
  ];
begin
  perform public.company_assert_access(p_username, p_password);

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'Patch must be a non-empty JSON object' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_patch) as keys(key)
    where key <> all(v_allowed)
  ) then
    raise exception 'Patch contains unsupported fields' using errcode = '22023';
  end if;

  select * into v_current
  from public.company_records r
  where r.id = p_record_id and r.owner_username = p_username
  for update;

  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;

  v_parent_id := v_current.parent_record_id;
  if p_patch ? 'parent_record_id' then
    v_parent_id := nullif(p_patch->>'parent_record_id', '')::uuid;
  end if;

  v_related_ids := v_current.related_record_ids;
  if p_patch ? 'related_record_ids' then
    if jsonb_typeof(p_patch->'related_record_ids') <> 'array' then
      raise exception 'related_record_ids must be an array' using errcode = '22023';
    end if;
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_related_ids
    from jsonb_array_elements_text(p_patch->'related_record_ids') as items(value);
  end if;

  v_amount := v_current.amount;
  if p_patch ? 'amount' then
    v_amount := nullif(p_patch->>'amount', '')::numeric(20,6);
  end if;
  v_currency := v_current.currency;
  if p_patch ? 'currency' then
    v_currency := p_patch->>'currency';
  end if;
  v_data := v_current.data;
  if p_patch ? 'data' then
    v_data := p_patch->'data';
    if jsonb_typeof(v_data) <> 'object' then
      raise exception 'data must be a JSON object' using errcode = '22023';
    end if;
  end if;

  perform public.company_assert_relations(p_username, v_parent_id, v_related_ids, p_record_id);

  update public.company_records r set
    business_type = case when p_patch ? 'business_type' then p_patch->>'business_type' else r.business_type end,
    title = case when p_patch ? 'title' then btrim(p_patch->>'title') else r.title end,
    status = case when p_patch ? 'status' then p_patch->>'status' else r.status end,
    parent_record_id = v_parent_id,
    related_record_ids = v_related_ids,
    amount = v_amount,
    currency = v_currency,
    record_date = case when p_patch ? 'record_date' then nullif(p_patch->>'record_date', '')::timestamptz else r.record_date end,
    due_date = case when p_patch ? 'due_date' then nullif(p_patch->>'due_date', '')::timestamptz else r.due_date end,
    data = v_data,
    updated_at = now()
  where r.id = p_record_id and r.owner_username = p_username
  returning * into v_result;

  return to_jsonb(v_result);
end;
$function$;

create or replace function public.company_delete_record(
  p_username text,
  p_password text,
  p_record_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.company_assert_access(p_username, p_password);

  if not exists (
    select 1 from public.company_records r
    where r.id = p_record_id and r.owner_username = p_username
  ) then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.company_records r
    where r.owner_username = p_username
      and (r.parent_record_id = p_record_id or p_record_id = any(r.related_record_ids))
  ) then
    raise exception 'Record is referenced by other records' using errcode = '23503';
  end if;

  delete from public.company_records r
  where r.id = p_record_id and r.owner_username = p_username;
  return found;
end;
$function$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly remove it.
revoke all on function public.company_assert_access(text, text) from public, anon, authenticated, service_role;
revoke all on function public.company_assert_relations(text, uuid, uuid[], uuid) from public, anon, authenticated, service_role;

revoke all on function public.company_verify_credentials(text, text) from public, anon, authenticated;
revoke all on function public.company_list_records(text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.company_get_record(text, text, uuid) from public, anon, authenticated;
revoke all on function public.company_create_record(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.company_update_record(text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.company_delete_record(text, text, uuid) from public, anon, authenticated;

grant execute on function public.company_verify_credentials(text, text) to service_role;
grant execute on function public.company_list_records(text, text, text, text, text, text, integer, integer) to service_role;
grant execute on function public.company_get_record(text, text, uuid) to service_role;
grant execute on function public.company_create_record(text, text, jsonb) to service_role;
grant execute on function public.company_update_record(text, text, uuid, jsonb) to service_role;
grant execute on function public.company_delete_record(text, text, uuid) to service_role;

commit;
