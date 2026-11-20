# 部署与故障排查

## 1. GitHub Pages 发布

项目通过 GitHub Pages 发布静态应用。正式代码变更遵循独立分支 → PR → `main` 的工作流。

1. 将功能分支通过 PR 合并到 `main`。
2. 检查 GitHub Actions 中对应的 Pages build/deployment workflow。
3. 只有当对应部署 workflow 成功且部署目标与预期提交一致时，才报告已部署。
4. 打开 [在线应用](https://ouyangxinwei.github.io/daily_weekly_planner/) 验证页面。
5. 若应用显示旧版本，先刷新页面；已安装 PWA 可完全关闭后重新打开，等待 Service Worker 更新。

仓库提交成功、PR 合并成功和 GitHub Pages 部署成功是三个不同状态，不可互相替代。

## 2. Service Worker 与缓存

- 静态资源更新时检查 `sw.js` 的预缓存资源列表。
- 应用版本发布时更新 cache name，确保新资源进入新缓存。
- 不建议通过清除浏览器全部站点数据刷新版本，这可能删除尚未备份的本地业务数据。
- 如果页面异常，先保留数据并导出 JSON 备份，再检查浏览器控制台、网络请求和 Service Worker 状态。

## 3. 本地数据保护

- 计划、工作、外语任务、整理、成绩和未来模块的数据分区彼此独立。
- 外语学习工作区和公司网站业务数据也使用独立存储/服务边界。
- 修改数据或进行恢复前，优先使用应用内 JSON 导出。
- 云端下载是覆盖当前模块数据的操作；整体下载会影响对应的多个模块。必须先确认数据来源和界面提示。
- 不要通过清除 LocalStorage、IndexedDB 或浏览器站点数据来排查普通 UI 问题。

## 4. Supabase 初始化与认证

新建计划同步数据库时，在 Supabase SQL Editor 执行 `supabase-setup.sql`。随后按脚本注释单独创建初始账号。包含真实密码的初始化语句不得提交到公开仓库。

- 浏览器只配置项目 URL 和公开 publishable/anon key。
- 不要在网页中填写或提交 `service_role` key。
- 确认项目 URL 与公开 key 来自同一个 Supabase 项目。
- 账号验证和云端数据读写使用项目既有 RPC，具体见 [数据库认证设计](database_auth_design_document.md)。

## 5. 公司网站服务

个人公司网站通过 Supabase Edge Function `company-api` 访问 `company_records`。数据库、API、认证和各阶段实施说明见 [公司网站文档](company-website/README.md)。

排查时应分别检查：
- GitHub Pages 是否已部署包含对应前端资源的提交。
- `company-api` Edge Function 是否处于 ACTIVE 状态。
- Edge Function 的 CORS allowlist 是否包含当前前端 origin。
- 浏览器网络请求是否返回预期 HTTP 状态和 API 错误信息。
- 不要在前端暴露 service-role 或其他服务端密钥。

### 附件存储（V10.56.0 起）

- 附件依赖私有 Bucket `company-documents`（迁移 `20261121090000_company_documents_storage_stage_3a.sql`）和 company-api v6。部署命令：

  ```bash
  supabase link --project-ref kopvznygsqsheibsjjvv
  supabase db push
  supabase functions deploy company-api --no-verify-jwt
  ```

- 附件窗口显示“操作失败”：先确认 company-api 已部署 v6（v5 没有 `/files` 端点）。
- 上传失败：确认 Bucket 存在、文件 ≤10 MB 且类型在允许列表内；浏览器网络面板中 Storage `PUT` 请求的状态码。
- 下载链接打不开：签名链接 5 分钟后失效，重新点击“下载”即可；若返回“文件已不存在”，删除该附件记录后重新上传。
- Bucket 必须保持 private；不要为 `storage.objects` 添加 anon/authenticated 策略。

## 6. 常见问题处理原则

| 现象 | 建议检查 |
|---|---|
| 更新后仍显示旧界面 | Pages 部署状态、Service Worker 更新、浏览器刷新 |
| 登录失败 | Supabase URL/key 是否匹配、数据库 RPC 是否初始化、账号是否有效 |
| 云端数据与本机不一致 | 当前模块、最后同步时间、上传/下载方向、备份是否已保存 |
| 公司网站请求失败 | Pages 部署、company-api 状态、CORS、认证会话和 API 响应 |
| 本地数据无法保存 | 浏览器存储配额/隐私模式；先导出可读取的数据，不要直接清站点数据 |
| PWA 未更新 | 关闭所有应用窗口后重新打开，确认 SW 已激活 |

## 7. 部署状态汇报规则

- PR merged：只表示代码已合并。
- Actions validation passed：只表示相应自动检查通过。
- Pages deployment success：才表示对应提交已成功部署。
- 浏览器真实验证：单独记录用户实际访问和操作结果。
- 未检查到证据时明确写“未确认”，不要推断为成功。
