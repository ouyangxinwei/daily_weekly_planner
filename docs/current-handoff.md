# 当前开发交接

更新日期：2026-11-26

## 最新开发交接：V10.70 仓库清单批量清空与 GitHub 全量提取（已正式发布）

- 版本：V10.70.0；PR #103 已合并 development，PR #104 已合并 main。
- main 合并提交：`c4cdb0d3c8762bc3805c9d39e2a1262e36bba2a6`；development 已恢复并同步到同一提交。
- 仓库管理「清空清单」具有数量提示和二次确认；取消不发送云端请求，确认后仅通过现有 `PUT /repositories` 写入空数组。
- 清空只影响当前账号的仓库管理数组，不删除 GitHub 真实仓库、原始 JSON 备份、Supabase 表行、planner 数据或 company records。
- GitHub 全量提取提示词已放入仓库管理界面入口和 `docs/github-repository-export-prompt.md`；要求使用已授权连接器分页读取可访问仓库，并输出现有 `oooo.repository-management` v1 导入格式。
- GitHub Actions run `45741431942` success（静态验证与 Playwright E2E）；GitHub Pages deployment run `45741431344` success。
- 无数据库 migration / company-api 部署变更。
- 本地 Windows 页面手动验收未在本次执行环境完成；CI 浏览器 E2E 已通过。正式页面可由用户进行最终视觉/操作确认。

## 仓库与分支

- 仓库：ouyangxinwei/daily_weekly_planner
- 日常开发分支：development
- 正式稳定/部署分支：main
- 特别保留分支：feat/agent-plan-steps
- 日常工作只在 development；只有用户明确允许才合并 main。
- Supabase migration 已应用；company-api 已部署为 v10。
- V10.68 已合并 main；Pages 部署与 GitHub Actions 验证均成功。development 已恢复并与 main 同步。

## 当前阶段

**V10.68.0 — 仓库管理私有云端化（数据库/API/Pages 均已部署，浏览器验收待完成）**

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

## 当前部署与验收状态

- SQL migration 已应用，`repository_cloud_data` 已存在且 RLS/权限检查通过。
- company-api 已部署为 v10，包含 `index.ts`、`list-all.ts`、`validation.ts`。
- GitHub Pages 已成功部署（Run `45732359753`）；GitHub Actions 验证通过（Run `45732358997`）。尚未完成真实浏览器登录、16 条导入、刷新持久化与 CRUD 验收。
- 本地 npm 专项验证和 Deno 类型检查未运行；前端 JS 语法解析及静态契约检查通过。

## 下一步

1. 使用现有账号登录页面，确认仓库管理 GET 返回空列表。
2. 导入本地 16 条 JSON，确认预览后写入云端；刷新页面再次打开，确认 16 条仍在。
3. 验收 CRUD、重复导入预览/取消/确认、导出及保存失败保护。
