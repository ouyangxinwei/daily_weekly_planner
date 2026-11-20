# 运行日志系统专项设计与阶段验收

> 本文整合运行日志基础设计、四个实施阶段的技术说明和阶段验收记录。原始正文按来源路径保留；阶段验收状态仅表示对应版本当时的记录。


---

## 原文件：`docs/runtime_logging_V1.0_final_spec.md`

# 运行日志系统 V1.0 — 最终开发规格

- 项目：慢慢计划（daily_weekly_planner）
- 规格版本：V1.0
- 目标应用版本：V10.16 起分阶段交付
- 状态：用户确认，按 Phase 1–5 实施
- 约束：在现有系统上增量开发；不重写业务引擎；不改变四模块业务数据结构、JSON 备份格式、Supabase RPC 或数据库 schema。

## 1. 目标

在应用内部提供统一运行日志能力，让用户无需打开浏览器开发者工具即可查看重要操作、函数调用、执行结果、警告与错误。日志机制须能说明某个重要函数是否进入、何时开始、执行到哪一步、何时结束、耗时多久及失败原因。

## 2. 已确认的全局规则

| 项目 | 规则 |
|---|---|
| 保存位置 | 当前设备浏览器 IndexedDB |
| 保留期限 | 30 天，启动/打开日志页面时清理过期记录 |
| 云端同步 | 不同步日志至 Supabase |
| 日志等级 | ERROR、WARN、INFO、DEBUG |
| DEBUG 默认值 | 关闭，可在日志设置中开启 |
| 建议容量上限 | 约 10,000 条；容量保护优先清理最旧 INFO/DEBUG，尽量保留 ERROR/WARN |
| 访问方式 | 应用内独立「运行日志」页面 |
| 语言 | 简体中文、English、日本語 |
| 终端设备 | 桌面和移动端 |
| 兼容原则 | 日志故障不得阻断业务操作；日志不写入四模块业务 LocalStorage 键 |

## 3. 日志等级

- ERROR：关键操作失败、数据读写失败、未捕获异常、云端同步失败等，必须记录。
- WARN：数据缺失或自动修正、存储空间风险、非预期但可恢复状态等，必须记录。
- INFO：重要用户操作、重要函数 START/END、数据处理阶段、同步阶段、健康检查结果等。
- DEBUG：仅在显式开启时记录详细调试信息，默认关闭；不得用于高频渲染循环。

每条记录包含：唯一 ID、毫秒级时间戳、等级、模块、功能名、函数名、阶段、结果、Execution ID、父级/关联 ID（适用时）、耗时、脱敏后的说明、错误名称/消息/堆栈（适用时）、应用版本。

## 4. 函数执行追踪

统一提供 Logger API（实现名称可按代码适配）：info、warn、error、debug、start、end、fail、cancel、list、getByExecution、cleanup、export。

重要函数采用 START → 执行过程 → END SUCCESS / END FAILED / END CANCELLED。每次用户操作分配 Execution ID，同一次操作的所有子函数共享该 ID，并可记录父级调用关系。必须覆盖 return、throw、Promise rejection、用户取消等出口；执行仍在运行时标记 RUNNING。页面关闭或意外中断而未写入终态时，下次检查可标记/展示 INTERRUPTED，不得伪造成功。

## 5. 日志覆盖范围

梳理现有代码的真实函数、调用关系和用户入口后逐项接入，至少覆盖：
1. 四个业务模块：计划、工作、外语学习、整理的新增、编辑、删除、完成状态、快速添加及模块切换。
2. 分类管理：新增、修改、删除、关联数据迁移。
3. 统计：读取、计算、模块切换与刷新。
4. 归档：归档、取消归档、恢复。
5. 回收站：移入、恢复、批量恢复、永久删除、清理。
6. 本地数据：初始化、读取、解析、校验、写入、迁移、JSON 导入导出、撤销。
7. 云端：登录状态、单模块上传/下载、四模块整体上传/下载、请求、校验、覆盖、失败恢复。
8. 页面初始化及重要公共工具函数。
9. 提醒与通知等现有重要异步功能。

