# 阶段 1-B：数据库最小实现

- 项目：`daily_weekly_planner`
- 模块：个人公司网站
- 文档状态：实施记录
- 实施分支：`company-website-phase-1b-database`
- 数据库项目：慢慢计划现有 Supabase 项目 `kopvznygsqsheibsjjvv`
- 对应迁移：`supabase/migrations/20261120110000_company_records.sql`

---

## 1. 本阶段交付范围

本阶段仅实现数据库层，不开发页面、不部署 Edge Function、不创建 Storage Bucket，也不修改慢慢计划现有登录、云同步或 `planner_cloud_data`。

已实现的数据库设计：

- 单一业务主表 `public.company_records`。
- 七种记录类型：customer、project、task、follow_up、transaction、document、file。
- 业务类型：trade、software、ecommerce。
- 金额使用 `NUMERIC(20,6)`，币种仅允许 JPY、CNY、USD；不做汇率转换。
- JSONB 保存变化频繁的业务字段。
- owner 关联现有 `planner_credentials.username`，第一版仅支持现有账号 `oooo`。
- 父记录和额外关联记录由数据库函数验证归属，不能跨 owner 关联。
- 启用 RLS，不创建浏览器直连策略；撤销 PUBLIC、anon、authenticated 和 service_role 的表级直接权限。
- 新业务 RPC 仅授权给 service_role；内部辅助函数不授予 API 角色。

## 2. RPC 接口

| RPC | 功能 | 参数约定 |
|---|---|---|
| `company_verify_credentials` | 验证账号 | `p_username`, `p_password` |
| `company_list_records` | 分页列表 | 账号密码、类型/业务类型/状态/标题关键词筛选、limit、offset |
| `company_get_record` | 读取单条 | 账号密码、record_id |
| `company_create_record` | 新建记录 | 账号密码、JSON 对象 `p_record` |
| `company_update_record` | 更新记录 | 账号密码、record_id、白名单 JSON 对象 `p_patch` |
| `company_delete_record` | 删除记录 | 账号密码、record_id |

列表每页默认 20 条、最大 100 条，只搜索标题。创建不接受客户端指定 owner/id/时间戳；更新不允许修改记录类型、owner、ID 和创建时间。删除前检查父子及额外关联引用，有引用时拒绝删除。

所有业务 RPC 在数据库内调用现有 `planner_check_password` 再次验证凭据。现有自定义认证只允许 `oooo`，因此当前 owner 也固定为 `oooo`。未来增加员工时需要单独设计账号归属迁移，不能直接放宽本阶段的校验。

## 3. 安全边界

1. `company_records` 开启 RLS，且没有给客户端角色创建策略。
2. 表权限不授予 anon、authenticated 或 service_role；数据操作通过 SECURITY DEFINER RPC 完成。
3. SECURITY DEFINER 函数统一设置空 `search_path`，显式使用 `public.` 限定对象。
4. PostgreSQL 默认向 PUBLIC 授予新函数 EXECUTE，因此迁移显式撤销公开及客户端角色权限，再只向 service_role 授予六个业务 RPC。
5. 两个内部辅助函数不对 service_role、anon、authenticated 或 PUBLIC 开放；只由数据库函数所有者在 SECURITY DEFINER 执行上下文内调用。
6. 不修改现有 `planner_check_password`、`planner_login`、`planner_get_data`、`planner_put_data`。
7. service_role Secret Key 只能由后续 Edge Function 在服务端使用，绝不能进入 GitHub Pages 或前端代码。

## 4. 最小验证计划与边界

本阶段最小验证包含：

- 检查表字段、主键、外键、约束、索引和 RLS。
- 检查 anon/authenticated/service_role 无法直接访问业务表。
- 检查六个业务 RPC 只允许 service_role 执行。
- 使用错误密码验证 RPC 拒绝请求。
- 在事务回滚环境中检查基础记录插入、读取、更新、删除，以及交易金额/币种约束。
- 确认现有计划数据表及旧 RPC 未被迁移修改。

由于当前没有把用户密码提供给数据库验证流程，本阶段不会读取或导出密码摘要，也不会伪造有效登录。真实凭据下的完整 RPC CRUD 将在 1-C Edge Function 联调时验证。

## 5. 变更与未包含内容

- 新增一张业务表，不新增业务拆分表。
- 暂不新增 IP 限流表；限流在 1-C Edge Function 中按来源 IP 实现。
- 暂不创建 Storage Bucket 或文件对象。
- 暂不创建 Edge Function。
- 暂不修改前端、应用 VERSION 或 Pages 部署。
- 本阶段数据库迁移需要在目标 Supabase 项目实际应用并通过 SQL 验证后，才能标记为完成；GitHub 文件提交/合并不代表数据库已更新。

## 6. 官方参考

- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
