
create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_username text not null
    references public.planner_credentials(username) on delete cascade,
  title text not null
    check (char_length(btrim(title)) between 1 and 200),
  description text not null default ''
    check (char_length(description) <= 5000),
  task_type text not null default 'repository_audit'
    check (task_type in ('repository_audit', 'general')),
  target_repository text not null
    check (target_repository ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  scope jsonb not null default '{}'::jsonb
    check (jsonb_typeof(scope) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_task_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null
    references public.agent_tasks(id) on delete cascade,
  run_number integer not null check (run_number > 0),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'paused', 'completed', 'failed')),
  standard_commit_sha text,
  target_commit_sha text,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agent_task_runs_number_unique unique (task_id, run_number)
);

create table public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null
    references public.agent_task_runs(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  step_key text not null check (char_length(btrim(step_key)) between 1 and 100),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  instructions text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result) = 'object'),
  evidence jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence) = 'array'),
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_run_steps_order_unique unique (run_id, step_order),
  constraint agent_run_steps_key_unique unique (run_id, step_key)
);

create index agent_tasks_owner_updated_idx
  on public.agent_tasks (owner_username, updated_at desc);
create index agent_task_runs_task_created_idx
  on public.agent_task_runs (task_id, created_at desc);

create unique index agent_task_runs_one_open_per_task_idx
  on public.agent_task_runs (task_id)
  where status in ('queued', 'running', 'paused');

alter table public.agent_tasks enable row level security;
alter table public.agent_task_runs enable row level security;
alter table public.agent_run_steps enable row level security;

revoke all on public.agent_tasks from public, anon, authenticated;
revoke all on public.agent_task_runs from public, anon, authenticated;
revoke all on public.agent_run_steps from public, anon, authenticated;

grant select, insert, update, delete on public.agent_tasks to service_role;
grant select, insert, update, delete on public.agent_task_runs to service_role;
grant select, insert, update, delete on public.agent_run_steps to service_role;
