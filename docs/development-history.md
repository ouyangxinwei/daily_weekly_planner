# 开发历史与历史交付档案

> 集中保存早期按版本拆分的需求、影响分析、验收、迁移说明和交付记录。整合仅减少文件数量，不删减历史信息。各章节保留原始正文和来源路径；其中的测试、验收、Actions 与部署状态均代表当时记录，不代表当前版本状态。

当前功能请查看 [功能与系统说明](feature_and_system_guide.md)；架构入口请查看 [项目总览](project-overview.md)；技术细节请查看 [技术手册](technical_manual.md)。SQL 迁移脚本仍以独立可执行文件保留。


---

## 原文件：`DELIVERY_NOTES_V10.10.md`

# 慢慢计划 V10.10 交付说明

## 新增功能
- 首页 1–5 星未完成任务数量统计。
- 统计每日、每周、每月、每年正式计划；排除已完成、已归档及随机临时计划。
- 点击星级进入该星级未完成任务最多的周期；并列按每日、每周、每月、每年优先。
- 自动清除搜索和分类筛选，保留排序偏好；滚动至第一条匹配任务并短暂高亮。
- 零数量星级不可点击。

## 影响
仅新增统计和导航交互，不修改任务数据、完成记录、保存事务、撤销机制、JSON schema 或 Supabase 数据结构。无需 SQL 迁移。

## 修改文件
- index.html
- sw.js
- README.md
- CHANGELOG.md
- docs/feature_and_system_guide.md
- docs/technical_manual.md
- docs/deployment_and_troubleshooting.md
- docs/requirements_V10.10_star_dashboard_jump.md
- docs/acceptance_V10.10_star_dashboard_jump.md
- docs/impact_analysis_V10.10_star_dashboard_jump.md
- DELIVERY_NOTES_V10.10.md

## 验证说明
已进行源代码结构检查与规则模拟；真实浏览器／手机 PWA 端到端测试仍需用户设备验收。GitHub Pages 部署状态以 V10.10 提交对应的 Pages workflow 为准。


---

## 原文件：`DELIVERY_NOTES_V10.11.md`

# V10.11 交付说明

## 版本
V10.11 · Multilingual UI

## 功能
- 简体中文、English、日本語三种系统界面。
- 默认中文；切换后立即生效并记住上次选择。
- 登录页和应用首页均可切换语言。
- 系统菜单、计划周期、分类显示、搜索筛选排序、表单、弹窗、确认提示、操作反馈、回收站、归档、云端同步、日期时间、通知、PDF 和版本履历按当前语言显示。
- 用户输入的计划名称、备注、参考 URL、用户名等个人内容不翻译。
- 三种语言的界面资源可离线使用。

## 数据兼容
不修改计划数据、schemaVersion、JSON 备份或 Supabase 结构；无需数据库迁移。语言偏好独立保存于 `personal-planner:language:v1`。

## 文件
`index.html`、`i18n.js`、`sw.js`、`CHANGELOG.md`、`CHANGELOG.en.md`、`CHANGELOG.ja.md` 及更新后的 README、功能说明、技术手册、部署说明和 V10.11 需求/验收/影响分析文档。

## 测试
交付时需区分静态语法、字典与规则模拟检查，以及真实浏览器/手机 PWA 测试；未实际执行的设备测试不会标记为通过。


---

## 原文件：`DELIVERY_NOTES_V10.12.md`

# 慢慢计划 V10.12 交付说明

- 版本：V10.12_custom_category_management。
- 分类管理支持添加、编辑、删除；保留原有七项及顺序。
- 新建与快速添加默认使用第一分类。
- 改名同步普通、归档及回收站计划；删除使用中分类时先选择目标并迁移，再删除。
- 分类操作使用事务保存，支持撤销；取消或失败不改变原数据。
- 分类随 JSON 备份／恢复和 Supabase 快照同步；旧数据兼容，schemaVersion: 1 不变，无 SQL 迁移。
- 中英日界面，自定义分类名称不自动翻译。
- 真实浏览器／手机 PWA／Supabase E2E 需在用户环境执行，不将未执行测试标记为通过。


---

## 原文件：`DELIVERY_NOTES_V10.13.md`

# V10.13 整理模块交付说明

## 版本
V10.13 · organize_module

## 主要交付
- 首页新增计划／整理模块切换。
- 整理初始分类：书籍、电子产品、软件/APP、网站、其他。
- 复用计划现有列表、编辑、快速添加、分类管理、归档、回收站、撤销和 PDF 导出能力。
- 整理数据独立保存在 personal-organizer:v1。
- JSON 备份通过 moduleType 分离。
- Supabase 快照增加 organizer 分区；上传先读远端并合并当前模块，下载仅恢复当前模块。
- 沿用现有 Supabase RPC，无 SQL 迁移。
- 更新中英日界面、PWA 缓存及完整文档和版本履历。

## 数据安全
- 计划原存储键 personal-planner:v1 不变。
- 整理使用 personal-organizer:v1。
- 计划与整理本地数据、分类、回收站和归档互相隔离。
- 上传整理时保留云端计划；上传计划时保留云端整理。
- 旧版云端计划快照兼容。

## 当前检查记录
- 静态代码检查：已核对计划／整理独立 LocalStorage 键、模块切换、五项默认分类、整理平铺列表、周期 UI 隐藏、moduleType 备份隔离、云端快照分区合并、旧计划根结构保留及中英日翻译键。
- Service Worker：已确认缓存版本升级为 `daily-weekly-planner-v10-13-organize-module`。
- 自动化检查：新增 `.github/workflows/validate-v10.13.yml`，由 GitHub Actions 执行 `node --check` 与模块隔离静态断言；本次尚未取得该工作流运行结果，因此不标记为通过。
- GitHub Pages：代码已提交到 main；当前无法从可用的 Actions 查询结果中核验与最新 main SHA 匹配的 Pages build/deploy 成功记录，因此部署状态标记为待核验。
- 真实浏览器、Android PWA、Supabase 线上端到端测试：尚未执行。

以上区分静态检查、自动化工作流和真实端到端测试；未实际执行的测试不宣称通过。


---

## 原文件：`DELIVERY_NOTES_V10.14.md`

# V10.14 交付记录

## 功能范围
- 固定四模块：计划、工作、外语学习、整理。
- 计划旧工作分类迁移到固定未分类。
- 工作分类与任务状态独立；工作状态跨日期保持。
- 外语学习分类不含挪威语。
- 四模块本地数据、JSON 备份、Supabase 分区隔离。
- 保留中英日、PDF、分类管理、归档、回收站、撤销和 PWA。

## 检查记录
- GitHub Actions 静态检查：已通过（PR #1，run #19；验证 JavaScript 语法与 V10.14 四模块静态契约）。
- 真实浏览器交互：尚未执行。
- Supabase 线上四分区上传／下载：尚未执行。
- Android PWA 安装与离线：尚未执行。
- Pages 部署：PR 合并至 main 后等待对应 main SHA 的 Pages build and deployment workflow；成功前不得标记部署完成。

## 数据安全
不修改 Supabase SQL schema；保留旧 organizer 云端分区和无 moduleType 的计划备份兼容。分类迁移保存失败时不覆盖旧数据。


---

## 原文件：`DELIVERY_NOTES_V10.2.md`

# V10.2 交付说明

- 基于 V10.1 回收站/归档/撤销版本。
- 移除 Supabase 项目自定义的连续失败 5 次、锁定 10 分钟机制。
- **现有数据库必须执行** `docs/migration_V10.2_remove_login_lockout.sql`；仅替换网页文件不会修改云端函数。
- 新数据库直接使用更新后的 `docs/supabase-setup.sql`。
- 保留登录与云端数据 RPC 接口，保留现有账号和计划数据。
- 验证范围：进行源码/SQL静态检查与 ZIP 完整性检查；未连接真实 Supabase 进行端到端登录验证。


## Filename compatibility update

Renamed documentation files whose archive names were garbled into descriptive English filenames. File contents and application behavior are unchanged by this packaging-only update.


---

## 原文件：`DELIVERY_NOTES_V10.4.md`

# V10.4 交付说明：PDF 导出

## 交付内容
- 完整项目 ZIP：`daily_weekly_planner_V10.4_pdf_export.zip`
- 新增“导出 PDF”，导出当前可见计划，遵循当前周期、搜索、分类筛选和排序。
- 使用独立打印布局，支持中文、长备注、长 URL 自动换行；每条记录应用防分页拆分规则。
- 已更新需求文档、验收文档、影响分析、技术手册、功能说明、部署排障、AI 协作指南、README、CHANGELOG 和 Service Worker 缓存版本。
- 无需 Supabase SQL 迁移；没有追加数据自动备份与恢复功能。

## 验证
- `node --check` 内联 JavaScript 语法检查通过。
- Chromium 自动化测试验证导出弹窗、当前搜索结果范围、中文显示及 CSS `break-inside: avoid`。
- 使用约 500 字符中文备注和约 2,000 字符 URL 生成 A4 PDF，实测 1 页，单条记录没有跨页拆分，中文文本可提取，长 URL 自动换行。
- 仍需在用户目标浏览器中实际确认打印对话框并选择“另存为 PDF”；浏览器弹窗策略和系统字体可能存在差异。

## 使用方法
点击页面顶部“导出 PDF”。系统会打开独立打印排版页，浏览器打印窗口中选择“另存为 PDF”并保存。若窗口被拦截，请允许本站打开弹出窗口。


---

## 原文件：`DELIVERY_NOTES_V10.5.md`

# V10.5 交付说明：五级优先级

## 交付内容
- 将优先级由 1–3 星扩展为 1–5 星。
- 1 星最低，5 星最高；旧数据 1/2/3 原值保留。
- 新建、编辑、列表显示、高优先级排序、JSON 导入导出、PDF 显示和云端 JSONB 快照均沿用统一数值。
- 手机端选项支持自动换行。
- 更新 README、CHANGELOG、功能说明、技术手册、部署说明、需求、验收、影响分析、迁移文档及 PWA 缓存版本。
- 不改变数据结构，不需要 SQL 迁移。

## 部署
上传完整项目文件，确保 `index.html` 与 `sw.js` 同时更新。所有使用同一云端数据的设备都应更新至 V10.5，避免旧版本把 4/5 星降级为 1 星。

## 验证说明
本次已完成代码与文档修改。目标浏览器、移动设备、实际 PWA 安装环境及用户 Supabase 项目的端到端验证尚需部署后执行，详见验收清单。


---

## 原文件：`DELIVERY_NOTES_V10.6.md`

# V10.6 交付说明

## 本次实现
- 统一候选状态保存入口 `commitState()`。
- 修复计划新建／编辑、完成状态、删除、批量删除、归档、取消归档、恢复、永久删除、批量操作、撤销、JSON 导入、云端下载及自动清理的失败处理。
- 更新用户说明、技术手册、部署说明、需求规格、验收测试、影响分析和迁移说明。
- Service Worker 缓存版本更新为 `daily-weekly-planner-v10-6-transactional-save`。

## 数据兼容
保持 `schemaVersion: 1`，无需数据库迁移。

## 验证状态
已完成 GitHub 源码更新及静态代码路径检查。当前环境未运行真实浏览器，LocalStorage 配额异常注入和 UI 端到端测试尚未执行；请按 `docs/acceptance_V10.6_transactional_save.md` 验收。


---

## 原文件：`DELIVERY_NOTES_V10.7.md`

# 慢慢计划 V10.7 交付说明

## 本次内容

新增「快速添加计划」：
- 计划列表进度条下方新增常驻输入框。
- 支持 Enter 和点击按钮提交。
- 默认加入每日计划，未完成、未分类、1 星，不设置提醒。
- 保存成功后切换至每日视图，清除搜索词与分类筛选，清空输入框并保持焦点，支持连续录入。
- 空名称不提交。
- 事务保存失败时保留输入内容，不显示成功提示。

## 技术影响

- 复用 V10.6 `commitState()`。
- 不修改计划数据结构及 `schemaVersion: 1`。
- 无需 Supabase SQL 或数据迁移。
- Service Worker 缓存名更新为 `daily-weekly-planner-v10-7-quick-add`。

## 修改文件

