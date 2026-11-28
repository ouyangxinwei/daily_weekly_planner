# 慢慢计划 AI Agent 核心设计

- 文档状态：Phase 4 最小数据结构与 API 契约（2026-11-28）
- 目标仓库：`ouyangxinwei/daily_weekly_planner`
- 规范来源：`ouyangxinwei/oooo_Dev_Standard`
- 调度目标：每天 02:00（Asia/Tokyo）；调度器尚未实施
- 当前范围：Task / Run / Step 最小数据结构、状态和 API 契约；不引入复杂队列或并行 Worker

## 1. 目标

建立一个简单、可逐步扩展的 Agent 工作流程：用户创建任务，Master Agent 规划并分配工作，Worker 执行，系统保存进度，Master 汇总并生成报告。

第一版优先完成一个可手动启动、可中断恢复、能生成可追溯报告的流程。核心检查不依赖付费 AI API；AI 只作为以后可选的能力。

## 2. 核心组成

```
管理界面
   │ 创建任务 / 查看进度与报告
   ▼
Master Agent
   │ 制定步骤 / 分配工作 / 汇总结果
   ▼
Worker Agent
   │ 执行指定步骤 / 保存结果
   ▼
Supabase
     保存任务、运行记录、步骤状态和报告信息
```

- **管理界面**：用户创建任务、选择目标、启动任务、查看进度和报告。
- **Master Agent**：理解任务目标，生成简单执行步骤，按顺序分配 Worker，检查步骤结果并汇总。
- **Worker Agent**：只执行分配给自己的步骤，返回结果与证据；不得自行扩大任务范围或权限。
- **Supabase**：保存任务和运行状态，支持中断后继续。它是数据存储，不预设为实际 Worker 的运行平台。

第一版 Worker 先串行执行，避免过早引入并行队列、复杂锁和分布式调度。运行平台保持可替换，不依赖个人电脑必须开机，也不以当前免费平台条件限制核心设计。

## 3. 最小数据模型

第一版只建立三张业务表：`agent_tasks`、`agent_task_runs`、`agent_run_steps`。

Agent 本身先作为代码中的固定角色配置，不建立 Agent 管理表。Master / Worker 是职责，不是需要用户管理的独立运行实例。

### 3.1 关系

```
planner_credentials
       │
       └── agent_tasks (1)
                 │
                 └── agent_task_runs (N)
                           │
                           └── agent_run_steps (N)
```

- 一个 Task 属于一个慢慢计划账号。
- 一个 Task 可以有多次 Run。
- 一个 Run 包含有序 Steps。
- Step 结果和证据直接保存在 Step，不单独建立日志、事件或 Checkpoint 表。
- 每个 Run 保存规范仓库与目标仓库的 Commit SHA，避免结果混用不同版本。

### 3.2 字段定义

| 表 | 字段 | 用途 |
|---|---|---|
| `agent_tasks` | `id`、`owner_username` | 主键与任务所有者 |
| | `title`、`description`、`task_type` | 任务说明 |
| | `target_repository`、`scope` | 目标仓库和检查范围 |
| | `status`、`created_at`、`updated_at` | 任务状态与时间 |
| `agent_task_runs` | `id`、`task_id`、`run_number` | 执行记录及任务内序号 |
| | `status`、`started_at`、`finished_at` | 执行状态与时间 |
| | `standard_commit_sha`、`target_commit_sha` | 两个仓库的固定审查基线 |
| | `error_code`、`error_message` | 运行失败信息 |
| `agent_run_steps` | `id`、`run_id`、`step_order`、`step_key` | 步骤身份与顺序 |
| | `title`、`instructions`、`status` | 步骤说明与状态 |
| | `result`、`evidence` | 结构化结果和证据 |
| | `error_code`、`error_message` | 步骤错误 |
| | `started_at`、`finished_at`、`created_at`、`updated_at` | 时间信息 |

