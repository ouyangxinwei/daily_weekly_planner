# 慢慢计划 AI Agent 核心设计

- 文档状态：**暂时告一段落，尚未完成（2026-11-28）**；后续实施暂停，等待用户有时间时重新启动
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
| POST | `/agent/runs/{run_id}/execute` | 串行执行一个 Step 并保存结果 | 200 |

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
3. **执行步骤**：Master 调用 `/agent/runs/{run_id}/execute`，Worker 每次只执行一个 Step；完成后返回是否还有下一步。
4. **保存进度**：每个 Step 完成后立即保存状态、结果和必要证据。
5. **处理中断**：每次调用只执行一个 Step，执行后立即保存；若请求意外中断，可先暂停再恢复，恢复时将遗留的 running Step 重置为 pending。检查失败会保留失败证据并继续后续步骤，最终报告明确显示失败和未完成项。
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

本阶段已完成 Task / Run / Step 数据结构、独立 `agent-api`、串行 Worker、数据库接通和 Edge Function 部署。最新实施状态以本节 9.3、9.4 为准。

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
- （历史状态，已被 9.3 数据库接通记录取代。）
- （历史状态，已被 9.3 数据库接通与部署记录取代。）
- 当前代码沿用 company-api 的 Basic 凭据认证模式；登录失败限流与凭据轮换仍可在后续安全治理阶段统一加强。

### 9.2 Worker 核心执行能力（Phase 5）

已在 development 实现第一版串行 Worker，代码位于 `supabase/functions/agent-api/index.ts`：

- 新增 `POST /agent/runs/{run_id}/execute`，仍由现有 Basic Auth、IP 限流和 Task/Run 所有权校验保护。
- 每次请求最多领取并执行一个 pending Step；通过 `status=eq.pending` 条件更新领取 Step，避免两个并发请求重复执行同一步骤。
- Worker 根据 Run 中固定的 `target_commit_sha` 与 `standard_commit_sha` 先解析 Git Commit 对应的 Tree SHA，再读取 GitHub Tree，不跟随仓库最新分支漂移。
- documentation / code / api / database 四类检查，第一版只做确定性的文件路径与扩展名盘点，保存两边仓库的匹配数量、最多 20 条路径样本和 Commit SHA。
- 单个检查失败时将该 Step 标记 failed、保留错误码，然后继续后续步骤；Master 汇总步骤生成 Markdown 报告，明确完成数、失败数和未完成数。
- 最后一个 Step 完成后将 Run 与 Task 标记 completed；报告类型为 `deterministic_inventory_v1`。
- 如果执行请求中断并留下 running Step，可通过 pause → resume 恢复；resume 会把遗留 running Step 重置为 pending，已完成 Step 不会重跑。执行中的 Step 不会被强制中断，暂停请求在当前 Step 保存后生效。
- 没有新增表、队列、并行 Worker、AI API 或代码写入能力。

**第一版能力边界：** 当前结果是仓库文件清单盘点，不是规范语义审查、代码质量审查、API 行为测试、数据库实际结构验证或部署验证。文件存在不代表功能已实现，文件缺失也不单独证明功能未实现。GitHub Tree 返回截断或不可用时，步骤记录为失败，不将不完整数据当成“未找到”。

**运行方式：** 创建 Run 后，调用 execute 一次执行一个 Step；当响应 `next_step_available=true` 时继续调用，直到 Run completed。可由未来管理界面循环调用，也可暂时手动调用。当前没有自动调度器；Edge Function 已部署，见 9.3。

**验证状态：** 已完成代码静态核对和 API 路由/状态逻辑检查；当前环境没有 Deno 与 Supabase CLI，未完成 Deno 类型检查、Edge Function 本地运行、数据库集成测试或线上部署。（历史状态，数据库现已接通；端到端运行验证仍待用户稍后执行。）



### 9.3 Phase 5 数据库接通与部署状态（2026-11-28）

**数据库：** Supabase 项目 `kopvznygsqsheibsjjvv` 中已确认存在 `agent_tasks`、`agent_task_runs`、`agent_run_steps` 三张表，字段、主外键、状态约束、JSONB 检查、索引与 Phase 4 结构基线一致。三张表 RLS 均启用；没有 anon/authenticated 直接访问权限或 RLS policy；service_role 具有后端所需 CRUD 权限。应用前确认三张表当前均为 0 行，没有清理或覆盖任何数据。

**Migration 历史说明：** 本次第一次提交 DDL 时，数据库返回 `42P07 relation already exists`，说明表在本次 DDL 前已存在；该调用仍在 migration ledger 留下版本 `20261128112330`。随后使用幂等 DDL 成功登记版本 `20261128112419`，补齐并确认了 Step 顺序索引及完整权限设置。仓库保留与两个远端版本对应的 migration 文件：
- `supabase/migrations/20261128112330_agent_core_tables.sql`
- `supabase/migrations/20261128112419_agent_core_tables.sql`

两条远端记录名称相同，是本次工具调用留下的历史现象；不要手工删除或伪造 migration ledger。后续迁移管理应以这两个版本和仓库文件为基准核对。

**部署：** `agent-api` 已部署到 Supabase，状态 ACTIVE，版本 2，`verify_jwt=false`。这是因为函数内部自行执行现有 Basic Auth 验证、IP 限流和 Task/Run 所有权检查，不代表业务端点匿名开放。函数入口：
`https://kopvznygsqsheibsjjvv.supabase.co/functions/v1/agent-api`

