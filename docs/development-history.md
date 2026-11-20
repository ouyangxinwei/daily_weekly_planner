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