字段约束：
- 主键使用 UUID。
- 时间统一使用 `timestamptz`，由数据库保存 UTC 时间；前端按 Asia/Tokyo 显示。
- `scope` 和 `result` 必须是 JSON object；`evidence` 必须是 JSON array。
- `target_repository` 使用 `owner/repository` 格式。
- `run_number` 在同一个 Task 内递增。
- 同一 Task 同时最多存在一个未完成 Run（queued / running / paused）。
- 同一个 Run 内 `step_order` 和 `step_key` 均唯一。

### 3.3 状态

| 对象 | 状态 | 说明 |
|---|---|---|
| Task | `pending` | 已创建，尚未执行 |
| | `active` | 当前存在执行中的 Run |
| | `paused` | 当前 Run 暂停，等待恢复 |
| | `completed` | 最近一次 Run 成功完成 |
| | `failed` | 最近一次 Run 失败 |
| Run | `queued` | 已创建，等待 Worker 开始 |
| | `running` | 正在执行 |
| | `paused` | 已保存进度，等待恢复 |
| | `completed` | 所有必要步骤完成 |
| | `failed` | 无法继续的执行失败 |
| Step | `pending` | 尚未开始 |
| | `running` | 正在执行 |
| | `completed` | 已完成并保存结果 |
| | `failed` | 执行失败 |
| | `skipped` | 经 Master 判断无需执行，并记录原因 |

允许的主要转换：
- Task：pending → active → completed / paused / failed；paused → active。
- Run：queued → running；running → paused / completed / failed；paused → running。
- Step：pending → running → completed / failed；pending → skipped；failed → running（重试）。
- 已完成的 Step 默认不重跑。恢复时从第一个 pending 或可重试 failed Step 继续。
- Task 状态由后端根据 Run 状态汇总，不允许前端直接任意修改。

## 4. SQL 结构基线

以下 SQL 是 Phase 4 的结构基线，用于后续生成正式 Supabase migration；**本次没有直接应用到托管数据库**。

```sql
create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_username text not null
    references public.planner_credentials(username) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
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
create index agent_run_steps_run_order_idx
  on public.agent_run_steps (run_id, step_order);

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
```

安全原则：
- 不创建 anon / authenticated 直接访问策略；前端只能调用受控 Edge Function。
- Service role 密钥只存在于 Edge Function 环境，绝不进入浏览器。
- API 从已验证的会话/凭据取得 `owner_username`，不接受客户端传入或覆盖所有者字段。
- RLS 保持启用；数据库表不向普通客户端授权。Service role 只由后端使用。
- 任何未来增加的 RPC 都必须单独审查执行权限、`SECURITY DEFINER`、固定 `search_path` 和参数校验。

## 5. 最小 API 契约

第一版建议使用独立的 `agent-api` Edge Function，避免把 Agent 逻辑混入现有 `company-api`。统一前缀为 `/agent`。沿用现有 API 的服务端认证、JSON 响应包络、请求 ID 和错误映射约定；具体身份认证实现须复用并验证现有账号认证机制。

### 5.1 用户可调用的端点

| 方法 | 路径 | 用途 | 成功状态 |
|---|---|---|---|
| POST | `/agent/tasks` | 创建任务 | 201 |
| GET | `/agent/tasks` | 分页列出当前账号任务 | 200 |
| GET | `/agent/tasks/{task_id}` | 读取任务及最近执行摘要 | 200 |
| POST | `/agent/tasks/{task_id}/runs` | 创建一次 Run 和初始 Steps | 201 |
| GET | `/agent/runs/{run_id}` | 读取 Run 与有序 Steps | 200 |
| POST | `/agent/runs/{run_id}/pause` | 请求暂停并保存进度 | 200 |
| POST | `/agent/runs/{run_id}/resume` | 从已保存进度恢复 | 202 |

Worker 执行 Step、写入 Step 结果和汇总 Task 状态属于后端内部操作，不开放给浏览器直接调用。第一版没有公开的任意 Step 修改、删除 Task 或代码写入 API。

### 5.2 创建任务请求

```json
{
  "title": "审查慢慢计划是否符合共同开发规范",
  "description": "检查文档、代码、API 和数据库证据",
  "task_type": "repository_audit",
  "target_repository": "ouyangxinwei/daily_weekly_planner",
  "scope": {
    "standard_repository": "ouyangxinwei/oooo_Dev_Standard",
    "checks": ["documentation", "code", "api", "database"]
  }
}
```