- `index.html`
- `sw.js`
- `README.md`
- `CHANGELOG.md`
- `docs/feature_and_system_guide.md`
- `docs/technical_manual.md`
- `docs/deployment_and_troubleshooting.md`
- 新增 `docs/requirements_V10.7_quick_add.md`
- 新增 `docs/acceptance_V10.7_quick_add.md`

## 验证说明

需区分静态代码检查与真实浏览器验收。交付前应验证 Enter、按钮、连续添加、空输入、保存失败、刷新持久化、移动端布局及原有完整表单。未实际运行的浏览器测试不得标记为通过。

## 部署

上传完整仓库文件。已部署的 GitHub Pages 等待发布完成后刷新；已安装 PWA 建议完全关闭后重新打开。无需数据库迁移。


---

## 原文件：`DELIVERY_NOTES_V10.8.md`

# 慢慢计划 V10.8 交付说明

## 新增功能
首页顶部新增「版本与更新记录」按钮。打开后显示：
- 当前运行版本；
- GitHub main 分支 CHANGELOG 的完整历史版本；
- GitHub Pages 部署状态；
- 对应 main 提交短 SHA、更新时间及 Actions 运行记录链接；
- 手动刷新部署状态。

## 部署状态含义
系统从公开 GitHub API 读取 main 最新 commit，并与 Pages build and deployment workflow 的 head_sha 比对。仅当对应当前 main SHA 的工作流成功完成时显示「部署成功」。未匹配时显示等待记录，运行中或失败则分别显示对应状态。网络或 API 限流时显示检查失败。

注意：GitHub Actions 成功表示 Pages 构建部署工作流成功，不保证所有浏览器或 PWA 缓存已经更新。

## 修改文件
- index.html
- sw.js
- README.md
- CHANGELOG.md
- docs/feature_and_system_guide.md
- docs/technical_manual.md
- docs/deployment_and_troubleshooting.md
- docs/requirements_V10.8_release_history.md
- docs/acceptance_V10.8_release_history.md

## 数据与兼容
不修改计划 schema、LocalStorage 业务数据、Supabase 表或 RPC，无数据库迁移。V10.6 事务保存机制不变。

## 验证
静态语法检查和部署状态分支逻辑模拟待执行；真实浏览器／手机 PWA 验收待用户设备执行。


---

## 原文件：`DELIVERY_NOTES_V10.9.md`

# 慢慢计划 V10.9 交付说明

## 新增与调整
- 默认排序改为「优先级（未完成优先）」。
- 未完成任务优先于已完成任务；各自分组内部按五星至一星排列。
- 同星级保持筛选后原列表顺序。
- 保留原始顺序、名称 A–Z、最近添加、最早添加。
- 排序模式单独保存并在刷新后恢复。
- 普通周期及随机临时计划视图统一使用规则。

## 影响范围
只改变显示顺序及独立排序偏好，不修改计划业务数据、完成记录、撤销机制、JSON schema、Supabase 快照或数据库结构。无 SQL 迁移。

## 修改文件
- index.html
- sw.js
- README.md
- CHANGELOG.md
- docs/feature_and_system_guide.md
- docs/technical_manual.md
- docs/deployment_and_troubleshooting.md
- docs/requirements_V10.9_priority_sorting.md
- docs/acceptance_V10.9_priority_sorting.md
- docs/impact_analysis_V10.9_priority_sorting.md
- DELIVERY_NOTES_V10.9.md

## 验证
- JavaScript 语法检查：通过。
- 五星优先、完成状态置底、同星稳定顺序模拟：通过。
- 筛选后排序、偏好恢复、现有排序模式模拟：通过。
- 真实浏览器／手机 PWA 端到端测试：尚待用户设备验收。

GitHub Pages 部署成功与否以本次提交 SHA 对应的 pages build and deployment workflow 为准。


---

## 原文件：`docs/V10.20_full_backup_module_colors_spec.md`

# V10.20 改修规格：四模块整体 JSON 导出与入口按钮颜色

## 状态
实现版本：V10.20；基于 V10.19 增量修改。

## 目标
1. 增加独立「整体导出 JSON」入口，一次导出计划、工作、外语学习、整理四模块。
2. 四个模块入口按钮分别使用柔和蓝、绿、紫、橙背景色。
3. 保留既有单模块导出与导入；不增加整体导入。

## 整体导出格式与数据范围
- 本机读取四个模块 LocalStorage 分区：`personal-planner:v1`、`personal-work:v1`、`personal-language:v1`、`personal-organizer:v1`。
- 使用现有模块状态校验/规范化规则；每个模块完整包含当前备份支持的数据：schemaVersion、categories、plans、completions、trash。
- 每个模块对象附带 moduleType、appVersion、exportedAt。
- 顶层包含 app=manman-planner、backupType=full、backupVersion=1、appVersion、exportedAt、modules。
- 文件名：`manman_planner_full_backup_YYYYMMDD_HHmmss.json`，按本地时间生成。
- 任一模块读取或 JSON 解析/结构校验失败，整体导出取消；不会静默生成缺失模块的备份。
- 空分区按现有整体快照逻辑导出该模块空状态。
- 导出仅读取本地数据，不请求 Supabase、不修改 LocalStorage。
- 不包含 IndexedDB 运行日志、语言偏好/系统设置或其他系统级数据。

## UI
- 在现有 JSON 导出入口附近增加独立按钮「整体导出 JSON」。
- 四模块按钮分别使用蓝、绿、紫、橙柔和色系；保持现有文案、图标、尺寸、顺序和行为。
- 新按钮提供简体中文、English、日本語文案。

## 兼容与约束
- 不修改四个业务 LocalStorage 键及 schemaVersion。
- 不改变单模块 JSON 导出格式、单模块导入校验或恢复行为。
- 不修改 Supabase RPC、数据库结构、登录及同步流程。
- 不增加整体导入。
- 不进行无关重构。
- 更新 Service Worker cache 名称。

## 版本
V10.20 · full_backup_module_colors。


---

## 原文件：`docs/acceptance_V10.10_star_dashboard_jump.md`

# V10.10 验收标准

- [ ] 首页显示 1–5 星统计和未完成任务数量。
- [ ] 只统计每日、每周、每月、每年正式计划。
- [ ] 已完成任务、已归档任务、随机临时计划均不计入。
- [ ] 完成状态按当前日／周／月／年周期记录判断。
- [ ] 零数量星级禁用；非零星级可点击。
- [ ] 某星级数量最多的周期被选中。
- [ ] 周期数量并列时按每日、每周、每月、每年选择。
- [ ] 点击后搜索和分类筛选被清空，排序模式保持原值。
- [ ] 列表定位到该星级第一条未完成任务并短暂高亮。
- [ ] 完成／取消完成、新建、编辑、归档／取消归档、恢复、导入、云端下载后统计随 render 更新。
- [ ] 不改变任务数据、schemaVersion、JSON 备份或 Supabase 快照。
- [ ] 桌面和手机布局可用；浏览器真实端到端验收仍需执行。


---

## 原文件：`docs/acceptance_V10.11_multilingual_ui.md`

# V10.11 验收标准

- [ ] 首次访问无语言偏好时显示简体中文。
- [ ] 登录页和主界面均可选择中文、English、日本語。
- [ ] 切换语言立即生效，两个选择器同步。
- [ ] 刷新网页、重新打开浏览器和 PWA 后保留上次语言。
- [ ] 主界面、计划周期、分类、搜索筛选排序、表单、弹窗、回收站、归档、同步及动态反馈均按当前语言显示。
- [ ] 日期、时间、通知和 PDF 导出使用当前语言。
- [ ] 版本履历按语言读取对应 CHANGELOG，V0 至 V10.11 历史条目齐全。
- [ ] 用户输入的计划标题、备注、URL、用户名不被翻译。
- [ ] 切换语言不改变任务数据、完成状态、分类枚举、JSON 备份或云端快照。
- [ ] 离线加载后可切换三种语言。
- [ ] V10.10 的新增、编辑、删除、排序、星级统计定位、备份和同步功能不回归。
- [ ] JS 语法、字典完整性、翻译覆盖及真实浏览器/PWA 测试通过；未执行的测试需明确标注。


---

## 原文件：`docs/acceptance_V10.12_custom_category_management.md`

# V10.12 验收清单：自定义分类管理

- [ ] 旧数据升级后计划、完成状态、归档及回收站记录保留。
- [ ] 原有七个分类及顺序保留。
- [ ] 添加、改名、删除正常；空名、超长、重复名称被拒绝。
- [ ] 新建与快速添加默认使用第一分类。
- [ ] 改名同步普通、归档和回收站计划。
- [ ] 删除最后一个分类被禁止。
- [ ] 删除使用中分类必须选择目标；取消后数据不变。
- [ ] 确认后关联计划先转移再删除，操作可撤销。
- [ ] LocalStorage 写入失败时无部分修改。
- [ ] JSON 与 Supabase 同步包含分类；旧备份兼容。
- [ ] 三种语言正常，自定义分类名称保持原样。
- [ ] 手机与桌面布局正常；schemaVersion: 1，无 SQL 迁移。


---

## 原文件：`docs/acceptance_V10.13_organize_module.md`

# V10.13 整理模块验收标准

## 功能验收
- [ ] 首页显示计划与整理两个入口，可来回切换。
- [ ] 默认进入计划模块，原计划数据与操作保持不变。
- [ ] 整理默认分类及顺序为书籍、电子产品、软件/APP、网站、其他。
- [ ] 整理新建与快速添加默认分类为书籍。
- [ ] 整理支持新增、编辑、删除、搜索、筛选、排序、完成状态。
- [ ] 整理支持分类增删改；删除使用中分类先转移项目。
- [ ] 整理支持归档、回收站、恢复、永久删除和撤销。
- [ ] 整理界面不显示计划周期选择和周期星级统计，项目作为单一列表展示。
- [ ] PDF 导出仅包含当前整理列表。

## 数据隔离
- [ ] 计划继续使用 personal-planner:v1。
- [ ] 整理使用 personal-organizer:v1。
- [ ] 修改整理项目、分类、归档、回收站不改变计划数据。
- [ ] 修改计划不改变整理数据。
- [ ] 切换模块后各自内容和分类正确恢复。

## JSON 备份
- [ ] 整理导出包含 moduleType=organize。
- [ ] 计划导出包含 moduleType=plan。
- [ ] 整理备份不能导入计划模块，计划备份不能导入整理模块。
- [ ] 旧版无 moduleType 的计划备份仍可导入。
- [ ] 整理导入只替换整理数据。

## Supabase
- [ ] 计划上传保留云端 organizer 分区。
- [ ] 整理上传保留云端计划根数据。
- [ ] 计划下载只更新计划本地键。
- [ ] 整理下载只更新整理本地键。
- [ ] 旧云端快照无 organizer 字段时计划下载仍兼容。
- [ ] 上传失败或本机保存失败时不显示成功。

## 发布与兼容
- [ ] 中文、英文、日文 UI 可切换。
- [ ] PWA 缓存版本更新。
- [ ] V10.12 计划数据及既有分类完整保留。
- [ ] GitHub Actions Pages build 和 deploy 对最新 main SHA 均成功。
- [ ] 浏览器与 Android PWA 实测通过。

## 已知测试边界
静态代码检查与状态模拟不等于真实浏览器、Android PWA 或 Supabase 线上端到端测试；交付说明必须分别标注。


---

## 原文件：`docs/acceptance_V10.14_four_module_management.md`

# V10.14 验收标准