覆盖清单以实际代码为准；不为凑日志而记录普通 DOM 渲染、每次变量变化或高频轮询。

## 6. 日志存储与生命周期

- 使用独立 IndexedDB 数据库/对象仓库，不改变业务数据 LocalStorage 键。
- 支持按时间、等级、模块、Execution ID 建立索引或等效高效查询。
- 过期清理规则为 createdAt 早于当前时间 30 天。
- 容量保护目标约 10,000 条；达到阈值时先清理最旧 DEBUG/INFO，若仍超限再按策略清理普通记录，ERROR/WARN 尽量保留。
- 写入采用异步方式；ERROR/WARN 尽可能及时持久化。IndexedDB 不可用或写入失败时，不得抛出异常破坏业务流程；可使用受限的内存降级队列并显示日志存储状态。
- 日志模块不得通过记录自身写入失败来递归触发无限日志。
- 导出支持 JSON/CSV；导出前再次脱敏。
- 用户清空日志需二次确认。30 天自动清理与容量清理均不改变业务数据。

## 7. 安全要求

不得记录密码、访问码、Supabase URL 中的敏感参数、公开/私有密钥、Token、会话凭据、完整备份内容或完整个人业务记录。对异常对象、请求信息、URL、用户输入和堆栈执行脱敏/截断。日志仅用于当前浏览器本地诊断，不上传云端。导出时应用相同脱敏规则。

## 8. 应用内「运行日志」页面

- 总览：日志总数、ERROR 数、WARN 数、最近错误时间。
- 列表：时间倒序、等级标识、模块、功能、函数、阶段和结果。
- 筛选：ERROR/WARN/INFO/DEBUG、模块、日期范围。
- 搜索：功能名、函数名、消息、错误文本。
- 详情：完整脱敏字段、错误堆栈、Execution ID、前后关联日志。
- 执行链路：按 Execution ID 展示同一次操作的 START、子步骤、END，支持识别 RUNNING/INTERRUPTED。
- 管理：刷新、JSON/CSV 导出、清理全部日志（二次确认）。
- 移动端采用适配布局，不能依赖开发者工具。

## 9. 系统健康检查

增加独立健康检查入口。检查本地四模块数据可读取性及结构、日志 IndexedDB 可读写、关键初始化状态、Supabase 连接状态（只读/无副作用检查）、当前应用版本与 GitHub Pages 部署状态（如现有部署检查接口可用）。每项结果记录 INFO/WARN/ERROR 并显示检查时间。健康检查不得修改、覆盖、迁移或删除业务数据；网络不可用应区分「无法检查」与「检查失败」。

## 10. 异常捕获

为 window 未捕获错误、unhandledrejection 和重要业务函数异常建立统一记录；全局监听是补充，不能代替业务层显式 catch/fail。记录错误发生位置、模块、函数、Execution ID、错误名称/消息/可用堆栈及相关阶段。不得吞掉原有异常或改变业务既有失败处理。

## 11. 性能与兼容性

- 日志异步写入，避免阻塞交互；不在渲染循环中产生大量日志。
- 日志初始化失败不得阻断主应用启动。
- 支持现有 PWA/Service Worker 缓存策略；每次资源变更更新缓存名。
- 不改变 schemaVersion、四模块存储键、JSON 备份结构、Supabase RPC/JSONB 结构或登录流程。
- 保持现有中英日语言体系。
- 日志系统自身异常需隔离并防止递归。

## 12. 分阶段实施与交付

### Phase 1 — 日志基础设施
建立 Logger 核心、IndexedDB 存储、统一记录结构、30 天清理、容量保护、脱敏、全局异常捕获基础及最小启动日志。完成存储与失败隔离测试。此阶段不要求完整日志 UI。

### Phase 2 — 日志查看页面
增加应用内运行日志入口、总览、筛选、搜索、详情、Execution ID 链路、导出、手动清理及中英日文案。完成桌面/移动端验收。

