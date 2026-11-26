# V10.71 启动入口分流与管理员后台监控（2026-11-26，development，未部署）

- 启动页增加「个人入口 / 管理员入口」分流。个人入口复用既有数据库登录和个人工作区；管理员入口不登录，打开独立只读监控页。
- 管理员监控复用既有系统健康检查、运行日志、版本/部署状态和 GitHub Actions 测试状态；不显示个人计划、账号同步、仓库清单或公司业务编辑入口。
- 不新增认证、权限、数据库 migration、RPC、RLS、Edge Function 或 API 变更。管理员入口是公开可进入的学习阶段监控页面，不构成安全边界。
- 代码涉及 index.html、entry-flow.js、entry-flow.css、sw.js、i18n.js、VERSION、package.json、README、三语 CHANGELOG、当前交接与入口模式文档。
- 遵循当前「开发优先、测试项记入文档」约定，未新增自动化测试、未运行本地 E2E；待测项见 docs/user-role-mode.md。
- 当前只在 development，未合并 main、未部署 Pages。

---