- [ ] 首页模块顺序为计划、工作、外语学习、整理。
- [ ] 四个模块切换正常，刷新后恢复上次模块。
- [ ] 计划分类按原有顺序移除工作，依次为学习、生活、健康、财务、兴趣、未分类；未分类不能编辑或删除。
- [ ] 旧计划、归档和回收站中的工作分类记录均迁移为未分类，其他字段不变。
- [ ] 迁移测试覆盖普通记录、归档记录、回收站记录、其他分类顺序、字段完整性、幂等性及原始对象不被修改。
- [ ] 迁移保存失败时不替换内存状态，原 LocalStorage 数据保持不变；下次进入计划模块可重试。
- [ ] 工作分类顺序为待处理、进行中、已完成、工作记录、会议、其他。
- [ ] 工作任务状态独立于分类，状态可编辑且与完成复选框同步；跨日期仍保持。
- [ ] 外语学习分类为英语、德语、俄语、日语、其他，不含挪威语。
- [ ] 整理原有五个分类及数据保持不变。
- [ ] 四模块本地存储、分类、归档、回收站、搜索和统计相互隔离。
- [ ] 四种 JSON moduleType 可分别导出和恢复；跨模块导入被拒绝。
- [ ] 旧版无 moduleType 的计划 JSON 仍可导入。
- [ ] Supabase 上传当前模块不会覆盖其他分区；原 organizer 分区保持兼容。
- [ ] 中英日界面、PDF 导出、撤销、分类管理正常。
- [ ] Service Worker 缓存升级；页面刷新无错误。
- [ ] JavaScript 语法检查和 V10.14 静态契约工作流通过。
- [ ] 真实浏览器、Supabase 线上 E2E、Android PWA 测试分别记录，不以静态检查代替。


---

## 原文件：`docs/acceptance_V10.20_full_backup_module_colors.md`

# V10.20 验收记录

## 整体 JSON 导出
- [ ] 新按钮在四模块入口中可见，且不依赖当前模块。
- [ ] 导出 JSON 可解析，顶层包含 app、backupType、backupVersion、appVersion、exportedAt、modules。
- [ ] modules 中包含 plan、work、language、organize 四个模块。
- [ ] 每个模块均包含 moduleType、schemaVersion、categories、plans、completions、trash、appVersion、exportedAt。
- [ ] 各模块的分类、记录、完成状态、归档字段、回收站数据与当前单模块备份支持范围一致。
- [ ] 文件名符合 manman_planner_full_backup_YYYYMMDD_HHmmss.json。
- [ ] 任一模块读取/解析/校验失败时取消整体导出，不产生不完整文件。
- [ ] 导出不会修改 LocalStorage，也不访问 Supabase。
- [ ] 不包含 IndexedDB 运行日志及系统设置。
- [ ] 原有四个模块单独导出、导入功能保持正常。

## 四模块按钮颜色
- [ ] 计划为蓝色系、工作为绿色系、外语学习为紫色系、整理为橙色系。
- [ ] 当前选中状态仍有足够辨识度。
- [ ] 原有按钮文字、尺寸、排列、点击行为不变。
- [ ] 桌面端与移动端显示正常；其他按钮不受影响。

## 回归与发布
- [ ] 四模块切换、读写、统计、归档、回收站正常。
- [ ] 云端单模块/整体同步代码与行为未改变。
- [ ] 中英日翻译正常。
- [ ] Service Worker 使用 V10.20 新缓存名。
- [ ] GitHub Actions 构建、Pages 部署均成功后方可宣布发布。


---

## 原文件：`docs/acceptance_V10.21_plan_to_module_move.md`

# V10.21 单向移动验收清单

## 功能范围
- 仅在「计划」模块编辑已有记录时显示移动区域。
- 目标仅包含「工作」「整理」「外语学习」。
- 其他三个模块不显示移动入口，不支持反向移动。

## 数据规则
- 保留标题、备注、参考网站和优先级。
- 目标模块使用其默认分类；状态默认未完成，工作状态为「待处理」。
- 不继承计划周期、日期提醒、临时周期标识、通知标记或完成状态。
- 移动成功后，源计划记录及其完成状态记录从计划模块删除。
- 目标模块原有记录、分类、归档、回收站和完成记录保持不变。

## 持久化与异常
- 目标模块先写入，计划模块随后删除。
- 目标模块写入失败时，计划模块不变。
- 计划模块删除保存失败时，回滚目标模块写入。
- 目标模块已有数据无法识别时，取消移动，不覆盖原数据。
- 移动操作不提供单模块撤销，避免仅恢复源记录却留下目标副本。

## 手动验收
- [ ] 新建计划并编辑，确认显示三个目标模块。
- [ ] 分别移动到工作、整理、外语学习，确认计划模块原记录消失。
- [ ] 确认目标模块新增一条记录，标题、备注、参考网站、优先级保留。
- [ ] 确认目标记录默认未完成；工作状态显示「待处理」。
- [ ] 确认目标记录不带入计划日期、周期和提醒。
- [ ] 确认其他三个模块编辑页面没有移动入口。
- [ ] 模拟目标模块存储失败或无效数据，确认源计划不丢失。
- [ ] 桌面与移动端检查编辑弹窗布局。
- [ ] 检查中文、英文、日文文案。


---

## 原文件：`docs/acceptance_V10.22_global_search.md`

# V10.22 Global Search — Acceptance Checklist

## Search order
- [ ] Plan: daily → daily_random → weekly → weekly_random → monthly → monthly_random → yearly.
- [ ] If no Plan item matches, search Work → Foreign Language Learning → Organize.
- [ ] Stop at the first matching item; do not show a result list or next/previous controls.

## Matching rules
- [ ] Search title, note and reference URL, case-insensitively.
- [ ] Include completed items.
- [ ] Exclude archived items and Trash.
- [ ] Ignore the currently selected category filter.
- [ ] Within a period/module, respect the current sort order and stable original order for ties.
- [ ] Expired random-cycle items are not searchable.

## Navigation and UI
- [ ] Enter and the Search button both execute global search.
- [ ] Switch to the matched module and, for Plan, the matched period.
- [ ] Keep the keyword visible, clear the category filter, scroll to the first match and briefly highlight it.
- [ ] No match: show a localized message and keep the current module, period and scroll position.
- [ ] Chinese, English and Japanese labels are correct.
- [ ] Mobile layout keeps the search input and button usable without horizontal overflow.

## Regression protection
- [ ] Existing CRUD, completion, sorting, category filtering, archive, Trash and Plan-to-module move remain functional.
- [ ] No business LocalStorage keys, schemaVersion, JSON backup format, Supabase RPC or database schema changes.
- [ ] Service Worker cache version is updated.


---

## 原文件：`docs/acceptance_V10.23_dark_theme_period_colors.md`

# V10.23 黑白主题与周期颜色验收

## 功能验收
- [ ] 首次打开（没有主题偏好）默认使用黑色主题。
- [ ] 顶部公共区域显示主题切换按钮；在计划、工作、外语学习、整理四个模块均可操作。
- [ ] 切换为白色主题后，原有浅色界面外观保持不变。
- [ ] 切换回黑色主题后，页面背景为深色、文字为浅色；卡片、弹窗、输入框、下拉框、按钮、边框、提示和四模块入口保持可读。
- [ ] 刷新页面或重新打开后，恢复上次选择的主题。
- [ ] 普通周期每日、每周、每月、每年显示蓝色；随机周期每日随机、每周随机、每月随机显示橙色。
- [ ] 周期按钮仍按原有顺序显示，切换、搜索、统计和计划增删改完成行为不变。
- [ ] 中、英、日三种语言下主题切换按钮文案正确。
- [ ] 桌面与手机宽度下顶部按钮及周期标签均可正常使用。

## 数据与回归
- [ ] 四模块原有 LocalStorage 业务键和值不变。
- [ ] 新增主题偏好仅使用独立键 `personal-planner:theme:v1`。
- [ ] `schemaVersion: 1`、JSON 备份格式、Supabase RPC 和数据库结构不变。
- [ ] Service Worker 使用 V10.23 新缓存名。
- [ ] 运行现有静态验证脚本：`node scripts/validate-v10.14.mjs`。


---

## 原文件：`docs/acceptance_V10.24_results_future_modules.md`

# V10.24 成绩与未来模块验收清单

## 模块入口与外观
- [ ] 六个模块入口按计划、工作、外语学习、整理、成绩、未来排列。
- [ ] 成绩使用青绿色，未来使用玫瑰粉；深色与浅色主题均清晰可辨。
- [ ] 手机窄屏下入口可换行，不遮挡版本、同步和管理入口。
- [ ] 中文、English、日本語切换后，新增模块名称、说明、分类和按钮均正确翻译。

## 独立数据
- [ ] 在成绩模块新增、编辑、完成、归档、删除记录，切换其他模块后数据不串用。
- [ ] 在未来模块新增、编辑、完成、归档、删除记录，切换其他模块后数据不串用。
- [ ] 成绩与未来分别使用 `personal-results:v1`、`personal-future:v1`。
- [ ] 原计划、工作、外语学习、整理数据与本地键不发生变化。
- [ ] 分类新增、改名、删除及回收站引用迁移行为与现有模块一致。

## 记录功能
- [ ] 快速添加、完整编辑、完成状态、优先级、搜索、分类筛选、排序正常。
- [ ] 归档、取消归档、回收站恢复、永久删除、批量操作和撤销正常。
- [ ] 单模块 JSON 导出带正确 `moduleType`；错误模块备份不能导入。
- [ ] PDF 导出只包含当前模块可见记录。

## 云端与兼容
- [ ] 单模块上传成绩／未来时，不覆盖其他五个模块的云端数据。
- [ ] 单模块下载只覆盖当前模块。
- [ ] 六模块整体上传／下载均包含成绩与未来。
- [ ] 旧四模块云端快照仍可整体下载；缺少新分区时成绩／未来初始化为空数据。
- [ ] 整体下载任一原四模块分区缺失或无效时，取消覆盖并保留本地数据。
- [ ] 不修改 schemaVersion，不需要 SQL 迁移。

## 回归
- [ ] 原四模块 CRUD、搜索、分类、归档、回收站、备份和同步无回归。
- [ ] PWA 更新后能加载 V10.24 缓存资源。


---

## 原文件：`docs/acceptance_V10.25_sync_overwrite_protection.md`

# V10.25 验收：云端同步数据覆盖保护

## 范围
- 当前模块上传、当前模块下载。
- 六模块整体上传、六模块整体下载。
- 中文、英文、日文提示。
- 本地同步元数据独立保存；云端通过现有快照 JSONB 的 `_syncMeta` 字段保存模块时间及由数据库返回的快照更新时间。

## 验收项目
1. 本地较新：上传和下载确认窗口均显示本地、云端时间及“本地数据较新”。
2. 云端较新：确认窗口显示双方时间及“云端数据较新”。
3. 时间相同：明确显示时间相同，仍要求用户确认。
4. 任一侧缺少时间：显示无法可靠判断，不自动选择任何一方。
5. 选择否：当前模块与其他模块的业务数据均不发生变化。
6. 选择是：仅执行对应范围的上传或下载；单模块操作不得覆盖其他模块。
7. 六模块整体操作：覆盖范围仅限六个已定义模块；不合并数据。
8. 确认后云端快照版本发生变化：中止操作，不写入本地或云端。
9. 单模块下载成功：只更新该模块本地数据及该模块时间；其余模块时间保持原值。
10. 整体下载成功：六个模块及其时间元数据一起写入；任一写入失败时恢复原数据及原元数据。
11. 旧云端快照无 `_syncMeta`：由数据库 `updated_at` 作为兼容回退时间，旧数据仍可读取。
12. 原六个业务 LocalStorage key、`schemaVersion: 1`、JSON 单模块／整体备份格式保持不变。
13. 在中英日三种语言下，确认窗口内容可读；桌面与移动端均可正常操作。

## 需要实际账号验证
- 使用登录账号在两个浏览器／设备间制造本地较新与云端较新两种情况。
- 分别验证单模块和六模块整体同步的“是／否”路径。
- 确认数据内容、模块隔离、云端时间及本地时间均符合预期。


---

## 原文件：`docs/acceptance_V10.26_clear_sync_status_on_cancel.md`

# V10.26 同步取消后清除状态文字 — 2026-11-09

## 修改内容
- 单模块上传、单模块下载、六模块整体上传、六模块整体下载：在时间检查确认框选择「否」时，立即清空本次操作写入的状态文字。
- 取消后不显示「已取消」或遗留的「正在读取／检查」提示。
- 选择「是」时，仍执行原有二次云端快照检查及同步流程；成功与失败提示保持原样。

## 影响范围
- 仅调整同步状态文字的显示与清除。
- 不修改确认框内容、时间比较、云端快照校验、业务数据、LocalStorage 键、JSON 备份格式、Supabase RPC 或数据库结构。

## 验收
- 四种上传／下载入口均检查取消分支调用对应清除函数。
- 静态验收同时检查 V10.26 版本标识、Service Worker 缓存标识及中英日更新记录。


