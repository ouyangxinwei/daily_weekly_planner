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