### Phase 3 — 四模块及公共函数追踪
按真实代码清单接入四模块业务操作、分类、统计、归档、回收站、撤销、提醒和关键公共函数。验证 START/END 成对、异常终态与执行链路。

### Phase 4 — 数据与云端专项追踪、健康检查
覆盖本地存储、迁移、JSON 备份恢复、单模块及整体云端同步、校验、覆盖和失败恢复；加入系统健康检查；验证日志不泄露凭据、不改变业务数据。

### Phase 5 — 综合回归与正式发布
进行功能回归、异常路径、持久化、30 天清理、容量保护、导出脱敏、PWA 缓存、移动端、多语言、性能和健康检查验收；更新 README、CHANGELOG 中英日、技术手册及版本记录，完成 GitHub Pages 发布确认。

## 13. 各 Phase 发布门槛

每个 Phase 独立提交并发布一个可识别版本。交付说明必须包含版本号、Commit SHA、变更文件/功能、测试结果、GitHub Actions 构建与 Pages 部署状态、真实访问链接。未确认部署成功时必须明确标记未部署，不得将提交链接冒充线上访问链接。阶段失败时先修复当前 Phase，不跳过验收进入下一阶段。

## 14. 最终验收标准

- 重要操作可在应用内查看 START 与终态。
- 错误和警告有明确等级、模块、函数和原因。
- 同一操作可按 Execution ID 查看完整调用链及耗时。
- 关闭并重开应用后日志仍在。
- 超过 30 天记录可自动清理；容量保护有效。
- 日志不可用时业务仍可运行。
- 可搜索、筛选、查看详情、导出和清理。
- 导出与存储内容不包含密码、Token、密钥或完整敏感业务数据。
- 四模块、单模块同步和整体同步均有对应追踪。
- 健康检查不修改业务数据。
- 中英日、桌面和移动端均可正常使用。
- 原有四模块数据、统计、归档、回收站、JSON、Supabase 与 PWA 功能回归通过。


---

## 原文件：`docs/runtime_logging_phase2.md`

# V10.17 运行日志查看页面（Phase 2）

## 页面入口
主界面顶部「运行日志」按钮打开独立日志窗口。该页面读取 `window.AppLogger.list()`，不读取或修改四个模块业务数据。

## 功能
- 总览：日志总数、ERROR、WARN、最近错误时间、日志存储状态。
- 筛选：ERROR/WARN/INFO/DEBUG、模块、开始日期、结束日期。
- 搜索：功能名、函数名、模块、日志消息和脱敏详情。
- 列表：按时间倒序显示等级、时间、函数、模块、阶段、结果和消息。
- 详情：显示时间、等级、模块、函数、阶段、结果、耗时、版本、Execution ID、Span ID、Parent Span ID、消息、错误详情及脱敏数据。
- 执行链路：根据 Execution ID 重新查询全部相关记录，按时间排序显示，不受当前列表筛选结果限制。
- 导出：导出当前筛选结果为 JSON 或 UTF-8 CSV。
- 管理：手动刷新、DEBUG 开关、清空全部日志（二次确认）。
- 响应式：窄屏改为单列过滤与详情布局。

## 数据与安全
- 日志数据库仍为 `manman-planner-runtime-logs`，由 `logger.js` 管理。
- 只保存当前设备；不发起日志云端上传。
- 30 天保留策略与约 10,000 条容量保护沿用 Phase 1。
- JSON/CSV 只导出 Logger 已脱敏的记录。
- 所有日志文本通过 DOM `textContent` 创建，不把日志内容作为 HTML 执行。
- 清空日志不会触碰业务 LocalStorage、Supabase 或备份数据。

## 验收边界
Phase 2 提供查看和管理界面；四模块业务函数的完整 START/END 覆盖属于 Phase 3，数据/云端专项追踪与健康检查属于 Phase 4。


---

## 原文件：`docs/runtime_logging_phase3.md`

