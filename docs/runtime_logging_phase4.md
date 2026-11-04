# V10.19 数据与云端专项追踪、系统健康检查（Phase 4）

## 实施范围
- 对 Supabase RPC 请求建立独立 START / END SUCCESS / END FAILED 追踪；日志只记录请求路径、HTTP 方法和状态码，不记录 URL 查询参数、请求体、用户名、密码、apikey、Token 或云端业务快照。
- 对四模块整体上传前的本地快照读取、整体下载云端分区校验、本地四模块覆盖及失败回滚建立数据步骤追踪。
- 单模块与整体上传／下载的异常路径增加明确 ERROR 事件；底层 RPC 请求保留独立执行记录。
- 新增首页「系统健康检查」入口，支持手动重新检查。
- 检查项目：应用版本与入口、四模块 LocalStorage 可读取性和 schemaVersion / plans / categories / completions 结构、运行日志 IndexedDB 写入与读取、Service Worker 注册、Supabase 只读 RPC、GitHub Pages 当前 main 提交的部署记录。
- 未登录时 Supabase 显示「未检查」；网络/API 不可用时部署检查显示「未检查」，与部署失败区分。
- 检查结果按 ERROR / WARN / INFO 写入当前设备运行日志，并在页面显示检查时间和每项状态。

## 安全与数据保护
- 健康检查只读取四模块业务数据，不修改、不迁移、不覆盖、不删除业务数据。
- Supabase 健康检查只调用现有 planner_get_data RPC，不调用写入 RPC。
- 日志 IndexedDB 读写验证使用唯一诊断标记；不触碰业务 LocalStorage 键。
- 沿用既有单模块及整体同步确认流程和整体覆盖失败回滚逻辑。
- 不修改 LocalStorage 键、业务 schemaVersion、JSON 备份格式、Supabase RPC / 数据库结构或登录流程。
- 日志仍仅保存在当前设备，不上传云端；中英日及移动端布局沿用现有界面体系。

## 验收
- [ ] 四模块本地数据均可读取时显示正常；空数据区分为正常默认状态；损坏 JSON / 错误结构显示异常且不修复数据。
- [ ] 日志 IndexedDB 写入后可检索到诊断记录。
- [ ] Service Worker 注册状态正确显示。
- [ ] 已登录时 Supabase 只读检查成功；未登录时显示未检查。
- [ ] GitHub API 能读取当前 main 对应的 Pages workflow 成功状态；API 不可用时显示未检查。
- [ ] 单模块与整体上传／下载的 RPC 请求有 START / END 或 FAILED 记录。
- [ ] 整体上传的本地快照读取、整体下载的云端结构校验、本地覆盖和失败回滚均有步骤追踪。
- [ ] 人为造成 RPC 错误或本地存储失败时，运行日志保留错误；原有用户提示和异常处理继续生效。
- [ ] 日志中不出现凭据、请求体或完整业务数据。
- [ ] 四模块 LocalStorage 键、JSON 备份、Supabase RPC 与数据库结构保持不变。
- [ ] 桌面、移动端及中英日界面可使用；Service Worker cache 已更新。
