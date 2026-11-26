# 当前开发交接

更新日期：2026-11-26

## 仓库与分支

- 仓库：ouyangxinwei/daily_weekly_planner
- 日常开发分支：development
- 正式稳定/部署分支：main
- 特别保留分支：feat/agent-plan-steps
- 日常工作只在 development；只有用户明确允许才合并 main。
- 本阶段没有创建 PR、没有合并 main、没有部署 Pages 或 Supabase Edge Function。

## 当前阶段

**V10.68.0 — 仓库管理私有云端化（仅 development，未部署）**

### 已写入代码

- 复用现有 PlannerCompanyContext 的 oooo 登录凭据和 company-api Basic 认证。
- 新增专用数据表 migration：supabase/migrations/20261126100000_repository_management_cloud.sql。
- 新增 repository_get_data / repository_put_data RPC：函数内重新验证现有账号凭据；RPC 仅授予 service_role。
- 新增 company-api GET/PUT /repositories 路由，包含请求体大小、字段、状态、优先级、GitHub URL、重复 ID/URL 校验；CORS 已允许 PUT。
- 仓库管理前端改为从云端读取、向云端保存；新增/编辑/删除/确认导入成功后才更新内存数据。
- 不再将仓库资料写入专用 LocalStorage；关闭窗口和登录状态变化时清空内存资料。
- 首次云端无数据时等待用户手动导入 JSON，不会自动上传 seed。
- JSON envelope 继续兼容 oooo.repository-management v1。
- VERSION、package.json、Service Worker cache name、三语 CHANGELOG、README、技术手册和模块说明已更新到 V10.68。

### 关键安全边界

- repository_cloud_data 独立于 planner_cloud_data 和其他业务数据。
- 表启用 RLS，撤销 public / anon / authenticated 直接访问。
- Edge Function 使用服务端 secret 调用 RPC；service-role/secret key 不进入浏览器。
- 现有单账号认证在 API 和数据库 RPC 两层验证。
- 旧版浏览器 LocalStorage 中的仓库记录不会自动迁移；如需保留，先导出 JSON 再导入。

## 尚未执行 / 不可宣称完成

- SQL migration 尚未应用到 Supabase。
- company-api Edge Function 尚未部署（线上仍为原版本）。
- GitHub Pages 尚未部署。
- 未执行本地 npm 验证、Deno 类型检查、浏览器验收或真实 API 测试。
- 因上述原因，V10.68 云端仓库功能目前还不能在线使用。

## 下一步

1. 用户本地运行 npm run test:validate:repositories-cloud 和 npm run test:validate:repositories；修复任何问题。
2. 用户明确授权后，应用 SQL migration 并部署更新后的 company-api Edge Function。
3. 再进行真实浏览器测试：未登录拒绝访问、登录读取空列表、导入 16 条、刷新读取、CRUD、重复导入预览/取消/确认、导出、保存失败保护。
4. 仅在用户明确允许时将 development 合并 main；随后检查 Actions 和 Pages 部署。