# V10.18 四模块重要操作追踪（Phase 3）

## 接入方式
在主应用内通过函数包装器为现有业务函数添加追踪。包装器仅负责建立 Logger span、调用原函数并记录终态；不替换业务算法，不改变原函数返回值和异常传播行为。Logger 不可用时直接调用原函数。

## 覆盖清单
- 四模块：统一使用当前 activeModule 标记 plan / work / language / organize。
- 模块与本地数据：load、loadModuleState、save、switchModule。
- CRUD 与状态：quickAddPlan、openDialog、closeDialog、commitState、deletePlan、archivePlan、removePlans、clearCurrentTab、clearCompletedInCurrentTab。
- 回收站与撤销：trashPlans、restoreTrashItem、cleanExpiredTrash、undoLastAction。
- 分类：confirmDeleteCategory、requestDeleteCategory。
- 备份：exportBackup、validateBackup。
- 其他重要入口：migrateLegacyPlanWorkCategory、requestNotificationPermission。

## 日志关联
- 每次包装函数调用写入 START。
- 正常返回写入 END / SUCCESS；返回 false 写入 END / NO_CHANGE。
- 抛出异常或 Promise rejection 写入 END / FAILED，并保留原异常传播行为。
- 嵌套同步调用通过父级 trace 共享 Execution ID，生成独立 Span ID 和 Parent Span ID。
- 统一记录耗时；不记录函数参数、完整任务对象或业务内容。

## 操作细节
统一数据提交函数使用既有 undoLabel 作为功能名称，因此勾选完成、工作状态变化、编辑、批量恢复等统一数据提交可按具体动作区分。用户取消确认而没有发生写入的路径不会伪造成功的业务写入记录；入口函数仍可留下操作执行记录。

## 数据与兼容性
- 日志继续存储于独立 IndexedDB；30 天清理、约 10,000 条容量保护沿用 Phase 1。
- 不上传日志，不改四模块 LocalStorage key/schema、JSON 备份结构、Supabase RPC 或数据库结构。
- 不包装 render / 高频 DOM 更新，避免日志噪声。
- 云端同步请求与整体覆盖的专项追踪、健康检查留在 Phase 4。


---

## 原文件：`docs/runtime_logging_phase4.md`

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


---

## 原文件：`docs/acceptance_V10.16_runtime_logging_phase1.md`

# V10.16 Phase 1 — 运行日志基础设施验收

## 自动/静态检查
- [ ] `logger.js` 已独立加载，且位于主应用内联脚本之前。
- [ ] Service Worker 预缓存包含 `logger.js`，缓存名已升级。
- [ ] 主应用版本显示 V10.16。
- [ ] Logger 初始化失败不会阻断主应用启动。
- [ ] 业务 LocalStorage 键、四模块 schema、JSON 备份和 Supabase RPC 未修改。

## 浏览器运行验收（发布后）
1. 使用正常 HTTPS 页面打开应用并完成登录。
2. 关闭页面后重新打开，确认应用仍能正常启动。
3. 在浏览器站点存储中检查独立 IndexedDB 数据库 `manman-planner-runtime-logs`，确认有启动追踪记录。
4. 确认启动追踪具有 START 与 END，Execution ID 相同，END 包含耗时。
5. 临时在测试环境触发一个未捕获错误，确认产生 ERROR；触发未处理 Promise rejection，确认产生 ERROR。
6. 在测试环境将 IndexedDB 禁用/阻断，确认应用仍可启动、业务页面仍可使用，日志进入有限内存降级状态。
7. 确认密码、Token、密钥等敏感字段经脱敏后不会以明文进入日志。
8. 验证 30 天清理及容量保护（建议在测试数据库写入模拟旧记录/超量记录后执行 cleanup）。
9. 重新打开页面，确认 IndexedDB 中的日志仍存在。

## 当前阶段边界
Phase 1 只交付日志基础设施及启动/全局异常基础记录。应用内日志列表、筛选、执行链路 UI、四模块业务函数追踪、健康检查将在 Phase 2–4 实施。未完成真实浏览器验证前，不将本阶段标记为完整验收通过。