客户端不得传入 `id`、`owner_username`、`status`、`created_at` 或 `updated_at`。所有者和初始状态由后端设置。

### 5.3 创建 Run 请求

```json
{
  "reason": "manual"
}
```

Master 创建 Run 时在服务端读取两个仓库的 Commit SHA，生成有序 Step，并在同一数据库事务中写入 Run 与 Steps。若 Task 已有 queued / running / paused 的 Run，返回 `409 RUN_ALREADY_OPEN`，不创建重复执行。

### 5.4 成功响应

```json
{
  "data": {
    "id": "uuid",
    "status": "queued"
  },
  "request_id": "request-uuid"
}
```

列表响应使用 `data.items`、`data.total`、`data.limit`、`data.offset`。Run 详情包含按 `step_order` 排序的 Steps。敏感凭据、服务端密钥和内部调试堆栈不得出现在响应中。

### 5.5 错误响应

```json
{
  "error": "VALIDATION_ERROR",
  "request_id": "request-uuid"
}
```

最小错误码：`AUTHENTICATION_FAILED`（401）、`NOT_FOUND`（404）、`VALIDATION_ERROR`（400）、`RUN_ALREADY_OPEN`（409）、`INVALID_STATE_TRANSITION`（409）、`REQUEST_TOO_LARGE`（413）、`DATABASE_UNAVAILABLE`（503）、`INTERNAL_ERROR`（500）。

每个请求返回 `X-Request-Id`；响应统一 `Cache-Control: no-store`。列表默认 limit=20、最大 100，offset 不得为负数。请求体限制 32 KB。错误响应不返回数据库原始错误文本。

## 6. 第一版执行流程

1. **创建任务**：用户选择目标仓库、任务类型和检查范围。
2. **创建 Run**：Master 固定规范仓库与目标仓库 Commit SHA，并生成有序 Steps。
3. **执行步骤**：Master 按顺序把当前 Step 交给 Worker。
4. **保存进度**：每个 Step 完成后立即保存状态、结果和必要证据。
5. **处理中断**：失败或运行时间到达安全上限时，保存当前进度并暂停；下次从第一个未完成 Step 继续。
6. **汇总报告**：所有必要步骤完成后，Master 汇总结果，生成 Markdown 报告并关联 Run。

报告状态必须区分「已找到 / 已实现」「部分实现」「未实现」「不一致」「待验证」「未检查」「检查失败」。没有完成检查或证据不足时，不得判定为未实现。每次 Run 记录规范库与目标仓库的 Commit SHA，确保结果可追溯。

## 7. 安全边界

- 第一版默认只读目标仓库；允许执行检查和生成报告。
- Agent 不得自动修改共同规范、业务代码、数据库结构或生产数据。
- 不自动创建/合并业务 PR，不自动合并 `main`，不自动部署。
- 需要修改时，先输出建议和差异，由用户决定后续操作。
- AI 调用不是必需步骤；AI 不可用或余额不足时，仍须能够保存进度并生成规则检查报告。
- 凭据只能由受控后端使用，不能把密钥暴露给浏览器。

## 8. 暂不实现、以后扩展

第一版不实现复杂队列、并行 Worker、自动模型路由、多 Provider 多账号、复杂预算系统、动态权限引擎或自动代码修改。

未来可在不改变 Task / Run / Step 基本关系的前提下逐步增加：
- 每天 02:00 JST 的自动启动与任务调度；
- Worker 并行执行和更细致的重试控制；
- Provider 多账号、模型推荐、人工选择及手动填写限流恢复时间；
- 单任务限制、月度预算和用量统计；
- 人工审批、更多报告归档与管理界面。

调度与执行平台暂不锁定。可评估本地手动运行、NAS、小型常开设备、云 VM 或托管容器；部署时再核实费用、免费资格、执行限制和可用性。当前先保证核心流程可移植，并能以手动/模拟方式验证。

## 9. 当前实施状态与阻塞项

