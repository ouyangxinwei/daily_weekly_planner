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