---

## 原文件：`docs/acceptance_V10.27_move_plan_to_results_future.md`

# V10.27 验收：计划移动到成绩与未来

- [ ] 编辑计划时目标列表显示工作、整理、外语学习、成绩、未来五项。
- [ ] 计划可分别移动到成绩和未来。
- [ ] 移动后目标模块出现一条未完成事项，分类使用目标模块默认分类。
- [ ] 原计划记录被删除；取消确认时两侧数据均不变化。
- [ ] 目标模块数据格式异常或保存失败时，原计划保持不变。
- [ ] 原有工作、整理、外语学习移动功能正常。
- [ ] 英文与日文界面显示正确。
- [ ] 各模块独立存储、JSON 备份及云同步结构不变。


---

## 原文件：`docs/acceptance_V10.2_remove_login_lockout.md`

# V10.2 验收测试：移除登录失败锁定

测试环境：Supabase 测试项目、HTTPS 部署页面。不要在生产环境中用错误密码反复测试。

- [ ] AT-01：在现有数据库执行迁移 SQL，脚本成功完成，无函数签名或权限错误。
- [ ] AT-02：确认 `public.planner_login_attempts` 表已不存在。
- [ ] AT-03：使用正确用户名和密码登录成功。
- [ ] AT-04：使用错误密码登录返回失败，不进入主页面。
- [ ] AT-05：连续输入错误密码超过 5 次后，再输入正确密码仍可通过项目自定义校验成功登录（不再出现 10 分钟锁定）。
- [ ] AT-06：错误凭据调用 `planner_get_data` 和 `planner_put_data` 仍被拒绝。
- [ ] AT-07：正确凭据可以下载云端快照、上传快照；原有数据未被删除或重置。
- [ ] AT-08：回收站、归档、撤销、计划新增/编辑/完成等 V10 功能仍可用。
- [ ] AT-09：重新载入页面后，Service Worker 获取 V10.2 新缓存版本。
- [ ] AT-10：新项目运行 `supabase-setup.sql` 时不会创建 `planner_login_attempts` 表。

## 验收边界
本次交付仅做源码静态检查与 SQL 内容检查；没有连接用户真实 Supabase 项目执行迁移，以上数据库端到端用例需要在部署环境勾选验证。


---

## 原文件：`docs/acceptance_V10.35_language_workspace_v2.md`

# V10.35 验收：外语学习工作区 V2

对应需求：`requirements_V10.35_language_workspace_v2.md`；影响分析：`impact_analysis_V10.35_language_workspace_v2.md`。

## 准备数据
- 使用 V10.34 准备：外语学习工作区内容 ≥ 12 条（含英语词汇、日语语法），其中已掌握、需要复习各若干；学习记录 ≥ 3 条。
- 「外语学习」旧任务列表 `personal-language:v1` 中有 ≥ 2 条任务（可通过导入旧 JSON 备份准备）。
- 计划模块有搜索结果可分页的数据。

## 工作区切换
- [ ] 顶部显示「计划工作区 / 外语学习工作区」切换控件，中英日文案正确。
- [ ] 进入外语学习工作区后，模块切换栏与计划列表区域隐藏，只显示学习首页与导航；主题、语言切换仍可用。
- [ ] 返回计划工作区后，之前的模块、搜索词、分类筛选、页码保持不变。
- [ ] 在两个工作区分别刷新页面，均恢复到刷新前的工作区，无计划列表闪现。
- [ ] 切换工作区不触发任何模块数据重新加载或写入（各存储键内容不变）。

## 外语任务模块
- [ ] 计划工作区中「外语学习」按钮显示为「外语任务」（英：Language Tasks，日：語学タスク）。
- [ ] 点击后显示原外语学习任务列表，任务数量与升级前一致。
- [ ] 分类、星级统计、分页、计划移动到外语任务、全局搜索、单模块与整体云同步均正常。

## V1 数据迁移
- [ ] 升级后学习内容、学习记录数量与升级前一致。
- [ ] 状态映射：`new`→未学习，`mistake`→需要复习，`mastered`→已掌握。
- [ ] 存在 `personal-language-study-workspace:v1:pre-v2-backup`，内容与升级前原始数据一致；再次刷新不覆盖该备份。
- [ ] 主键数据 schemaVersion 为 2；原记录 `result` 字段保留。
- [ ] 人为写入损坏的 V1 数据时，工作区提示错误且不覆盖原数据。

## 学习状态
- [ ] 新建内容显示「未学习」。
- [ ] 打开未学习内容后变为「学习中」，生成 `start` 记录。
- [ ] 「完成本次学习」→已完成；「需要复习」→需要复习；「我已掌握」→已掌握；「重新学习」→学习中；每次生成对应记录并更新最近学习时间。
- [ ] 编辑内容不改变状态，编辑对话框中没有状态选择。
- [ ] 练习中心不抽取已掌握内容，需要复习的内容优先出现。
- [ ] 错题管理只显示需要复习的内容。

## 单元、筛选与分页
- [ ] 编辑对话框可填写学习单元（≤ 60 字）与难度（≤ 30 字），卡片正确显示。
- [ ] 单元筛选只列出当前语言、类型下已有的单元，并包含「未分单元」。
- [ ] 状态筛选、四种排序结果正确。
- [ ] 学习内容、错题管理、学习记录超过 10 条时分页；搜索或筛选后回到第 1 页；删除导致页数减少时页码自动校正。

## 详情与笔记
- [ ] 详情页按类型显示题干/原文、选项、解析；答案默认隐藏，可切换。
- [ ] 原「解析与个人笔记」字段显示为「解析」，内容不变。
- [ ] 个人笔记可新增、编辑、删除，按时间倒序显示，刷新后保留，单条超过 3000 字时阻止保存。
- [ ] 删除学习内容后，其记录和笔记仍保存在数据中，列表不再显示该内容。

## 导入导出
- [ ] 导出 JSON 为 schemaVersion 2，含 `moduleType: "language-workspace"` 与 `notes`。
- [ ] V1 备份与 V2 备份均可导入，导入前确认；取消时数据不变。
- [ ] 格式错误、超过 5 MB 的文件被拒绝，原数据不变。

## 隔离与兼容
- [ ] 外语学习工作区不读写七个模块存储键，不发起 Supabase 请求。
- [ ] 深色、浅色主题下颜色正常；360px 手机宽度下导航可横向滚动、无页面横向滚动条，对话框可完整操作。
- [ ] 应用版本显示 10.35.0，Service Worker 缓存版本已更新，旧缓存被替换。
- [ ] `npm run test:e2e`、`npm run test:validate:language` 及新增 V10.35 校验全部通过。


---

## 原文件：`docs/acceptance_V10.38_toeic_question_bank.md`

# V10.38 验收：托业题库

自动化：

- [x] `node scripts/validate-v10.38.mjs`：版本、页面入口、样式、`.gitignore`；`exam` 规范化（显式、按 id 推算、无效丢弃）、点选记录随导入保留；原文拆分、正确答案识别、选项解析
- [ ] GitHub E2E：`tests/e2e/toeic-workspace.spec.js` 8 个用例（推送后在 GitHub 上运行）

手动（导入真实题库后）：

- [ ] 托业题库页显示第 6 套的 T1、T2，进入后 Pt1–Pt4 题数为 6 / 25 / 39 / 30
- [ ] Pt3 一页 3 题，原文默认折叠，可展开收起
- [ ] 点选选项后刷新页面，选择仍在
- [ ] 导出 JSON 后再导入，选择仍在
- [ ] 深色模式、手机宽度下显示正常


---

## 原文件：`docs/acceptance_V10.3_reference_website.md`

# V10.3 验收测试：参考网站

- [ ] AT-01：新建计划时，参考网站字段显示在日期与提醒时间下方、备注上方。
- [ ] AT-02：输入 `https://example.com/path` 保存后，计划列表在备注上方显示可点击参考链接。
- [ ] AT-03：点击有效链接会尝试在新标签页打开，原系统标签页仍保留。
- [ ] AT-04：输入 `example.com` 保存后，链接可正常构造并以 HTTPS 打开。
- [ ] AT-05：输入 `not a url`、空格或不支持协议（例如 `javascript:alert(1)`）时，不显示可点击链接且不弹错误提示。
- [ ] AT-06：编辑计划可修改或清空参考网站；保存后显示随之更新。
- [ ] AT-07：不填写参考网站时不显示该区域，计划其他字段正常工作。
- [ ] AT-08：已有旧计划（无 `referenceUrl`）可正常显示、编辑和保存。
- [ ] AT-09：JSON 导出后包含参考网站字段；重新导入后字段保留。
- [ ] AT-10：Supabase 整份快照上传/下载保留参考网站字段；无需执行数据库迁移。
- [ ] AT-11：搜索框可以通过参考网址搜索对应计划。
- [ ] AT-12：完成状态、提醒、回收站、恢复、归档、撤销等既有功能无回归。
- [ ] AT-13：Service Worker 使用 V10.3 新缓存名，重新加载后获取新版页面。

## 验收说明
本次进行源码静态检查与 JavaScript 语法检查；真实浏览器多标签页及 Supabase 云端往返仍需在部署环境验证。


---

## 原文件：`docs/acceptance_V10.4_pdf_export.md`

# V10.4 验收文档：PDF 导出

- [ ] AT-01：页面顶部显示“导出 PDF”按钮，不影响现有 JSON 导出/导入入口。
- [ ] AT-02：当前列表有记录时，点击按钮打开独立打印排版页，并进入浏览器打印/保存 PDF 流程。
- [ ] AT-03：当前列表为空时不生成空白导出页，显示提示。
- [ ] AT-04：在搜索框输入关键词后导出，仅包含匹配的可见计划。
- [ ] AT-05：按分类筛选后导出，仅包含当前分类结果。
- [ ] AT-06：切换计划周期后，导出只包含当前周期可见记录。
- [ ] AT-07：改变排序后，PDF 中记录顺序与页面显示顺序一致。
- [ ] AT-08：记录标题、完成状态、分类、优先级、提醒时间、参考网站和备注均按存在字段显示。
- [ ] AT-09：普通长度记录设置防分页拆分规则；当页面剩余空间不足时，记录应尽量整体移至下一页。
- [ ] AT-10：包含多行中文备注、长 URL、长单词和换行符时，文本可换行，无横向裁切或字段重叠。
- [ ] AT-11：导出前后计划数量、完成状态、搜索、筛选和排序状态不变，本地存储不被修改。
- [ ] AT-12：无外部 CDN/第三方依赖，`index.html` 内联 JavaScript 通过 `node --check`。
- [ ] AT-13：Service Worker 缓存名更新为 V10.4，重新部署后可获取新页面。
- [ ] AT-14：确认没有新增自动备份/恢复功能，没有新增 SQL 迁移要求。

## 验收限制
超出整页可打印高度的单条记录可能被浏览器分页引擎强制拆分；需通过紧凑排版降低概率。自动打印窗口、中文字体呈现及真实保存 PDF 的最终验证应在目标浏览器完成。


---

## 原文件：`docs/acceptance_V10.5_five_star_priority.md`

# V10.5 验收文档：五级优先级

- [ ] AT-01：新建计划表单提供 1、2、3、4、5 星五个选项。
- [ ] AT-02：编辑旧计划时，原 1、2、3 星级别保持正确选中。
- [ ] AT-03：选择 4 星并保存，列表显示四颗星；重新编辑仍选中 4 星。
- [ ] AT-04：选择 5 星并保存，列表显示五颗星；重新编辑仍选中 5 星。
- [ ] AT-05：高优先级排序按 5、4、3、2、1 降序排列，同级次序沿用原规则。
- [ ] AT-06：旧本地数据中 1、2、3 星不发生数值映射或变化。
- [ ] AT-07：旧 JSON 备份导入后，1、2、3 星保持原值；缺失优先级仍默认 1 星。
- [ ] AT-08：新建 4/5 星计划后导出 JSON，文件中的 `priority` 为对应数值。
- [ ] AT-09：导入包含 4/5 星的 JSON 后，列表与编辑表单显示正确。
- [ ] AT-10：PDF 导出显示 4 星和 5 星优先级文字。
- [ ] AT-11：云端上传/下载快照不改变 4/5 星数值。
- [ ] AT-12：手机窄屏下优先级选项可换行，无横向溢出。
- [ ] AT-13：`validPriority` 只接受 1–5 整数；非法值回退为 1。
- [ ] AT-14：Service Worker 缓存名升级为 V10.5。
- [ ] AT-15：`schemaVersion` 保持 1，不需要 SQL 迁移。