本次已完成最小数据模型、状态转换、SQL 结构基线和 API 契约定义，并已在 development 加入独立 `agent-api` Edge Function 初版代码及配置；尚未创建正式 migration、部署 `agent-api` 或修改托管数据库。

在正式生成/应用 Agent migration 前，对此前发现的学习会议 migration 差异进行了只读核对：
- Git 仓库包含 `supabase/migrations/20261127090000_learning_meetings_cloud.sql`。
- Supabase migration ledger 最新记录为 `20261126004847`，且没有 `20261127090000` 记录。
- 远程数据库已存在 `public.learning_meetings_data`，并且实际 DDL 已包含迁移文件定义的主键、外键、数组类型检查和最多 1000 条的数量检查约束。
- 两个 `learning_meetings_get_data / learning_meetings_put_data` 函数均存在，函数体与迁移文件的核心逻辑一致。
- 表已启用 RLS；`anon` 与 `authenticated` 无表 SELECT 权限，也无 GET RPC 执行权限；`service_role` 有对应权限。

**当前确认的问题是 migration ledger 缺少记录，而不是远程表结构缺少迁移定义。** 这说明该迁移很可能已在数据库执行，但没有在当前 migration ledger 登记；目前不直接修改 ledger，也不重复执行原 migration，避免重放已有 DDL 或伪造迁移历史。后续应通过 Supabase CLI 的 migration repair 流程将已核实执行过的版本登记为 applied，并再次核对 migration list。当前环境没有可用的本地 Supabase CLI 执行入口，因此本次只完成只读核验，未改动托管数据库。

### 9.1 Agent API 初版代码（development）

已新增：
- `supabase/functions/agent-api/index.ts`：Task / Run / Step 最小 API。
- `supabase/config.toml`：增加 `agent-api` 配置，`verify_jwt = false`，因为当前应用的既有账号验证由 Edge Function 内部通过 `company_verify_credentials` RPC 完成，而不是 Supabase Auth JWT。API 每个请求仍必须通过 Basic Authorization 验证；该配置不代表匿名开放业务接口。
- 创建 Task、分页读取 Task、读取 Task 详情、创建 Run/Steps、读取 Run 详情、暂停和恢复 Run。
- 创建 Run 时读取共同规范仓库与目标仓库的最新公开 GitHub Commit SHA 并保存到 Run；任一来源无法读取时，不创建 Run。
- 使用现有 `company_verify_credentials` 完成服务端 Basic 凭据验证，并复用 `company_consume_ip_rate_limit` 做 IP 频率限制。
- 所有数据访问均由 Edge Function 使用服务端密钥执行；读取 Task / Run 前按已验证用户名检查所有权。浏览器不直接访问 Agent 表。

当前限制：
- Worker 的实际执行器尚未实现；Run 创建后保持 queued，Step 由后续 Worker 阶段执行。
- 数据表尚未创建，因此 API 代码不能部署后投入使用。
- 本次没有对线上 Supabase 部署 Edge Function，也没有修改线上数据库。
- 当前代码沿用 company-api 的 Basic 凭据认证模式，后续应对登录失败限流与凭据轮换进行统一治理。

## 10. 后续实施顺序

1. 在具备 Supabase CLI 的本地项目中使用 `supabase migration new` 生成 Agent migration 文件；不再把此前的 migration ledger 差异作为 Agent 代码开发的前置阻塞。
2. 对 Agent migration 做代码审查；确认 RLS、索引、唯一约束和 service_role 权限。
3. 在用户选择的目标环境应用 migration，并验证三张表与约束。
4. 部署独立 `agent-api`，完成接口连通验证。
5. 用少量 API 集成测试验证创建 Task、创建 Run/Steps、读取状态、暂停和恢复。
6. 实现串行 Worker 执行器，完成 Step 结果保存、断点恢复和报告生成。
7. 核心流程稳定后，再增加定时调度和可选 AI 能力。

**本阶段结论：** 第一版数据结构固定为 Task / Run / Step 三张表，Agent 角色先写在代码配置中；API 通过受控 Edge Function 暴露，Worker 的 Step 写入操作保持内部调用。当前已完成数据与接口契约，生产 schema / API 实际部署待迁移差异核对后进行。
