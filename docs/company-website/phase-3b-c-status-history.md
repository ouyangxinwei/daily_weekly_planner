# Phase 3-B-C：业务状态变更历史（V10.61.0）

## 1. 目标与范围

为项目（project）、任务（task）和业务跟进（follow_up）建立真实、不可由前端伪造的状态变更记录。客户、交易、文档和附件不纳入本阶段状态时间线。

## 2. 记录规则

- 数据库触发器在记录创建时保存初始状态（old_status=null、新状态为创建状态）。
- 仅当 status 实际发生变化时新增事件；仅修改标题、说明、日期、关联关系或项目进度不生成状态事件。
- 每条事件保存 owner_username、record_id、record_type、old_status、new_status、changed_at。
- 时间由 PostgreSQL clock_timestamp() 生成，不接受客户端传入。
- 状态重复写入不会产生重复事件；重新打开后再次完成会记录新的完成事件。
- 项目/任务完成趋势按 new_status=completed 且 old_status 不为 completed 的事件时间统计；重新完成会作为新的完成事件计数。
- 初始状态即 completed 的新记录会作为该日完成事件计入。
- V10.61.0 上线前的状态历史不可从当前状态或 updated_at 可靠还原，因此不回填、不伪造历史。

## 3. 数据库与安全

- Migration：`20261124120058_company_record_status_history_phase_3b_c.sql`。
- 新表：`public.company_record_status_history`，外键关联 company_records，删除业务记录时级联清除对应历史。
- 启用 RLS；撤销 public、anon、authenticated、service_role 对表的直接权限。
- 触发器函数 SECURITY DEFINER，空 search_path，普通角色无 EXECUTE 权限。
- 读取 RPC：`company_list_status_history`；内部执行现有 `company_assert_access(username,password)`，并限定 owner、记录类型及记录 ID。
- RPC 只授予 service_role；前端不直接调用数据库，统一通过 Basic 账号认证的 company-api。
- Edge Function 新增 GET `/status-history?record_id=...` 或按 record_type 分页读取；沿用原有 CORS、请求限流、账号验证和 no-store 响应。

## 4. 前端

- 项目、任务和跟进列表新增「状态历史」入口。
- 对话框以时间倒序展示初始状态及后续每次状态变化。
- 支持按记录 ID 读取全部分页；读取失败明确显示错误，不伪装为空历史。
- 中、英、日三语；历史数据使用 textContent 渲染。
- 业务趋势继续显示最近 8 周 / 6 个月，但项目/任务完成数改为真实状态历史事件时间。

## 5. 验证

- `scripts/validate-v10.61.mjs` 覆盖初始状态、完成、重新打开、再次完成、历史时间归属、版本/路由/RLS/触发器合同。
- 保留 V10.50–V10.60 所有既有验证。
- 不运行 Nightly Playwright；用户实际浏览器验收可后补，不阻断后续独立开发。
- 数据库验证只检查 migration、触发器、权限和只读结构；不创建或修改真实业务记录。

## 6. 交付证据

- 目标版本：V10.61.0。
- 生产 Supabase 项目：`kopvznygsqsheibsjjvv`。
- 数据库 migration 已应用；历史表已建立，RLS enabled，表行数为 0（没有插入测试业务记录）。
- Security Advisor 中该表仅报告既有策略基线相同的 RLS Enabled No Policy 信息项；表直接权限已撤销，RPC 仅 service_role 可执行。
- 功能 PR #76 已 squash merge；合并提交：`c14c1cbadd93bf8cb62ce092732f60e69116730d`。
- Supabase Edge Function `company-api` v8 已部署，状态 ACTIVE，`verify_jwt=false`（沿用函数内部 Basic 认证）。
- GitHub Actions run/status 查询未返回该提交的可核验运行记录，因此不宣称 V10.61 验证 workflow 已通过。
- GitHub Pages 对应 build/deploy 成功证据尚未取得，不标记为已部署。
- 用户真实浏览器验收暂缓，不作为继续开发的阻断条件。