## 验收边界
代码与文档变更已纳入版本；实际设备浏览器、Supabase 账户和 PWA 更新仍需部署后按清单验证。


---

## 原文件：`docs/acceptance_V10.6_transactional_save.md`

# V10.6 验收测试

| 编号 | 场景 | 保存成功 | 模拟存储失败 |
|---|---|---|---|
| AT-01 | 新建计划 | 新计划出现并提示成功 | 不新增，表单保持打开 |
| AT-02 | 编辑计划 | 修改内容显示 | 原数据保留，表单不关闭 |
| AT-03 | 完成状态切换 | 状态与进度更新 | 复选框及进度恢复 |
| AT-04 | 删除／批量删除 | 计划进入回收站 | 计划仍在原列表 |
| AT-05 | 归档／取消归档 | 归档列表正确更新 | 原列表状态不变 |
| AT-06 | 恢复计划 | 计划返回列表 | 仍留在回收站 |
| AT-07 | 永久删除／清空回收站 | 项目被移除 | 回收站数据保留 |
| AT-08 | 撤销 | 恢复前一状态 | 当前状态及撤销能力保留 |
| AT-09 | JSON 导入 | 导入数据替换本地数据 | 原数据完整保留 |
| AT-10 | 云端下载 | 云端数据写入本地 | 本机原数据保留 |
| AT-11 | 自动清理 | 过期项目清除 | 过期项目保留 |
| AT-12 | 提醒记录 | 标记保存后发送通知 | 不写入标记、不发送通知 |

## 测试说明
当前已完成代码级迁移与静态检查；需在实际浏览器中模拟 LocalStorage 写入异常，并完成以上端到端验收后，方可标记全部通过。


---

## 原文件：`docs/acceptance_V10.7_quick_add.md`

# V10.7 快速添加计划验收清单

| # | 测试场景 | 预期结果 | 状态 |
|---|---|---|---|
| 1 | 输入名称后按 Enter | 创建一条每日计划 | 待浏览器验收 |
| 2 | 输入名称后点击“＋ 添加” | 创建一条每日计划 | 待浏览器验收 |
| 3 | 连续添加两条计划 | 每次成功后输入框清空并保持焦点 | 待浏览器验收 |
| 4 | 输入为空或只有空格 | 不创建计划，显示输入提示 | 待浏览器验收 |
| 5 | 从每周／每月等其他标签快速添加 | 成功后切换到每日视图并显示新计划 | 待浏览器验收 |
| 6 | 当前存在搜索词或分类筛选 | 成功后清除搜索词和分类筛选，便于看到新计划 | 待浏览器验收 |
| 7 | 检查新计划默认值 | 未完成、未分类、1 星、无提醒 | 待浏览器验收 |
| 8 | 模拟 LocalStorage 写入失败 | 输入内容保留、原数据不变、不显示成功提示 | 待浏览器验收 |
| 9 | 刷新页面 | 成功添加的计划仍存在 | 待浏览器验收 |
| 10 | 使用原有完整新增／编辑表单 | 原功能不受影响 | 待浏览器验收 |
| 11 | 手机窄屏布局 | 输入框和按钮可见、可操作 | 待浏览器验收 |
| 12 | 检查 JSON 导出与云端快照 | 新计划按既有字段结构保存 | 待浏览器验收 |

## 当前自动检查

- JavaScript 语法检查：待执行。
- 静态代码路径检查：待执行。
- 真实浏览器端到端测试：待执行。

注意：未完成真实浏览器验收前，不应将本清单标记为全部通过。


---

## 原文件：`docs/acceptance_V10.8_release_history.md`

# V10.8 验收清单

| # | 测试场景 | 预期结果 | 状态 |
|---|---|---|---|
| 1 | 首页点击版本与更新记录 | 正常打开弹窗 | 待浏览器验收 |
| 2 | 查看当前版本 | 显示 V10.8 | 待浏览器验收 |
| 3 | 加载更新履历 | 从 V0 到最新版本按顺序显示 | 待浏览器验收 |
| 4 | GitHub 原始文件不可访问 | 显示说明及 GitHub CHANGELOG 链接 | 待浏览器验收 |
| 5 | 当前 main SHA 对应 Pages workflow 成功 | 显示部署成功及 SHA | 待浏览器验收 |
| 6 | workflow 正在运行 | 显示正在部署 | 待浏览器验收 |
| 7 | workflow 失败 | 显示部署失败及运行链接 | 待浏览器验收 |
| 8 | 尚无匹配 workflow | 显示等待部署记录 | 待浏览器验收 |
| 9 | GitHub API 限流或断网 | 显示检查失败，可手动刷新 | 待浏览器验收 |
| 10 | 手机窄屏 | 弹窗可滚动，按钮可操作 | 待浏览器验收 |
| 11 | 计划新增、编辑、完成、删除 | 原业务功能不受影响 | 待浏览器验收 |
| 12 | PWA 更新 | 缓存版本升级，重新打开可加载新页面 | 待浏览器验收 |

## 自动检查
- JavaScript 语法检查：待执行。
- 静态代码路径检查：待执行。
- 真实浏览器端到端测试：待执行。


---

## 原文件：`docs/acceptance_V10.9_priority_sorting.md`

# V10.9 验收清单

| # | 测试场景 | 预期结果 | 状态 |
|---|---|---|---|
| 1 | 首次打开，无排序偏好 | 默认选中「优先级（未完成优先）」 | 逻辑测试通过；浏览器待验收 |
| 2 | 未完成任务含 5 至 1 星 | 依次按五星至一星显示 | 逻辑测试通过；浏览器待验收 |
| 3 | 已完成任务含不同星级 | 全部排在未完成任务之后，内部按五星至一星 | 逻辑测试通过；浏览器待验收 |
| 4 | 同星级任务多个 | 保持原相对顺序 | 逻辑测试通过；浏览器待验收 |
| 5 | 每日、每周、每月、每年 | 均应用默认排序 | 代码路径检查通过；浏览器待验收 |
| 6 | 每日／每周／每月随机视图 | 均应用默认排序 | 代码路径检查通过；浏览器待验收 |
| 7 | 同时使用搜索与分类筛选 | 仅对筛选结果排序 | 代码路径检查通过；浏览器待验收 |
| 8 | 切换原始顺序、名称、最近添加、最早添加 | 各模式结果正确 | 逻辑测试通过；浏览器待验收 |
| 9 | 切换排序后刷新页面 | 恢复上次选择 | 逻辑测试通过；浏览器待验收 |
| 10 | 修改星级或完成状态 | 重绘后按当前模式重新排序 | 代码路径检查通过；浏览器待验收 |
| 11 | 新建、恢复、导入任务 | 列表按当前模式重新排序 | 代码路径检查通过；浏览器待验收 |
| 12 | 切换排序模式 | 不修改业务数据、不触发业务保存事务 | 代码路径检查通过；浏览器待验收 |
| 13 | JSON 备份及 Supabase 同步 | 数据结构与原版本兼容 | 无 schema 变化；浏览器待验收 |
| 14 | 手机窄屏 | 排序下拉框仍可正常操作 | 浏览器／手机待验收 |

自动检查：JavaScript 语法、排序比较规则模拟、业务代码静态路径检查通过；真实浏览器／手机 PWA 验收待执行。


---

## 原文件：`docs/acceptance_V10_trash_undo_archive.md`

# 慢慢计划 V10 验收测试文档

测试前建议先导出 JSON 备份。每项记录通过/失败，并记录浏览器与复现步骤。

| 编号 | 测试场景 | 操作 | 预期结果 |
|---|---|---|---|
| AT-01 | 单条软删除 | 删除一条计划并确认 | 计划从普通列表消失，回收站数量增加，出现撤销入口 |
| AT-02 | 取消删除 | 删除后在提示有效期内点击撤销 | 计划及其完成记录恢复 |
| AT-03 | 单条恢复 | 在回收站点击一条计划的恢复 | 计划返回原周期，回收站数量减少 |
| AT-04 | 批量恢复 | 选择多条并点击恢复所选 | 所选且无 ID 冲突的计划恢复，未选项目保留 |
| AT-05 | 永久删除 | 对回收站项目执行永久删除并确认 | 项目永久移除，操作前有确认提示且不显示撤销 |
| AT-06 | 清空回收站 | 点击清空并确认 | 回收站为空；必须二次确认，不提供撤销 |
| AT-07 | 30 天过期 | 在测试数据中将 deletedAt 设为 31 天前后重载 | 31 天前项目清理；未满 30 天项目保留 |
| AT-08 | 周期清空 | 清空当前周期计划 | 仅当前周期活动计划移入回收站，其他周期不受影响 |
| AT-09 | 清理已完成 | 清理当前周期已完成计划 | 仅已完成活动计划进入回收站 |
| AT-10 | 归档 | 对计划执行归档 | 普通列表和进度统计中不再显示，归档面板可见 |
| AT-11 | 取消归档 | 对归档计划执行取消归档 | 计划回到原周期列表；撤销可重新归档 |
| AT-12 | 编辑撤销 | 编辑标题/备注并保存，再点击撤销 | 计划字段恢复修改前内容 |
| AT-13 | 完成状态撤销 | 勾选/取消完成后点击撤销 | 完成状态和进度统计恢复原状 |
| AT-14 | JSON 往返 | 导出含回收站和归档数据的 JSON，再导入 | 计划、归档、删除时间及完成记录完整保留 |
| AT-15 | 旧版 JSON 兼容 | 导入 V9 导出的 JSON | 正常读取，回收站为空，旧计划默认未归档 |
| AT-16 | 云端快照 | 上传后下载同一账号数据 | 回收站与归档状态随 JSONB 快照保留 |
| AT-17 | 缓存更新 | 部署后重新打开 PWA | 新 Service Worker 缓存名生效并载入 V10 页面 |
| AT-18 | ID 冲突 | 构造恢复时同 ID 的活动计划 | 系统拒绝重复恢复并提示，不产生重复记录 |

## 自动检查结果
- `node --check`：检查内嵌 JavaScript 语法。
- 本次交付未连接真实 Supabase 环境进行端到端测试；AT-16 需要在用户部署环境执行。
- 30 天自动清理建议用修改测试 JSON 的 `deletedAt` 时间进行验证，不必等待真实 30 天。


## V10.1 首页入口修复验收
- [ ] 登录进入首页后可看到“回收站”按钮。
- [ ] 回收站按钮显示数量，点击后打开回收站窗口。
- [ ] 首页可看到“已归档”按钮，点击后打开归档窗口。
- [ ] 打开浏览器控制台确认无因 open-trash/open-archive 缺失引发的初始化错误。
- [ ] 部署更新后确认 Service Worker 使用新缓存版本。


---

## 原文件：`docs/impact_analysis_V10.10_star_dashboard_jump.md`

# V10.10 影响分析

## 影响文件
- index.html：首页统计 UI、统计函数、跳转与高亮。
- sw.js：升级缓存名。
- README、CHANGELOG、功能说明、技术手册、部署说明。
- 新增 V10.10 需求、验收、影响分析和交付文档。

## 数据与兼容性
不增加或修改业务字段；schemaVersion: 1 不变。LocalStorage 计划数据、完成记录、撤销机制、JSON 导入导出及 Supabase JSONB 快照均不变。无需 SQL 迁移。

## 风险与边界
- 周期完成记录以当前周期为准；过去周期的完成状态不会影响当前计数。
- 临时随机计划不参与统计，避免与正式周期统计混淆。
- 搜索和分类筛选会在跳转时清空，防止目标任务被隐藏；排序偏好保留。
- 高亮是临时 UI 状态，不写入数据。
- GitHub Pages 成功部署不代表用户设备 PWA 缓存立即更新。


---

## 原文件：`docs/impact_analysis_V10.11_multilingual_ui.md`

# V10.11 影响分析

