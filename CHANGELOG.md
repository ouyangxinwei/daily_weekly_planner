## V10.9 · priority_sorting — 2026-11-03

- 将「优先级（未完成优先）」设为默认排序，适用于每日、每周、每月、每年及随机临时计划视图。
- 优先级排序先按完成状态分组：未完成在前、已完成在后；各组内部按 5 星至 1 星降序排列。
- 同星级任务保持当前原始列表中的相对顺序，不再按创建时间倒序打乱。
- 保留原始顺序、名称 A–Z、最近添加、最早添加等排序方式；用户选择的排序模式单独保存在浏览器 LocalStorage，刷新后恢复。
- 排序只改变显示顺序，不修改任务数据、创建时间、完成记录或 Supabase 快照，不触发任务保存事务，无需数据库迁移。
- 更新项目说明、需求、验收、影响分析及交付文档，并升级 Service Worker 缓存版本。

## V10.8 · release_history_and_deploy_status — 2026-11-03

- 首页顶部新增「版本与更新记录」入口，弹窗展示从 V0 至当前版本的完整 CHANGELOG。
- 更新履历从 GitHub main 分支实时读取，网络不可用时提供 GitHub 文档链接。
- 弹窗显示当前运行版本，并可刷新 GitHub Pages 部署状态。
- 部署判断通过 GitHub API 比较 main 最新提交 SHA 与对应的 Pages build and deployment workflow：成功、进行中、失败或等待记录；显示提交短 SHA、更新时间及 Actions 运行链接。
- 部署状态是 GitHub Actions 工作流结果，不等同于对用户设备缓存已更新的保证；PWA 仍可能因缓存需要重新打开。
- 不修改计划数据结构、保存逻辑或 Supabase 数据库；升级 Service Worker 缓存名。

## V10.7 · quick_add_plan — 2026-11-02

- 在计划列表中增加常驻快速添加输入框，可直接输入名称并按 Enter 或点击“添加”创建计划。
- 快速添加默认加入“每日”计划，默认未完成、未分类、1 星，不设置提醒；成功后切换到每日视图并清空输入框，便于连续录入。
- 快速添加复用 V10.6 `commitState()` 事务保存；只有 LocalStorage 写入成功后才清空输入框、刷新界面并提示成功。失败时保留输入内容。
- 不改变 `schemaVersion: 1`、现有计划字段结构、完整新增／编辑表单或 Supabase 数据库，无需 SQL 迁移。
- 更新 PWA 缓存名、README、功能说明、技术手册、部署说明及验收文档。

## V10.6 - save consistency - 2026-11-02

- Added a shared transaction helper that persists a candidate state before replacing the live state.
- Save failures no longer show successful completion for create, edit, completion, delete, archive, restore, permanent delete, import, cloud download, undo, or cleanup.
- Undo history and UI refresh now follow successful persistence.
- Existing schemaVersion 1 and cloud data format are unchanged. No database migration is needed.
- Updated the service worker cache. Browser failure-path tests remain required.

## V10.5 · five_star_priority — 2026-11-02

- 将计划优先级从 1–3 星扩展为 1–5 星，1 星最低、5 星最高。
- 新增 4 星与 5 星选项；原有 1/2/3 数值原样保留，不进行重新映射。
- 更新优先级输入控件、列表星形显示及高优先级排序的有效范围；移动端优先级选项允许换行。
- JSON 导入、导出、本地数据和 Supabase JSONB 云端快照沿用原字段 `priority`，可直接保存 4/5；PDF 从列表无障碍标签读取星级。
- 旧任务或旧备份缺少优先级仍默认为 1 星；超出 1–5 的异常值仍回退为 1。
- 更新使用说明、技术手册、需求、验收、影响分析、迁移与交付文档及 PWA 缓存版本。
- 保持 `schemaVersion: 1`，无需 Supabase SQL 迁移。

# 更新记录

## V10.4 · pdf_export — 2026-11-01

- 新增“导出 PDF”入口，导出当前页面实际可见的计划，遵循当前周期、搜索词、分类筛选及排序。
- 生成独立的打印排版页，支持浏览器打印对话框中选择“另存为 PDF”；不依赖外部 PDF CDN 或额外构建步骤。
- 每条计划作为独立排版单元，设置 `break-inside: avoid` / `page-break-inside: avoid`，减少计划记录跨页拆分。
- PDF 包含计划标题、分类、优先级、提醒时间、参考网站、备注、完成状态及导出元信息；长 URL 和备注自动换行，支持中文字体回退。
- 更新需求、验收、影响分析、技术手册、功能说明、部署排障、README 与 Service Worker 缓存版本；不修改数据结构，无需 SQL 迁移。
- 限制说明：若某一条记录自身内容超过一整页的可打印高度，浏览器打印引擎仍可能拆分页；页面采用紧凑排版降低此情况发生概率。


## V10.3 · reference_website — 2026-11-01

- 在编辑计划表单中，日期与提醒时间和备注之间新增“参考网站”输入字段。
- 保存时将参考网站 URL 随计划保存；编辑时可修改或清空。旧计划缺少该字段时自动兼容为空。
- 计划列表在备注上方显示有效参考链接；点击使用新标签页打开，并设置 `noopener noreferrer`，不替换当前系统页面。
- 对无效 URL 不生成可点击链接，不弹出错误提示；支持输入完整 HTTP/HTTPS URL，或自动为普通域名补全 HTTPS。
- 搜索范围包含参考网站字段；本地保存、JSON 导入导出和 Supabase JSONB 快照同步均沿用现有数据结构，无需数据库迁移。
- 更新需求、验收、影响分析、技术手册、功能说明、部署说明、README 与 Service Worker 缓存版本。