---

## 原文件：`docs/acceptance_V10.17_runtime_logging_phase2.md`

# V10.17 Runtime Log Viewer — Phase 2 Acceptance

- [ ] Main screen shows the Runtime Logs entry after login.
- [ ] Viewer opens and displays total, ERROR, WARN, latest error and storage status.
- [ ] Level, module, date range and keyword filters work together.
- [ ] Entries are ordered newest first; empty results are explained.
- [ ] Selecting a row shows redacted fields, error details, IDs, span relationships and duration.
- [ ] Execution trace loads all records for the selected Execution ID even when list filters are active.
- [ ] JSON and CSV exports contain the current filtered result and valid escaping.
- [ ] DEBUG is off by default; toggling it persists locally and updates Logger settings.
- [ ] Clear-all requires confirmation and clears only the runtime-log database.
- [ ] Viewer is usable at desktop and mobile widths.
- [ ] Chinese, English and Japanese UI labels are available.
- [ ] Reloading the app preserves IndexedDB logs; no log upload request is introduced.
- [ ] Existing four-module, backup, cloud sync, release history and PWA checks pass.


---

## 原文件：`docs/acceptance_V10.18_runtime_logging_phase3.md`

# V10.18 Phase 3 — Operation Tracing Acceptance

- [ ] Open the app and verify initial local load / migration operations create START and END records.
- [ ] Switch between Plan, Work, Language and Organizer; verify module tags are correct.
- [ ] Quick-add and create a record in each module; verify operation label and commitState child trace.
- [ ] Edit a record and change category; verify START/END and elapsed time.
- [ ] Toggle completion and, in Work, change work status; verify distinct operation labels.
- [ ] Archive, move to Trash, restore, bulk restore/delete, undo and clean expired Trash; verify traces.
- [ ] Add, rename and delete a category with associated records; verify category operation traces.
- [ ] Export JSON backup and validate/import a backup; verify backup traces without logging file contents.
- [ ] Cause a controlled test exception in a wrapped operation; verify FAILED is recorded and original failure behavior remains.
- [ ] Verify nested synchronous calls share Execution ID and have distinct Span/Parent Span IDs.
- [ ] Confirm log details do not contain passwords, tokens, function arguments or full task records.
- [ ] Confirm DEBUG remains off by default and logs persist after reload.
- [ ] Confirm existing four-module data, backup, cloud sync, PWA and Phase 2 viewer remain functional.


---

## 原文件：`docs/acceptance_V10.19_runtime_logging_phase4.md`

# V10.19 Phase 4 — Data, Cloud Tracing and Health Check Acceptance

- [ ] Open System Health Check and verify app version / entry status.
- [ ] Verify all four local module partitions are readable and schema-checked without writes.
- [ ] Verify absent local module data is reported as a valid empty/default state.
- [ ] Verify malformed JSON or schema is reported as an error without repair or overwrite.
- [ ] Verify IndexedDB diagnostic write/read and log entry visibility.
- [ ] Verify Service Worker registration status.
- [ ] While signed in, verify Supabase planner_get_data read-only check; while signed out, verify Not Checked.
- [ ] Verify GitHub Pages status matches the current main commit; API/network unavailability is Not Checked, not deployment failure.
- [ ] Verify single-module and whole-cloud RPC requests create START and terminal records with method/path/status only.
- [ ] Verify whole-upload local snapshot, whole-download cloud validation, local persistence and rollback have execution traces.
- [ ] Trigger a controlled request failure and verify ERROR records while existing user-facing error handling remains intact.
- [ ] Confirm no passwords, session tokens, apikey values, request bodies or full business records appear in logs.
- [ ] Confirm health check does not modify any of the four business LocalStorage values.
- [ ] Confirm JSON backup format, schemaVersion, Supabase RPC/database contract and login flow are unchanged.
- [ ] Verify mobile layout and Chinese / English / Japanese labels.