## 变更范围
- 新增独立 `i18n.js` 翻译模块与语言选择控件。
- 修改 `index.html` 的界面文字接入、当前语言日期格式、通知、PDF 和更新履历加载。
- 修改 `sw.js` 缓存版本并预缓存 `i18n.js`。
- 新增英文、日文 CHANGELOG；更新 README 与技术文档。

## 不受影响
- LocalStorage 计划主键及计划对象结构。
- `schemaVersion: 1`、JSON 备份和导入兼容规则。
- Supabase RPC、账号验证、云端快照格式。
- 事务式保存、撤销、完成状态、排序、星级统计及任务定位逻辑。

## 风险与控制
- 动态 DOM 翻译可能误处理用户文本：通过用户内容节点排除规则保护标题、备注和 URL。
- PWA 旧缓存：升级缓存名并预缓存翻译模块。
- PDF/更新履历独立于主页面 DOM：显式使用当前语言。
- 翻译遗漏：通过静态文案清单、动态消息清单及三语言浏览器验收检查。


---

## 原文件：`docs/impact_analysis_V10.12_custom_category_management.md`

# V10.12 影响分析：自定义分类管理

- index.html：新增分类管理、编辑和删除迁移 UI；分类配置进入状态；新建及快速添加默认使用首项。
- i18n.js：增加中英日静态文案，并排除用户自定义分类名。
- sw.js：升级 PWA 缓存。
- 状态增加 categories 数组，计划 category 字段保持字符串，schemaVersion: 1 不变。
- JSON 与 Supabase 整份快照包含分类；旧数据缺少该字段时回退原有七项，无 SQL 迁移。
- 分类改名／删除迁移同时覆盖 plans 与 trash[].plan；事务保存和撤销机制避免部分写入。


---

## 原文件：`docs/impact_analysis_V10.13_organize_module.md`

# V10.13 整理模块影响分析

## 影响范围
- index.html：新增模块切换、模块状态装载、模块专属列表显示、备份与云端分区合并。
- i18n.js：增加整理模块中文、英文、日文文案。
- sw.js：更新缓存版本。
- README、功能说明、技术手册、部署说明和三语 CHANGELOG：补充 V10.13 记录。

## 本地数据
- 原计划键 personal-planner:v1 不变。
- 新增 personal-organizer:v1。
- 两者仍采用 schemaVersion 1 的兼容状态形状，但各自独立存储。
- 计划旧数据不迁移、不重写；整理首次使用时创建五个默认分类。

## 云端数据
- 复用既有 planner_cloud_data JSONB 单记录及 RPC。
- 保持根级 schemaVersion、plans、categories、completions、trash 结构，新增 organizer 子对象。
- 既有 planner_put_data SQL 校验根级字段，允许额外 JSONB 属性，因此本版本无需 SQL 迁移。
- 上传前先获取当前云端快照，更新当前模块并保留另一模块；避免两套数据互相覆盖。
- 旧快照无 organizer 字段时按“整理尚未上传”处理。

## 风险与控制
1. 并发设备同时上传可能发生最后写入者覆盖：现有系统本来就是手动整份快照同步，本版本在每次上传前先读取并合并，减少模块间覆盖，但不是数据库事务级并发锁。
2. 老版本网页若在 V10.13 之后继续上传计划，会覆盖云端 organizer 字段。建议整理模块启用后，所有设备都刷新至 V10.13 再进行云端上传。
3. 旧版客户端的计划下载忽略 organizer 字段，不会污染本地计划数据。
4. 整理内部 period 固定 daily，只用于兼容现有通用数据校验，界面不暴露周期。
5. 尚未进行真实 Android PWA 与 Supabase 线上 E2E 验证，不能将静态检查描述为端到端通过。

## 数据库
无表结构变更、无 SQL migration。


---

## 原文件：`docs/impact_analysis_V10.14_four_module_management.md`

# V10.14 影响分析

## 高影响区域
- index.html：四模块切换、状态管理、列表渲染、JSON 导入导出、Supabase 分区和分类迁移。
- i18n.js：新增工作、外语学习和分类／状态文案。
- sw.js：缓存名更新。
- README、CHANGELOG、技术手册及验收文档：同步版本信息。

## 数据兼容
- Plan 原键 personal-planner:v1 不变；只迁移 category=工作 的记录到未分类。
- Work/Language 新增独立键；Organize 继续使用 personal-organizer:v1。
- schemaVersion 仍为 1；计划旧备份兼容。
- Supabase 继续使用现有 planner_get_data / planner_put_data；保留旧 organizer 云端分区并新增 work 和 language 分区。

## 风险与控制
- 分类迁移采用候选状态保存成功后才替换内存状态；失败保留旧数据并显示错误。
- 云端上传前读取远端快照，仅替换当前分区。
- Work 状态采用稳定模块 completion key，避免日期变化导致完成状态重置。
- JSON 导入先校验 moduleType 和结构；失败不覆盖当前数据。
- 不执行 SQL 迁移，不改登录认证，不重构现有引擎。

## 测试边界
自动化静态检查不代表真实浏览器、Supabase 线上端到端或 Android PWA 安装已通过；未执行项必须标记未执行。


---

## 原文件：`docs/impact_analysis_V10.25_sync_overwrite_protection.md`

# V10.25 影响分析

- 本地新增独立元数据键 `personal-planner:sync-meta:v1`，不写入业务模块数据，不影响 JSON 备份。
- 云端在现有 JSONB 快照保留字段 `_syncMeta`；现有 RPC 名称、参数和返回业务数据形状保持兼容。仅 `planner_get_data` 在返回快照时附加数据库 `updated_at` 与模块时间。
- 不修改表结构、六模块业务存储键、`schemaVersion: 1`、备份结构。
- 上传时当前模块的时间来自本地元数据；未操作的模块沿用云端元数据。整体上传使用本地六模块元数据。
- 下载时仅同步对应模块的元数据；整体下载同步六模块元数据。
- 时间无法确认时仍要求用户确认；云端版本在确认后变化时中止。
- 主要风险是旧数据缺少模块时间，使用数据库快照更新时间作为兼容回退值，首次同步后逐步建立模块级时间。


---

## 原文件：`docs/impact_analysis_V10.26_clear_sync_status_on_cancel.md`

# V10.26 影响分析：同步取消后清除状态文字

本次变更只影响同步界面的状态提示：用户在覆盖确认框选择「否」后，清空本次同步操作产生的状态文字。上传／下载的确认、快照复查、数据写入和错误处理均保持不变。四种同步入口共用各自模块范围的状态清除函数，不触碰业务存储或数据库。


---

## 原文件：`docs/impact_analysis_V10.27_move_plan_to_results_future.md`

# V10.27 影响分析：扩展计划移动目标

本次修改只扩展计划编辑窗口中的目标选项和移动函数允许列表。目标模块仍通过现有 MODULE_KEYS、MODULE_CATEGORIES、moduleCache、safeState、commitState 流程独立读写。原有目标、移动确认、目标写入失败保护、原计划删除及回滚逻辑保持不变。不修改模块 schema、LocalStorage 键、JSON 备份结构或 Supabase 同步协议。


---

## 原文件：`docs/impact_analysis_V10.2_remove_login_lockout.md`

# V10.2 影响分析：移除登录失败锁定

## 变更范围
- `docs/supabase-setup.sql`：新建数据库时不创建失败次数表，校验函数直接比对 bcrypt 摘要。
- `docs/migration_V10.2_remove_login_lockout.sql`：替换既有校验函数、删除旧的 `planner_login_attempts` 表并重申 RPC 执行权限。
- `README.md`、`CHANGELOG.md` 及需求、验收、技术说明、部署排障文档：更新升级步骤与行为说明。
- `sw.js`：更改缓存名称，避免浏览器继续使用旧版本资源。
- `index.html`：登录调用和 RPC 参数保持不变，不需要改动前端接口。

## 数据与兼容性
- 不修改 `planner_credentials`、`planner_cloud_data` 中的账号或计划数据。
- 不改变 `planner_login`、`planner_get_data`、`planner_put_data` 的签名。
- 迁移删除的仅是失败计数/锁定状态表 `planner_login_attempts`。
- 现有账号密码摘要继续有效，无需重新设置密码。

## 风险与限制
- 取消应用层失败次数锁定会减少对密码猜测的防护；需确保密码强度及数据库权限配置。
- 该变更不能关闭 Supabase 平台、代理或网络层独立实施的限制。
- 真实 Supabase 未在本环境连接验证；迁移必须在项目 SQL Editor 执行后进行验收。

## 回滚思路
如需恢复旧规则，必须重新创建失败统计表并恢复旧版函数定义；仅恢复前端 ZIP 不会恢复数据库函数。因此建议在执行迁移前保存当前 SQL 定义/数据库备份。


---

## 原文件：`docs/impact_analysis_V10.35_language_workspace_v2.md`

# V10.35 影响分析：外语学习工作区 V2

对应需求：`requirements_V10.35_language_workspace_v2.md`（已确认）。

## 1. 现状（V10.34）
- `language-workspace.js` 在捕获阶段监听 `#module-language` 点击；进入时给 `#app-shell` 加 `language-workspace-active`，CSS 隐藏 `.top` 之后除工作区根节点外的全部内容。
- 由于工作区接管了「外语学习」模块按钮，旧任务模块（`LANGUAGE_KEY='personal-language:v1'`）仍由主程序加载、搜索、同步，但界面上没有入口。
- 工作区数据：`personal-language-study-workspace:v1`，schemaVersion 1，字段 `items / records / settings`；状态只有 `new / mistake / mastered`。

## 2. 修改范围

| 文件 | 修改内容 | 风险 |
|---|---|---|
| `index.html` | 顶部工具栏增加工作区切换控件；「外语学习」模块按钮文案改为「外语任务」；脚本版本号；应用版本 10.35.0 | 中：主页面结构 |
| `language-workspace.js` | 去掉对 `#module-language` 的点击劫持，改由工作区切换控件激活；状态模型、单元/难度字段、分页、详情页、笔记、schema 2 迁移、导入兼容 | 高：数据迁移 |
| `language-workspace.css` | 工作区切换控件、详情页、分页、笔记样式；隐藏规则改为同时隐藏模块切换栏 | 低 |
| `i18n.js` | 新增「计划工作区 / 外语学习工作区 / 外语任务」三语文案 | 低 |
| `sw.js` | 缓存版本号 | 低 |
| `VERSION` `package.json` `CHANGELOG*.md` | 版本与更新记录 | 低 |
| `docs/language-learning-workspace*.md` | 更新为 V2 说明 | 低 |
| `tests/e2e/helpers.js` | `language` 模块条目改回旧任务键 `personal-language:v1`，工作区单独处理 | 中：影响既有隔离测试 |
| `tests/e2e/language-workspace.spec.js` | 进入方式改为工作区切换；增加状态、分页、笔记、迁移用例 | 中 |
| `scripts/validate-v10.34.mjs` | 「必须存在 `#module-language`」等断言保持；若断言依赖点击劫持需调整 | 低 |
| `scripts/validate-v10.35.mjs`（新增） | 静态校验 schema 2、迁移备份键、工作区键、无 Supabase 访问 | 低 |

## 3. 不修改的内容
- 七个模块的存储键、`schemaVersion: 1`、JSON 备份格式、`MODULE_KEYS`、`CLOUD_PARTITIONS`。
- 「外语任务」模块的分类、星级统计、分页、计划移动目标、全局搜索、单模块/整体云同步——仅改显示名称。
- Supabase 表结构、RPC 及参数；不需要 SQL 迁移。
- 外语学习工作区仍不参与云同步、整体备份。

## 4. 关键风险与对策

### 4.1 V1 → V2 数据迁移
- 风险：迁移出错导致学习内容丢失。
- 对策：迁移前把原始字符串写入 `personal-language-study-workspace:v1:pre-v2-backup`（已存在不覆盖）；迁移为纯函数，先在内存生成并校验 items/records 数量一致后再写回；失败时只读打开并提示导出。

### 4.2 工作区切换与主程序状态
- 风险：切换工作区触发 `switchModule` 或重新 `load()`，导致计划模块搜索、分页、撤销状态丢失。
- 对策：工作区切换只改 `#app-shell` 的类名和 `personal-planner:active-workspace:v1`，不调用主程序任何模块函数；返回计划工作区时不重新渲染列表以外的状态。E2E 覆盖「切换前后搜索词与页码不变」。