**端到端测试准备：** 新增 `scripts/agent-api-smoke-test.ps1`，默认使用公开小仓库 `octocat/Hello-World`，只检查 documentation 与 code 两个 Step；脚本会安全隐藏式提示用户输入现有慢慢计划密码，并执行 Task → Run → 第一个 Step → Pause → Resume → 剩余 Step → 报告与数据库持久化读取验证。密码不会写入脚本或输出。当前尚未取得用户本机凭据，因此尚未实际执行这轮认证端到端测试；不得将其报告为已通过。


### 9.4 Phase 6 前端最小管理界面（development）

已新增第一版 AI 工作管理入口，暂时作为慢慢计划的独立对话框，不改动现有计划、工作或公司业务模块：

- 顶部新增「AI 工作管理」入口。
- 账号连接使用现有慢慢计划用户名与密码，通过 HTTPS Basic Auth 调用 agent-api。
- 密码仅保存在当前页面 JavaScript 内存中；关闭对话框即清除，不写入 localStorage / sessionStorage。
- 支持创建仓库检查 Task、查看任务列表、创建 Run、读取 Run/Step 状态。
- 支持手动执行 Worker，每次点击最多连续执行 5 个 Step，避免单次浏览器操作无限运行；可再次点击继续。
- 支持暂停与恢复 Run，并展示 Step 状态和最终 Markdown 报告。
- 新增文件：`agent-workspace.js`、`agent-workspace.css`；`index.html` 增加入口、样式、脚本和对话框。
- CORS 已核对允许当前 GitHub Pages Origin；API 仍由服务端 Basic Auth、IP 限流和资源所有权检查保护。

**当前限制：** 该界面尚未进行浏览器实测；不能将静态核对视为可用性验收。暂时仅提供中文界面；未加入 AI Provider/账号管理、预算、自动调度或并行 Worker。用户要求稍后再做端到端测试，因此本阶段不主动创建测试 Task / Run，不产生测试业务记录。

**静态核对：** 已确认入口、对话框、JS/CSS 引用、Basic Auth 请求、Task/Run/Execute/Pause/Resume 路由和密码不持久化逻辑均存在。尚未完成浏览器运行验证、Deno 类型检查和完整 API 集成验证。

## 10. 简化后的后续计划（当前暂停，尚未完成）

用户决定：现阶段先将 Agent 项目暂时告一段落，不继续开发、不执行后续阶段。必须保留本节计划，供用户以后有时间时恢复。**本项目不是已完成或正式验收状态。**

后续不再按大量细分 Phase 推进，统一压缩为以下四个阶段：

### A. 检查能力

- 让 Worker 从目前的仓库文件路径/扩展名盘点，逐步具备真正的规范检查能力。
- 读取共同规范库中的相关规范和目标仓库的实际文件内容。
- 先实现少量明确、客观、可确定的规则，不一开始引入复杂 AI 语义审查。
- 保存检查结论和原始证据；无法判断时标记为待确认，不得猜测。

### B. 完整流程

- 打通创建 Task、创建 Run、Master 生成步骤、Worker 执行、Step 保存、暂停/恢复和报告生成。
- 确保中断后可以从已保存进度继续，已完成步骤不重复执行。
- 确保结果始终关联本次 Run 固定的两个仓库 Commit SHA。

### C. 管理界面完善

- 基于现有 AI 工作管理界面继续完善，不重写已完成部分。
- 清晰显示任务、执行进度、通过/失败/待确认/未检查状态和最终报告。
- 处理常见错误与用户操作反馈。

### D. 实际启用与验收

- 执行现有 `scripts/agent-api-smoke-test.ps1`，验证真实认证及 Task → Run → Worker → Step → Pause/Resume → Report 完整流程。
- 在浏览器中实际验证 AI 工作管理界面。
- 根据结果修复问题，完成必要部署与最终验收。
- 只有真实验证通过后，才能标记为正式可用。

### 当前暂停位置与待办

已经完成并保留：
- Task / Run / Step 三张数据库表及其基本权限边界。
- `agent-api` Edge Function 的基础 API 和串行 Worker 执行能力。
- Worker 当前的四类文件清单盘点及 Markdown 报告初版。
- AI 工作管理界面第一版。
- 端到端测试脚本 `scripts/agent-api-smoke-test.ps1`。

尚未完成、不得误标为完成：
- Worker 的实际规范规则检查能力。
- 真实端到端认证和执行测试。
- 浏览器中的管理界面实测。
- 完整流程问题修复和正式验收。

**恢复方式：** 用户以后只需提出继续慢慢计划 AI Agent 项目，先阅读本文件，确认当时的代码、数据库和部署状态，再从 A 阶段继续。不要重新设计或重做已经完成的部分；也不要默认跳过尚未完成的测试。

## 11. 第一版明确不做的复杂功能

为保持简单，恢复开发后仍不把以下内容作为第一版前置条件：
- AI Provider / 多账号管理、模型自动推荐和账号调度。
- 多 Worker 并行、复杂任务队列、分布式锁和复杂重试系统。
- 自动定时调度（包括每天 02:00 JST）。
- 复杂预算、动态权限和用量管理系统。
- Agent 自动修改共同规范、业务代码或生产数据库，以及自动合并 PR、自动部署。

以上均可在基本检查流程稳定并确有需要后再单独规划。第一版优先回答三个问题：能否检查、能否可靠保存结果、能否生成可信报告。

**项目状态结论：** 当前工作仅完成基础架构与第一版初始实现；规则检查、端到端测试、界面实测和正式验收均未完成。项目按用户决定暂时暂停，计划和恢复入口已保存在本文件。