## V10.2 · remove_login_lockout — 2026-11-01

- 移除 `planner_check_password` 的登录失败次数统计与连续失败 5 次锁定 10 分钟逻辑。
- 新版初始化 SQL 不再创建 `planner_login_attempts` 表。
- 新增 `docs/migration_V10.2_remove_login_lockout.sql`，用于更新已部署的 Supabase 数据库并删除旧统计表。
- 保留 `planner_login`、`planner_get_data`、`planner_put_data` RPC 接口和 bcrypt 密码摘要校验。
- 更新需求、验收、影响分析、部署排障及技术文档，并升级 Service Worker 缓存版本。
- 风险说明：移除失败次数锁定会降低对密码猜测的防护。

## V10.1 · trash_undo_archive_entryfix — 2026-11-01

- 修复首页缺少“回收站”和“已归档”入口的问题。
- 修复因入口 DOM 元素缺失导致初始化事件绑定报错的风险；入口事件绑定增加防御性检查。
- 更新 Service Worker 缓存名称，确保部署后加载修复版页面。

## V10 · trash_undo_archive — 2026-11-01

- 删除单条计划、清空当前周期及清理已完成计划时，改为移入回收站，不再直接永久删除。
- 新增回收站：支持单条恢复、批量选择恢复、永久删除、清空回收站，并显示删除时间与剩余保留时间。
- 回收站项目默认保留 30 天；页面启动时及运行期间定期清理过期项目。
- 新增归档与取消归档；归档计划从普通列表和进度统计中隐藏，但不会删除数据。
- 编辑计划、切换完成状态、归档/取消归档、移入回收站及恢复操作支持短时撤销。
- JSON 备份和 Supabase 云端快照兼容回收站、归档状态；云端数据仍采用完整快照上传/下载。
- 更新 README、需求文档、验收文档、影响分析与 Service Worker 缓存版本。
- 数据仍存储在现有 Supabase JSONB 快照中，无需数据库结构迁移；SQL 文件仅需保留现有版本。


## V9 · database_auth — 2026-10-29

- 移除前端固定访问码，改为 Supabase 数据库用户名/密码认证。
- 新增凭据摘要、失败尝试锁定和仅经 RPC 调用的云端数据读写。
- 保持单账号 `oooo`；提供初始化 SQL，不把初始密码写入公开项目文件。
- 登录凭据仅保存在当前页面内存，刷新后需重新登录。
- 更新 Service Worker 缓存版本。


## V8 · access_gate — 2026-10-29

- 新增访问密码入口，输入访问码后进入计划系统。
- 每个浏览器会话验证一次，关闭浏览器会话后需重新输入。
- 修复本地 file:// 打开时通过密码后入口遮罩未隐藏的问题，并兼容会话存储受限的环境。
- 更新 Service Worker 缓存版本。


## V7 · cloud_sync — 2026-10-29

- 新增 Supabase 邮箱注册、登录、会话刷新和退出登录。
- 新增按账号隔离的云端数据快照，支持手动上传本机数据或下载云端数据。
- 增加首次同步替换提示、RLS 数据库脚本和连接配置说明。
- 更新 Service Worker 缓存版本。

## V6 · reminders — 2026-10-28

- 新增计划日期与提醒时间字段，列表显示设置的提醒时间。
- 到时向已授权的浏览器发送一次通知；仅提醒尚未完成的计划。
- 提醒信息纳入本地数据与 JSON 备份，旧备份兼容无提醒字段。
- 更新 Service Worker 缓存版本。

## V5 · bulk_clear_controls — 2026-10-28

- 每个普通和随机计划标签新增“清空当前标签计划”及“清空当前标签已完成”按钮。
- 两种批量删除操作均在确认后执行，只影响当前标签，并删除相关完成记录。
- 空列表或无已完成条目时禁用对应按钮。
- 更新 Service Worker 缓存版本。

## V4 · random_temporary_plans — 2026-10-28

- 新增每日随机、每周随机、每月随机临时计划视图。
- 临时计划只在创建时所在的日／周／月周期有效，过期后自动清除。
- 临时计划沿用分类、优先级、搜索、排序、完成状态和 JSON 备份功能。
- 更新 Service Worker 缓存版本。

## V3 · priority_stars — 2026-10-28

- 新增 1–3 星优先级选择，使用内嵌 SVG 矢量星形显示。
- 计划列表显示优先级，新增按高优先级排序。
- JSON 备份保存优先级；旧数据缺少该字段时默认 1 星。
- 更新 Service Worker 缓存版本。

## V2 · categories_search_sort — 2026-10-28

- 新增工作、学习、生活、健康、财务、兴趣和未分类类别。
- 新增按类别筛选、按名称或备注搜索。
- 新增默认顺序、名称和创建时间排序。
- JSON 备份包含类别；导入旧备份时缺失类别自动归入“未分类”。
- 更新 Service Worker 缓存版本。

## V1 · json_backup — 2026-10-28

- 新增 JSON 备份导出，包含全部计划及完成记录。
- 新增 JSON 备份导入，支持结构校验、导入数量预览和替换确认。
- 更新 Service Worker 缓存版本。
- 保留 V0 的计划管理与本地保存功能。

## V0 · firstVersion — 2026-10-28

- 建立每日、每周、每月、每年四个计划视图。
- 支持新增、编辑、删除、完成计划与完成进度统计。
- 计划数据保存在当前浏览器本地存储中。
- 提供 GitHub Pages 部署说明、PWA manifest 与离线缓存。
- 创建产品说明、技术手册、AI 协作指南和部署排障文档。
