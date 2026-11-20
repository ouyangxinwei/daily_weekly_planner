# 阶段 1-H：项目任务与进度联动

- 应用版本：V10.45.0
- 开发分支：`feat/company-task-progress-linkage`
- Supabase 项目：`kopvznygsqsheibsjjvv`
- 业务表：`public.company_records`
- 数据库迁移：`20261120064000_company_project_progress_linkage_stage_1h.sql`
- Edge Function：继续使用阶段 1-G 的 `company-api` v4；本阶段只增加进度字段校验，计划部署 v5
- 用户验收基线：阶段 1-G 已由用户确认真实浏览器验收通过

## 1. 业务规则

项目进度提供两种模式：

### 手动模式
- 项目负责人设置 0–100 的整数百分比。
- 保存到 `data.manual_progress_percent`，并同步到当前显示字段 `data.progress_percent`。
- 任务新增、删除、状态变化或改派项目，不得覆盖手动进度。

### 自动模式
- 进度 = 已完成任务数 ÷ 项目任务总数 × 100%，四舍五入为整数。
- 所有任务等权；不根据截止日期、任务状态以外的字段或主观工作量加权。
- 没有任务时进度为 0%。
- 计算结果写入 `data.progress_percent`。
- 统计信息写入 `data.progress_task_completed` 和 `data.progress_task_total`。
- 新增/删除任务、任务状态变化、任务改派项目后，重新计算受影响项目。
- 切换到自动模式时立即计算当前任务比例。

### 模式切换
- 默认模式为手动，兼容既有项目。
- 自动模式保留最近一次手动进度在 `manual_progress_percent`。
- 自动切换回手动时恢复保存的手动进度，不采用自动计算值覆盖它。
- 项目列表和详情显示当前模式、进度百分比；自动模式额外显示完成数/任务总数。

## 2. 数据模型

不新增业务表，复用项目记录的 JSONB `data`：
- `progress_mode`: `manual` 或 `auto`；旧记录缺少字段时按 `manual`。
- `manual_progress_percent`: 最近一次手动设置的整数进度。
- `progress_percent`: 当前显示/计算后的进度。
- `progress_task_completed`: 自动模式已完成任务数。
- `progress_task_total`: 自动模式任务总数。

## 3. 数据库同步机制

使用 PostgreSQL 触发器而不是只在浏览器端计算：
- task INSERT / UPDATE / DELETE 后重算旧项目和/或新项目。
- project INSERT（自动模式）或 progress_mode 切换为 auto 后立即重算。
- 触发器在同一数据库事务中执行，避免 API 已成功保存任务但项目进度未更新。
- 同一项目行按 ID 顺序加锁，降低并发改派任务时的死锁风险。
- 触发器函数使用 `SECURITY DEFINER`、空 `search_path`、完整 schema 限定、按 owner_username 和 project ID 过滤，并撤销 PUBLIC/anon/authenticated 的直接执行权限。
- 项目记录不满足 owner/type 条件时跳过，不跨账号读取或更新数据。
- 项目仍保留阶段 1-G 的关联删除保护；不级联删除任务。

## 4. 前端交互

- 项目编辑器新增进度计算模式选择。
- 手动模式启用 0–100 数字输入；自动模式禁用手动输入并说明自动计算公式。
- 自动模式显示已完成任务数/全部任务数。
- 列表卡片和项目详情使用同一份持久化进度值。
- 三语界面：简体中文、English、日本語。
- 旧项目缺少模式字段时默认手动，并以旧 `progress_percent` 初始化手动进度，不丢失原值。

## 5. 自动化验证

Playwright mock API 测试覆盖：
- 新建项目的手动进度保存。
- 手动切换自动模式，自动输入框禁用。
- 新增任务后总任务数变化。
- 完成任务后进度按比例变化（0%、50%、100%）。
- 自动切回手动后恢复先前手动进度。
- 手动模式下任务状态变化不覆盖手动百分比。
- 再切回自动模式后重新按任务状态计算。
- 删除任务后总数和进度重新计算。
- 既有客户、项目、任务和跟进 CRUD 流程不回归。

## 6. 部署与验收状态

数据库迁移、company-api v5、Pages 部署、自动化测试和用户真实浏览器验收分开记录。未完成的项目不标记为已交付。真实验收使用测试项目和测试任务，不修改用户已有真实业务任务。