### 4.3 旧任务入口恢复
- 风险：V10.34 期间用户看不到旧任务，恢复后可能误以为是新增数据。
- 对策：更新记录中说明「外语任务」即原外语学习任务列表，数据未变化。

### 4.4 启动顺序
- 风险：`language-workspace.js` 作为 module 脚本晚于主程序执行，刷新恢复外语学习工作区时出现计划列表闪现。
- 对策：在 `index.html` 头部用极小的同步脚本读取工作区键，提前给 `<html>` 加 `data-workspace="language"`，CSS 据此先隐藏计划区域。

### 4.5 既有测试
- `helpers.js` 当前把 `language` 模块指向工作区键，V10.35 需改回旧任务键，否则模块隔离测试会误判。

## 5. 回滚
- 代码回滚到 V10.34 后，V1 的 `load()` 读到 schemaVersion 2 会静默以空数据打开；之后任何操作（包括切换导航页）都会调用 `save()`，**用空数据覆盖 V2 数据**。
- 对策：
  - 回滚前先在 V10.35 中导出 JSON 备份；回滚后从 `personal-language-study-workspace:v1:pre-v2-backup` 或导出的备份恢复。
  - V10.35 发布前确认可用后再推送到 `main`（GitHub Pages 自动部署），避免需要线上回滚。
  - 回滚步骤写入维护文档。


---

## 原文件：`docs/impact_analysis_V10.38_toeic_question_bank.md`

# V10.38 影响分析：托业题库

| 范围 | 影响 |
|---|---|
| `language-workspace.js` | 新增托业题库页、`exam` 规范化、点选记录；V2.0.0 → V2.1.0。原有页面逻辑不变，只有卡片预览和详情页对带 `exam` 的条目换了排版 |
| `language-workspace.css` | 只追加 `.lw-set*`、`.lw-part*`、`.lw-exq*`、`.lw-opt*` 等新类，不改旧样式 |
| 数据 | 存储键、schemaVersion 不变。`exam` 和 `settings.toeic` 是可选字段，旧数据照常读取 |
| 计划工作区、云同步 | 不涉及 |
| `index.html` | 只改脚本版本参数 `?v=2.1.0` 和应用版本 |
| 测试 | 新增 `tests/e2e/toeic-workspace.spec.js`（编造示例题）；`language-workspace.spec.js` 的导航选择器限定在 `.lw-nav` 内 |

## 风险

- **回滚到 V10.37**：V2.0.0 的 `normalizeItem` 会保留 `exam` 等额外字段（展开复制），`settings.toeic` 也会保留，所以回滚不会丢失点选记录，只是看不到托业题库页。
- **导入替换全部数据**：导入题库 JSON 会覆盖已有学习内容。工具提供 `--merge`，页面导入前也有确认框。
- **数据量**：7 套 × 2 个 T 约 1.4 MB，低于 5 MB 导入上限；LocalStorage 一般有 5–10 MB。


---

## 原文件：`docs/impact_analysis_V10.3_reference_website.md`

# V10.3 影响分析：参考网站

## 影响范围
- `index.html`：表单输入、计划数据归一化、保存/编辑、列表展示、搜索和 URL 安全检查。
- `sw.js`：缓存版本升级，避免客户端继续使用旧 HTML。
- README、CHANGELOG、需求/验收/技术/部署说明同步更新。

## 数据兼容
- 新字段为可选字符串 `referenceUrl`，最大 2048 字符。
- 旧计划和旧 JSON 备份缺少字段时归一化为空字符串。
- 回收站保存的是原计划对象，因此自动继承该字段；恢复后仍可见。
- Supabase 以 JSONB 保存完整状态，不改变表结构、RPC 参数或 SQL 权限，因此不需要 SQL 迁移。

## 安全与边界
- 仅允许 HTTP/HTTPS；不允许 `javascript:`、`data:` 等协议。
- 使用 `textContent` 设置链接标签/文字，避免将输入解释为 HTML。
- 外部链接新标签页打开，并设置 `noopener noreferrer`。
- 格式验证无法判断目标站点是否在线或是否被网络策略阻挡；这符合方案 A 的范围。

## 回归关注点
新增/编辑/保存、旧数据兼容、JSON 备份恢复、Supabase 快照同步、回收站/归档/撤销、搜索和 PWA 缓存均需验收。


---

## 原文件：`docs/impact_analysis_V10.4_pdf_export.md`

# V10.4 影响分析：PDF 导出

## 影响范围
- 前端入口：顶部增加“导出 PDF”按钮。
- 导出逻辑：读取 `#task-list` 中已渲染的 `.task` 节点，天然继承当前周期、搜索、分类筛选与排序。
- 打印视图：新窗口内生成独立 HTML/CSS，A4 打印布局、记录防分页拆分、中文字体回退、长文本换行和页码。
- 文档与缓存：更新需求、验收、变更日志、README、技术手册、功能/部署说明、AI 协作指南及 Service Worker 缓存版本。

## 兼容性与风险
- 新窗口可能被浏览器弹窗拦截，按钮点击时同步调用 `window.open` 并在失败时提示用户允许弹窗。
- 浏览器打印对话框由浏览器控制，用户需要选择“另存为 PDF”；这不是静默直接下载。
- CSS 防分页规则适用于一般高度的记录；单条记录本身超出整页高度时，浏览器可能强制拆页。
- 字体显示依赖目标系统的中文字体；使用多个常见字体回退。
- 导出内容来源于当前 DOM，避免筛选结果与导出内容不一致；不写入数据。

## 数据与云端影响
无数据 schema、localStorage、Supabase RPC、数据库表或权限变更；无需 SQL 迁移。此版本不实现用户此前暂缓的数据自动备份与恢复功能。

## 验证计划
静态检查 JavaScript 语法、HTML 注入转义、打印模板、CSS 防分页声明、ZIP 完整性；在 Chromium 生成测试 PDF 检查中文、多行备注、长 URL 与分页效果。实际浏览器交互及跨平台字体差异需目标环境进一步验收。

## 本轮验证结果
- `node --check`：内联 JavaScript 语法检查通过。
- Chromium 自动化交互：导出弹窗成功打开；搜索过滤后 PDF 页面仅包含当前匹配记录，隐藏记录和其他周期记录未混入；未发现页面 JavaScript 异常。
- Chromium A4 PDF 实际生成：中文标题/备注可提取；使用接近字段上限的 500 字符中文备注和约 2,000 字符 URL 进行测试，PDF 为 1 页，记录未跨页拆分，长 URL 自动换行。
- ZIP 完整性：打包后执行 `unzip -t` 验证。
- 未测试：真实桌面交互式打印对话框的“另存为 PDF”操作，以及用户实际 Supabase 环境（本功能不调用 Supabase）。


---

## 原文件：`docs/impact_analysis_V10.5_five_star_priority.md`

# V10.5 影响分析：五级优先级

## 变更范围
- 优先级校验：有效整数范围由 1–3 扩展为 1–5。
- 表单：新增 4 星、5 星按钮；提示 1 星最低、5 星最高。
- 列表：继续按有效优先级数值绘制星形图标。
- 排序：沿用原数值降序，新增等级自然进入排序。
- JSON 与云端：继续使用原 `priority` 字段，无需序列化或 RPC 改造。
- PDF：沿用列表无障碍标签读取星级，因此可输出 4/5 星。
- PWA：升级缓存名称，确保安装版获取新静态资源。

## 兼容性
旧记录的 1、2、3 数值保持不变；缺少字段继续默认为 1。非法数值继续回退为 1。新值 4、5 由旧版代码读取时会被旧版校验回退为 1，因此建议使用 V10.5 及之后版本打开包含新等级的数据；部署后不要再用旧版覆盖云端快照。

## 数据库影响
无 schema、SQL、RPC、RLS 或数据库表变更。Supabase JSONB 快照可直接存储数字 4 和 5，无需迁移。

## 风险与验证
主要风险是旧版网页无法识别 4/5 星，可能在旧版读取并再次保存时将其降为 1。应确保所有设备更新到 V10.5 后再进行新等级的跨设备编辑。按验收清单检查新建、编辑、排序、JSON、PDF、云端同步和移动端布局。


---

## 原文件：`docs/impact_analysis_V10.6_transactional_save.md`

# V10.6 影响分析

- **状态管理**：新增候选状态副本与统一 `commitState()` 提交入口。
- **持久化**：`save(nextState)` 可保存候选对象，不再依赖先修改全局状态。
- **UI**：成功刷新、成功消息及撤销快照仅在持久化成功后执行。
- **表单**：写入失败时保留当前输入及编辑上下文。
- **回收站**：单项、批量、永久删除与恢复统一采用事务提交。
- **自动任务**：清理及提醒标记先保存，避免仅修改内存。
- **兼容性**：数据结构和 `schemaVersion: 1` 不变；无需 Supabase SQL 迁移。
- **风险**：本次未执行真实浏览器的存储配额故障注入，仍需按验收表完成实机测试。


---

## 原文件：`docs/impact_analysis_V10.9_priority_sorting.md`

# V10.9 影响分析

## 变更范围
仅涉及 index.html 的排序控件默认值、排序比较逻辑与独立排序偏好保存；更新 Service Worker cache 及说明文档。

## 兼容性
- 业务数据键 personal-planner:v1 不变。
- schemaVersion: 1 不变。
- 任务对象字段不变；JSON 导入导出不变。
- Supabase JSONB 快照及 RPC 不变。
- 撤销快照与 V10.6 commitState() 不变。

## 风险与控制
- 同星级顺序：使用筛选结果原始索引作稳定 tie-break。
- 已完成任务：只在优先级排序模式中置底，其他模式遵循其名称／创建时间排序语义。
- V10.8 未持久化排序偏好；V10.9 首次默认优先级，新偏好独立存储。
- 存储受限时当前页面仍可切换，刷新后回退默认值；不影响任务数据。
- PWA 更新 cache name，促使旧缓存被替换。


---

## 原文件：`docs/impact_analysis_V10_trash_undo_archive.md`

# V10 影响分析：回收站、归档与操作撤销

## 影响范围清单

1. **计划列表 UI（`index.html`）**：新增回收站、归档入口；每条计划新增归档操作；正常列表过滤归档项目。
2. **删除路径**：单条删除、清空当前周期、清理已完成计划必须统一改为软删除，不能留下某条路径直接移除计划的漏洞。
3. **完成记录**：删除时需要一并快照该计划的 `completions` 键值；恢复时恢复这些记录；永久删除时丢弃记录。
4. **编辑和状态变更**：保存编辑、完成勾选、归档/取消归档、软删除、恢复都需要在变更前保存撤销快照；撤销只在当前页面会话短时间有效。
5. **数据模型与兼容**：`safeState`、JSON 导入校验和初始化必须识别 `trash[]` 与 `archivedAt`，并兼容没有新字段的 V9 数据。
6. **JSON 备份/恢复**：导出需要携带回收站和归档字段；导入须检查数量与重复 ID，并提示整份替换。
7. **Supabase 云端快照**：云端以 JSONB 保存整份状态，因此新增字段随现有 RPC 自动传输，不需要新表或 SQL 迁移；跨设备变更仍需手动上传/下载。
8. **自动清理**：启动时和运行期间周期性清理超过 30 天的回收站项目；必须只清理回收站，不触碰活动或归档计划。
9. **统计与提醒**：归档计划从常规列表和完成率统计排除；通知扫描仍只针对活动计划，避免归档计划继续触发提醒。
10. **PWA 缓存**：升级 `sw.js` 的 cache name，否则用户可能继续看到旧版页面。
11. **随机临时计划自动过期**：原有每日/每周/每月随机计划在周期变化时仍按既有逻辑自动过期清理；这属于系统周期规则，不进入手动删除回收站。若希望过期的临时计划也可恢复，需要另行确认产品规则。
12. **文档**：更新 README、CHANGELOG，并新增需求、验收和影响分析文档。

