# 阶段 1-G：项目任务管理

- 应用版本：V10.44.0
- 开发分支：`feat/company-project-task-management`
- Supabase 项目：慢慢计划现有项目 `kopvznygsqsheibsjjvv`
- 数据库表：复用 `public.company_records`
- 数据库迁移：无；现有 `record_type` 约束已包含 `task`
- Edge Function：扩展现有 `company-api`，计划部署 v4
- 认证：继续使用慢慢计划现有账号会话及服务端 Basic Authorization 校验

## 1. 业务范围

### 项目任务工作区
- 在个人公司网站工作区新增「项目任务」页面。
- 支持任务名称搜索、项目筛选、状态筛选和分页。
- 支持新增、查看列表、编辑和删除任务。
- 项目详情增加「管理任务」入口，进入已筛选到当前项目的任务列表。

### 任务字段
- 任务名称：必填。
- 所属项目：必填；每项任务必须关联一个项目。
- 任务状态：待处理（`todo`）、进行中（`in_progress`）、受阻（`blocked`）、已完成（`completed`）。
- 截止日期：可选。
- 任务说明：可选。

### 关联与删除
- 一个项目可以有多个任务；一个任务只能归属一个项目。
- 任务的客户归属由项目关联客户继承，不重复保存客户关系。
- 任务可以改派到同一账号的另一个项目。
- 被任务或跟进记录引用的项目不能直接删除；必须先删除或改派相关记录。
- 删除任务不得影响所属项目或同项目中的其他任务。

## 2. 数据模型与兼容

复用现有 `company_records`：
- `record_type = 'task'`
- `parent_record_id` 指向 `record_type = 'project'` 的项目。
- `status` 保存任务状态。
- `due_date` 保存可选截止日期。
- `data.description` 保存任务说明。

当前数据库约束和通用 RPC 已支持 task 记录类型、父记录外键、同账号关联校验和删除引用保护。当前生产库没有既有 task 记录，因此无需数据迁移。

## 3. API 与安全

- 创建、更新、删除任务继续复用通用 `POST/PATCH/DELETE /records`。
- 任务列表支持通用 `GET /records?record_type=task`。
- 按项目筛选使用 `GET /projects/:project_id/tasks`。
- Edge Function 在服务端验证：项目属于当前账号且记录类型确为 project；任务状态必须属于允许集合；更新任务时仍须关联有效项目。
- API 继续调用现有受限 RPC；浏览器不直接访问数据库，不接触 service-role/secret key。
- 不修改账号认证、RLS、计划模块同步或公司业务数据隔离。

## 4. 自动化验证

Playwright mock API 测试覆盖：
- 项目详情入口跳转到指定项目任务筛选。
- 创建任务并验证项目 ID、状态、截止日期和说明。
- 按项目列出任务。
- 编辑任务名称、状态、截止日期及项目关系。
- 删除任务。
- 项目删除仍通过现有关联保护；请求使用现有 Basic Authorization。
- 测试使用模拟 API，不写入生产业务数据。

真实浏览器验收在 Pages 部署后由用户执行，至少验证任务创建、刷新后仍存在、状态/截止日期编辑和项目关联。

## 5. 部署状态

本文件记录本阶段目标和实现边界。PR 合并、company-api v4 部署、Pages 构建部署及真实浏览器验收分别记录；任何一项未完成前，不将整阶段标记为已交付。

