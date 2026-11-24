# Phase 3-B-D：业务活动时间线（V10.62.0）

## 1. 目标

在 V10.61 状态历史之上，提供单条客户、项目、任务、跟进记录的统一活动时间线，涵盖创建、普通字段修改、状态变化和删除。

## 2. 范围与行为

- 覆盖 `customer`、`project`、`task`、`follow_up` 四类业务记录。
- 创建和删除事件由数据库触发器记录。
- 普通更新仅记录实际变化的字段名称；不保存旧值、新值或整份 JSONB 快照。
- 项目、任务、跟进的状态变化由 `company_record_status_history` 记录，统一查询时合并展示，不重复写入第二条状态事件。客户状态不在 V10.61 状态表范围内，因此作为 customer 的 `status` 字段变更名称记录在活动表中。
- 自动项目进度计算产生的 `data.progress_percent` 更新不生成噪声活动。
- 事件时间由 PostgreSQL `clock_timestamp()` 生成。
- 删除事件保留记录 ID、类型、标题快照和事件时间；活动表不设置业务记录外键，避免删除时丢失审计事件。
- V10.62.0 上线前不回填历史；旧记录在本版本上线前的活动无法可靠重建。
- 历史字段只保存变更字段名，不保存客户备注、跟进内容、描述、金额等字段值。

## 3. 数据库与安全

- Migration versions：`20261124223326`、`20261124223414`、`20261124223517`、`20261124223644`、`20261124224743`。
- 最终活动表：`public.company_record_activity_history`。
- 过渡表 `company_record_activity` 已确认为空并在清理 migration 中删除。
- 启用 RLS，不创建客户端策略；撤销 public、anon、authenticated、service_role 的直接表权限。
- 触发器函数为 SECURITY DEFINER，空 search_path，普通角色没有函数 EXECUTE 权限。
- RPC：`company_list_activity_history`，先执行现有 `company_assert_access(username,password)`，按 owner + record_id 限定结果，支持分页。
- Edge Function：`GET /activity-history?record_id=...&limit=...&offset=...`，沿用现有 Basic 认证、IP 限流、CORS 和 no-store。
- RPC 仅授予 service_role；前端不直接连接数据库。

## 4. 前端

- 现有项目、任务、跟进及客户记录的「状态历史」入口升级为「活动历史」。
- 时间线合并创建、字段修改、状态变化、删除事件，按时间倒序展示。
- 修改事件只显示变更字段名称，不显示字段值。
- 支持完整分页读取、错误提示、简体中文/英文/日文。
- 旧记录没有历史时显示明确的空状态，不把缺失历史解释为没有发生过修改。

## 5. 验证与交付纪律

- `scripts/validate-v10.62.mjs` 检查 migration、RLS、RPC、API 路由、UI 事件渲染和版本合同。
- 保留 V10.50–V10.61 验证。
- 不运行 Nightly Playwright；真实浏览器验收暂缓，不阻断后续开发。
- 数据库 migration 已应用；未创建、修改或删除任何真实业务记录用于测试。

## 6. 部署记录

- 目标版本：V10.62.0。
- Supabase 项目：`kopvznygsqsheibsjjvv`。
- 数据库：五个 migration 均已应用；最终活动表存在，RLS 开启，过渡表已删除。
- 功能 PR #78 已 squash merge；合并提交：`5441c765f02c1547a2bb247506b67690955c265e`。\n- PR 验证 workflow run #460（`45504537485`）：completed / success；JavaScript 语法检查、历史回归和 V10.62 专项验证均通过。\n- Supabase Edge Function `company-api` v9 已部署，状态 ACTIVE，`verify_jwt=false`（沿用函数内部 Basic 认证）。\n- 数据库最终状态：RLS enabled；anon/authenticated 无法执行历史 RPC；service_role 可执行；活动历史表当前 0 行（未插入测试业务数据）。\n- GitHub Pages 对应 build/deploy 成功证据尚未取得，因此不标记为已部署；真实浏览器验收按用户安排暂缓。
- GitHub Pages build/deploy 需以合并后对应 Actions 成功结果为准；未确认前不报告前端已部署。