## 数据库迁移判断
V9 的 `planner_cloud_data.data` 是 JSONB 快照，SQL 校验只要求 `schemaVersion`、`plans` 和 `completions`。V10 保持 `schemaVersion: 1` 并增加可选 JSON 字段，因此不需要数据库结构迁移。保留现有 `docs/supabase-setup.sql` 即可。

## 已知边界与风险
- 撤销栈仅在当前页面会话中保留，提示窗口约 5 秒；刷新页面后不能撤销此前操作。
- 永久删除、清空回收站、导入 JSON、云端下载覆盖不提供撤销，必须确认并建议先备份。
- 云端同步仍为整份覆盖；若一台设备的回收站较新而另一台设备上传旧快照，旧快照可能覆盖新数据。上传/下载前仍应先备份并确认设备数据版本。
- 需要在真实 Supabase 项目中手动验收云端快照往返；本地静态检查不能替代云端端到端验证。


## V10.1 入口遗漏修复影响
- `index.html` 首页顶部 `.top-actions` 新增 `open-trash` 与 `open-archive` 按钮；`trash-count` 显示回收站项目数。
- 这同时修复事件绑定时查找不到 DOM 元素、可能中断后续初始化的问题。
- `sw.js` 缓存名称升级，避免 PWA 继续命中 V10 旧缓存。
- 无数据库结构变化，无需执行 Supabase SQL。


---

## 原文件：`docs/migration_V10.3_reference_website.md`

# V10.3 数据库迁移说明

**无需执行 Supabase SQL 迁移。**

原因：当前系统把全部计划对象作为 JSONB 数据快照传入现有 `planner_put_data` RPC；下载时通过 `planner_get_data` 取回。`referenceUrl` 是计划 JSON 对象中的可选字符串，不需要新增数据库列、表或 RPC。部署 V10.3 时更新项目文件即可。旧计划没有该字段时，前端会自动按空值兼容。


---

## 原文件：`docs/migration_V10.4_pdf_export.md`

# V10.4 数据库迁移说明

无需执行 Supabase SQL 迁移。PDF 导出仅读取当前可见列表并生成浏览器打印页面，不修改数据结构、云端 RPC 或权限。部署时替换项目静态文件并确保 Service Worker 更新即可。


---

## 原文件：`docs/migration_V10.5_five_star_priority.md`

# V10.5 数据迁移说明

无需执行 Supabase SQL 迁移。

计划对象仍使用原有 `priority` 数值字段，`schemaVersion` 继续为 1。旧值 1、2、3 保持不变；缺少优先级字段仍按 1 星处理。新版本可保存 4、5 星。

**注意：** V10.4 及更早版本的校验范围只有 1–3，若旧版本打开并重新保存包含 4/5 星的记录，会将其回退为 1。请将所有设备和 PWA 更新至 V10.5 后再使用新等级。


---

## 原文件：`docs/migration_V10.6_transactional_save.md`

# V10.6 数据迁移说明

本版本不改变任何持久化字段，不改变 JSON 备份结构，不改变 Supabase JSONB 数据结构，`schemaVersion` 仍为 1。

无需执行 SQL、数据转换或旧备份升级。部署时更新 `index.html`、`sw.js` 及文档即可。浏览器会按新的 Service Worker 缓存名下载 V10.6 资源。


---

## 原文件：`docs/requirements_V10.10_star_dashboard_jump.md`

# V10.10 首页星级统计与任务快速定位 - 需求规格

## 目标
在首页直接展示五级优先级的未完成任务数量，并提供从星级统计到具体任务的快速定位。

## 统计范围
- 纳入每日、每周、每月、每年正式计划。
- 排除随机临时计划、已归档计划及当前周期已完成的计划。
- 使用现有 priority 字段和 completionKey(plan) 判断；异常优先级按既有规则回退为 1 星。
- 1–5 星均展示数量，数量为 0 时按钮禁用。

## 点击定位
1. 对被点击星级，分别统计每日、每周、每月、每年未完成任务数量。
2. 进入数量最多的周期；并列优先顺序：每日、每周、每月、每年。
3. 清空搜索关键词与分类筛选，保留排序模式。
4. 切换周期并重绘列表，定位该星级第一条未完成任务，平滑滚动并短暂高亮。

## 非功能约束
- 不修改任务、完成记录、归档状态或撤销数据。
- 不调用事务保存，不新增 LocalStorage 键，不改变 JSON／Supabase schema。
- 统计在现有 render 流程中刷新。
- 使用 DOM API 和 textContent 创建按钮，支持键盘操作与 aria-label。
- 移动端五个星级入口应在窄屏可见且可点击。


---

## 原文件：`docs/requirements_V10.11_multilingual_ui.md`

# V10.11 需求规格：中英日多语言界面

## 目标
在不改变现有计划管理业务和数据格式的前提下，为整个软件提供简体中文、英文和日文显示界面。

## 功能要求
1. 语言：zh（简体中文）、en（English）、ja（日本語）。
2. 默认语言为中文；用户主动切换后立即更新界面，无需刷新。
3. 登录页面与主应用首页均提供语言选择入口。
4. 使用独立 LocalStorage 键 `personal-planner:language:v1` 记忆语言；刷新、关闭重开和 PWA 重启后保持。
5. 覆盖所有系统界面文案：登录、首页、导航、周期、分类显示、搜索、筛选、排序、计划表单、星级、提醒、弹窗、确认、错误和成功反馈、回收站、归档、云端同步、更新履历、日期时间、通知和 PDF 导出。
6. 用户输入内容（计划标题、备注、参考 URL、用户名等）不得翻译或改写。
7. 分类、周期等内部枚举值和计划数据仍使用现有值；仅改变显示文本。
8. 更新履历按语言显示，三种语言均保留 V0 至当前版本历史。
9. 三种语言资源需纳入 Service Worker 离线缓存。

## 非功能与约束
- 不修改 `schemaVersion: 1`、JSON 备份结构、Supabase 数据结构/RPC、计划保存逻辑或业务字段。
- 不依赖在线翻译服务或第三方 CDN。
- 语言设置独立于计划数据；无需 SQL 迁移。


---

## 原文件：`docs/requirements_V10.12_custom_category_management.md`

# V10.12 需求规格：自定义分类管理

- 新增分类管理入口，支持添加、编辑和删除。
- 保留原有七个分类及顺序；新建计划和快速添加默认使用第一项。
- 分类名非空、最多 30 字符、大小写不敏感去重；至少保留一个分类。
- 改名同步普通、归档和回收站计划。
- 删除使用中分类必须选择目标分类，先迁移计划再删除；取消或失败不改变原数据。
- 分类配置随本地保存、JSON 备份／恢复和 Supabase 同步。
- 旧数据兼容；schemaVersion: 1 不变，无 SQL 迁移；自定义分类名不自动翻译。


---

## 原文件：`docs/requirements_V10.13_organize_module.md`

# V10.13 整理模块需求规格

## 1. 目标
在慢慢计划首页增加「整理」入口。整理与计划复用同一套应用 UI 和业务操作，但拥有独立的数据空间，不重新开发登录、列表、编辑、分类、归档、回收站和云端服务。

## 2. 模块入口
- 首页并列显示「计划」和「整理」两个入口。
- 默认打开计划模块，点击入口可切换。
- 切换模块不清空或混合任何业务数据。
- 两个模块共用账号登录和 Supabase 连接配置。

## 3. 整理功能
复用计划模块已有的新增、编辑、删除、快速添加、搜索、分类筛选、排序、完成状态、分类管理、归档、回收站、撤销、JSON 导入导出、PDF 导出和云端同步操作。
整理是单一列表，不显示计划周期选择及首页星级周期统计；所有整理项目统一显示在列表中。
整理项目沿用现有通用字段：ID、名称、备注、参考 URL、分类、优先级、提醒、创建／更新时间、归档状态及回收站记录。

## 4. 默认分类
按以下顺序初始化：书籍、电子产品、软件/APP、网站、其他。
- 新增与快速添加默认分类为第一项「书籍」。
- 支持新增、改名、删除。
- 分类名非空、最多 30 字符、大小写不敏感去重。
- 至少保留一个分类。
- 删除被使用分类时必须先将普通、归档及回收站中的项目转移至其他分类，再删除。
- 用户自定义分类名称不自动翻译。

## 5. 数据隔离
- 计划本地存储键保持 `personal-planner:v1`。
- 整理使用独立键 `personal-organizer:v1`。
- 整理分类、项目、完成记录、归档和回收站与计划完全独立。
- 整理项目固定使用内部周期值 `daily` 以兼容现有状态验证；界面不展示周期选项。
- 计划原有 schemaVersion 1 和历史数据必须兼容。

## 6. 备份与恢复
- JSON 导出包含 `moduleType`，计划为 `plan`，整理为 `organize`。
- 整理模块只接受整理备份；计划模块拒绝整理备份。
- 旧版没有 moduleType 的计划备份继续兼容。
- 导入只替换当前模块，不触碰另一模块。

## 7. 云端同步
- 继续使用现有 `planner_get_data` 与 `planner_put_data` RPC。
- 云端快照根对象保留原计划字段，在根对象增加 `organizer` 字段保存整理完整状态。
- 上传前读取远端快照，只替换当前模块并保留另一模块。
- 下载只恢复当前模块。
- 旧云端快照没有 organizer 字段时，计划数据仍可正常读取；整理模块提示尚无整理云端备份。
- 不修改数据库表及 RPC 参数，不要求 SQL 迁移。

## 8. 多语言与 PWA
- 支持中文、英文、日文。
- 用户输入的整理名称、备注、URL、自定义分类名称不自动翻译。
- 更新 Service Worker 缓存版本。
- 手机与桌面布局沿用现有响应式界面。

## 9. 非目标
第一阶段不增加 ISBN、设备序列号、软件版本、自动网站抓取、AI 分类或统计分析等专用字段与自动化。


---

## 原文件：`docs/requirements_V10.14_four_module_management.md`

# V10.14 四模块管理需求规格

## 目标
在 V10.13 基础上增加工作、外语学习两个独立模块，保留计划和整理功能。

## 模块顺序与初始分类
1. 计划：学习、生活、健康、财务、兴趣、未分类；移除工作，其他原有分类及顺序保持不变。
2. 工作：待处理、进行中、已完成、工作记录、会议、其他。
3. 外语学习：英语、德语、俄语、日语、其他；不含挪威语。
4. 整理：书籍、电子产品、软件/APP、网站、其他。

## 计划迁移
旧计划、归档记录和回收站记录中 category=工作 的记录改为未分类；删除工作分类。除 category 外不修改其他字段。未分类是系统固定分类，不可编辑、删除。

## 工作状态
工作分类和任务状态分别保存。任务状态为待处理、进行中、已完成；在编辑表单和列表中可修改，并与完成复选框同步。工作状态不按自然日重置。

## 通用能力
四个模块复用新增、编辑、删除、快速添加、搜索、筛选、排序、分类管理、归档、回收站、撤销、PDF 和现有提醒能力。非计划模块为单列表，不显示计划周期和计划星级摘要。

## 数据与同步
本地键分别为 personal-planner:v1、personal-work:v1、personal-language:v1、personal-organizer:v1。四模块分类、记录、完成状态、归档、回收站独立。JSON moduleType 分别为 plan/work/language/organize；旧版无 moduleType 的计划备份继续兼容。Supabase 沿用原 RPC，计划保留根结构，work 和 language 使用同名分区，整理继续使用 organizer 分区。上传和下载只操作当前模块，不覆盖其他分区。无需 SQL 迁移。

## 多语言与 PWA
界面继续支持中文、英文、日文。用户输入内容不翻译。Service Worker 缓存升级；刷新后记住上次活动模块。

## 不在本版本范围
不开发专用单词卡、记忆曲线、课程系统；不做大规模重构，不更换数据库、登录或前端框架。


---

## 原文件：`docs/requirements_V10.25_sync_overwrite_protection.md`

# V10.25 需求：云端同步数据覆盖保护

上传前比较本地与云端对应数据的最新变更时间；下载前执行相同检查。范围覆盖当前模块同步与六模块整体同步。提示必须展示本地时间、云端时间、新旧关系及覆盖影响。用户选择是才执行，选择否则不修改数据。时间缺失时明确提示无法可靠判断。确认后再次读取云端快照；若云端快照版本变化则取消操作。不得自动合并或自动选择较新一方。
