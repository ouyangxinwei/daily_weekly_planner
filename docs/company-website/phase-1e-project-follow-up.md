# 阶段 1-E：项目管理与业务跟进

- 应用版本：V10.42.0
- 开发分支：`feat/company-projects-follow-ups`
- Supabase 项目：慢慢计划现有项目 `kopvznygsqsheibsjjvv`
- 数据库迁移：无
- Edge Function：复用现有 `company-api` v3；无部署变更

## 1. 功能范围

### 项目管理

- 项目列表、标题搜索、状态筛选和分页。
- 新建、编辑、删除项目。
- 每个项目必须关联一个客户；项目业务类型从客户资料继承。
- 项目状态：计划中、进行中、暂缓、已完成、已取消。
- 项目字段：项目名称、客户、开始日期、预计完成日期、项目说明。

### 业务跟进

- 跟进列表、标题搜索、状态筛选和分页。
- 新建、编辑、删除跟进记录。
- 每条跟进必须关联客户，可选关联该客户的项目。
- 跟进方式：电话、邮件、会议、即时消息、其他。
- 跟进字段：主题、客户、可选项目、跟进时间、结果、下次跟进日期、备注、状态。
- 跟进状态：待跟进、已完成。

## 2. 数据模型

继续使用 `public.company_records`：

| 功能 | record_type | 关系与字段 |
|---|---|---|
| 项目 | `project` | `parent_record_id` 指向客户；`record_date` 为开始日期；`due_date` 为预计完成日期；`data.description` 保存说明 |
| 跟进 | `follow_up` | 有项目时 `parent_record_id` 指向项目，并通过 `related_record_ids` 关联客户；无项目时 `parent_record_id` 指向客户 |
| 跟进扩展字段 | JSONB | `customer_id`、`project_id`、`method`、`outcome`、`next_follow_up_date`、`notes` |

数据库现有 RPC 会校验父记录和关联记录的 owner。删除仍被其他记录引用的客户或项目时，数据库拒绝删除，前端显示可理解的错误，不执行级联清理。

## 3. API

复用已部署的通用记录路由：

- `GET /records?record_type=project`
- `POST /records` 创建项目或跟进
- `PATCH /records/:id` 更新项目或跟进
- `DELETE /records/:id` 删除项目或跟进
- `GET /customers` 获取关联选择器所需客户资料

更新请求不发送 `record_type`，避免修改数据库中的不可变记录类型。所有请求继续通过当前内存登录会话的 Basic Authorization 访问 Edge Function。

## 4. 安全与兼容边界

- 不创建新业务表，不修改现有表、RLS、RPC 或 Edge Function。
- 不修改现有账号认证、Plan/Foreign Language 工作区、`planner_cloud_data` 和云端同步。
- 不在浏览器保存密码；不把 service_role/secret key 下发前端。
- 页面只通过 Edge Function 访问业务数据，不直接访问表或 RPC。
- 项目删除如果存在跟进引用会被数据库拒绝；用户需先处理相关跟进记录。
- 客户与项目选择器当前最多预载 100 条记录；超出后续再增加服务端关联筛选能力。

## 5. 验证策略

新增 `tests/e2e/company-business.spec.js`，使用 mock API 覆盖：

- 项目创建并关联客户。
- 跟进创建并关联客户及项目。
- 跟进编辑和删除。
- 检查请求使用 Basic Authorization。
- 检查关联 ID 写入请求数据。

测试不使用真实账号密码、不连接真实业务写入、不创建生产数据。真实账号下的项目/跟进 CRUD 仍需部署后由用户在自己的浏览器验证。

## 6. 当前状态

代码已在独立功能分支开发。GitHub Actions、PR 合并和 Pages 部署结果应以本阶段后续部署记录为准；在自动测试和部署完成前，不标记为已发布。
