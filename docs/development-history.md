# V10.72.0 入口分流与学习会议整合（2026-11-26，integration）

- 基础提交：最新 main `12449b7683ce51be30fb693a8b9ae95cc56ebbd2`；入口分流来源：development `7892290c488a2ea05a63569c968009cfa9e6706c`。
- 保留 main 的学习会议本地存储实现、JSON 导入/导出、`learning-meetings.js` / CSS、Supabase migration 与 company-api 路由（云端路由当前未由前端调用）。
- 整合个人/管理员启动入口、三语文案、Service Worker 缓存及文档；统一版本号为 10.72.0。
- 当前为整合分支，尚待 CI 与浏览器验收；未合并 main、未部署 Pages。

# V10.71 修订：学习会议改为本地手动维护（2026-11-27，main）

- 现象：执行 migration 并部署 company-api 后，打开「学习会议」仍显示 `NOT_FOUND`。
- 分析：company-api 先验证账号再匹配路由，NOT_FOUND 只会出现在路由未匹配时，说明线上运行的函数仍不含 /learning-meetings（可能部署到了其他函数名/项目，或部署的不是 main 最新代码）。**原因待查。**
- 处理：按用户要求绕过 company-api，前端改为 localStorage 保存，并增加 JSON 导出/导入。云端代码保留不删。详见 [docs/learning-meetings.md](learning-meetings.md)。
- 验证：语法检查；浏览器测试未执行。
- 追加需求（学习会议需求设计文档 V1.0，2026-11-26）：存储确认为「仅本地 + JSON 备份」；AI 解析助手改为指定月份 + 独立活动信息输入框，删除模糊日期说明，导入时按月份过滤；列表增加形式/费用/地域筛选，新增 `feeType` 字段。网页本身不调用 AI，「解析」仍由用户把提示词交给外部 AI 完成。验证：语法检查和一次 Node 冒烟检查（月份过滤、费用判断、提示词），浏览器测试未执行。

# V10.71 学习会议（2026-11-27，main）

- 需求：学习会议实施方案（手动录入 + AI 提示词辅助、Supabase 独立表、独立模块、导出 .ics、Asia/Tokyo）。按评审调整：沿用 V10.68 仓库管理的账号校验与快照模式（不使用 Supabase Auth），只做 GET/PUT 两个接口，地区/形式改为英文代码，状态按日期计算，修正 .ics 全天结束日、时间格式、时区、DTSTAMP、UID 和折行。
- 实现、部署步骤与待测试清单：[docs/learning-meetings.md](learning-meetings.md)。
- 验证：语法检查与 CI 静态校验通过；.ics 输出人工核对一次。浏览器测试、migration 执行与 company-api 部署由其他人负责。

# V10.70 仓库清单批量清空与 GitHub 全量提取 — 2026-11-26（development，待验证）

- 仓库管理工具栏增加「清空清单」按钮。弹出包含当前记录数量、清除范围和不可撤销提醒的确认框；取消不发送请求，确认后通过现有 PUT /repositories 写入空数组。
- 清空成功后刷新列表和统计；云端写入失败时保留当前列表并显示错误。仅清除当前账号仓库管理数组，不删除 GitHub 仓库、原始 JSON 备份、Supabase 表行或其他业务数据。
- 新增 GitHub 全量仓库提取提示词入口及文档。要求使用已授权 GitHub 连接器分页读取全部可访问仓库，报告权限盲区，并输出可直接导入的 oooo.repository-management v1 JSON；元数据和项目分析写入 notes/techStack。
- 受现有导入器 1000 条/文件和 company-api 1 MiB 限制，超出时拆分多个 JSON 文件。只读 GitHub，不读取/输出秘密、不执行 GitHub 写操作。
- 新增 Playwright mock API E2E 与 V10.70 静态契约验证；无 Supabase migration、Edge Function 或 API schema 变更。
- 交付：PR #103 已 squash merge 到 development（`26ed1d8aecf64adb66b718ac7c07c18e17902740`），PR #104 已 squash merge 到 main（`c4cdb0d3c8762bc3805c9d39e2a1262e36bba2a6`）。main GitHub Actions run `45741431942` 和 Pages deployment run `45741431344` 均成功；development 已恢复并与 main 同步。本地 Windows 页面手动验收未执行。

# V10.69 界面模式（使用身份）选择（2026-11-26，main）

- 需求：《用户角色区分功能设计文档 V1.0》；与用户确认的调整：定位为界面模式而非权限控制；`<html data-role>` + CSS 隐藏；登录后弹 `<dialog>`；「账号与同步」切换；退出登录清除；未选择时按完整界面。
- 实现与待测试清单：[docs/user-role-mode.md](user-role-mode.md)。
- 验证：仅语法检查与 CI 静态校验（validate-v10.25～v10.68 全部通过）；浏览器测试未执行。
- 交付：按用户要求直接提交并推送 `main`，同步 `development`；合并后的部署验证由其他人负责。

# V10.68 仓库管理云端化 — 2026-11-26（development，未部署）

- 仓库管理复用现有 `oooo` 单账号登录，经 `PlannerCompanyContext` 和 company-api 访问个人云端资料库。
- 新增独立 Supabase 表 `repository_cloud_data`，启用 RLS，禁止 anon/authenticated 直接访问；服务端 RPC 再次验证现有账号凭据。
- 新增 `GET/PUT /repositories` API。CRUD 与确认 JSON 导入写入独立云端表，不进入计划云端快照。
- JSON schema 保持 `oooo.repository-management` v1。首次云端为空时由用户导入 16 条数据，不自动上传 seed。
- 前端不再使用仓库专用 LocalStorage；旧浏览器记录不会自动迁移，需先导出再导入。
- migration 与 Edge Function 源码仅在 development；数据库迁移未应用、Edge Function 未部署、Pages 未部署。尚未完成本地、浏览器或真实 API 验证。

# V10.67 GitHub 仓库管理模块（2026-11-26，development）

- 新增独立「仓库管理」入口与管理界面，初始 seed 包含账号下 16 个已核实仓库名称、GitHub URL 和默认分支。
- 支持仓库条目手动新增、编辑、删除；分类、技术栈、状态、优先级、特殊标记、备注和搜索/筛选/统计。
- JSON 导入采用 schema 校验、重复检查、新增/更新/跳过预览和用户确认后的合并；不会删除导入文件未包含的现有条目；支持完整 JSON 导出。
- 使用独立 LocalStorage `planner-repositories:v1`，不进入计划模块备份、整体云端快照或 Supabase；删除只作用于本应用条目。
- 初始技术栈留空、状态为「待整理」、带「待核实」标签；初始分类仅作整理建议，等待用户逐项核实。
- 新增 `repository-management.js/.css`、seed JSON 和 V10.67 验证脚本；更新 Service Worker 缓存版本、README、产品规范、功能说明、技术手册和交接文档。
- 同步确立分支规则：日常开发统一在 `development`，合并到 `main` 必须先获仓库所有者明确许可；`feat/agent-plan-steps` 独立保护。
- 静态检查：仓库管理 JS 与验证脚本语法解析通过；16 条 seed URL 唯一；模块 DOM 引用存在且新增 ID 无重复；Service Worker 预缓存包含模块资源和 seed JSON；VERSION 与 package.json 均为 10.67.0。
- 尚未执行项目本地 `npm run test:validate:repositories`，真实浏览器验收待执行；页面原有重复 ID `sync-message` 已记录为独立未完成事项，不属于本次新增模块。
- 当前状态：已写入 development；未合并 main、未部署。

---

# V10.60 Phase 3-B-B：按币种的月度收支趋势（2026-11-24）

- 公司业务工作区新增「月度收支趋势」，按 JPY/CNY/USD 分别展示最近 12 个自然月的已完成收入、支出、净额和预计金额。
- 使用交易日期归属月份；已完成交易纳入实际收支，预计交易单独汇总，取消交易排除；不做跨币种合计或汇率换算。
- 使用 BigInt 微单位精确汇总；通过现有 company-api v6 完整分页读取 transaction，不修改数据库、API、RLS、Storage 或生产业务数据。
- 三语与响应式布局；常规验证脚本 `scripts/validate-v10.60.mjs`。
- 功能 PR #74 已于 2026-11-24 squash merge，合并提交 `6b29839b0dbf7975597ac44ede571d068e89a941`；验证 workflow run #427（`45387896039`）success，日志确认 V10.60 验证通过。
- 用户暂缓 V10.59 实际浏览器验收，不阻断本阶段开发；V10.60 真实浏览器验收同样由用户暂缓。Pages build/deploy 尚未取得成功证据。

# V10.59 Phase 3-B-A：客户、项目、任务与跟进附件入口（2026-11-24）

- 在客户卡片、项目列表、任务列表和跟进列表增加统一附件管理入口，沿用 Phase 3-A 已有的附件上传、列表、下载和删除能力。
- 将 `openAttachments(record)` 暴露为 `window.CompanyRecords.openAttachments`，不复制附件管理逻辑。
- 复用 company-api v6 和私有 Bucket `company-documents`；无数据库迁移、RLS 变更、Storage policy 变更或后端部署要求。
- 三语标签：简体中文、英文、日文。Service Worker 缓存和应用版本目标为 V10.59.0。
- 开发分支：`feature/phase-3b-a-business-attachments`；PR #72 已于 2026-11-24 squash merge，合并提交 `08ceb873b1749a2318fab38c986ef7b590520411`；验证 workflow run #423 success。Pages 部署状态待确认，用户真实浏览器验收待完成。

# V10.55 美股七巨头行情看板（2026-11-21）

- 新增股票看板，位于首页天气预报模块正下方。
- 股票范围：AAPL、MSFT、NVDA、AMZN、GOOGL、META、TSLA。
- 数据采用 America/New_York 交易日期；周末和节假日按 API 实际返回的交易日处理；工作日显示本周已有数据，无本周数据时回退最近有数据的交易周。
- 显示最近交易周每日收盘价、日涨跌、周涨跌和 OHLCV 详情。
- 新增 Supabase Edge Function `stock-market-api` 代理 Yahoo Finance 非官方公开 Chart 接口；前端无 API Key。行情可能延迟、限流或发生接口变更，页面明确说明数据限制。
- 服务端缓存 10 分钟，浏览器缓存 15 分钟；网络失败时回退本地缓存。
- 当前版本 V10.55.0。分支 `feature/magnificent-seven-stock-dashboard`；交付状态待 PR、Supabase 部署、Pages 部署和用户浏览器验收记录。
- 未修改 company-api、业务数据库、RLS、认证或计划云同步数据。

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


---

## 原文件：`docs/requirements_V10.26_clear_sync_status_on_cancel.md`

# V10.26 需求：同步取消后清除状态文字

用户在单模块或六模块上传／下载的时间比较确认框中选择「否」时，应立即清除本次操作显示的「正在检查／读取」状态，不留下取消提示或重复状态。选择「是」时继续原有同步流程。此变更不涉及数据和同步规则。


---

## 原文件：`docs/requirements_V10.27_move_plan_to_results_future.md`

# V10.27 需求：计划记录移动到成绩与未来

在「计划」记录编辑窗口的「移动到其他模块」选项中新增「成绩模块」与「未来模块」。继续支持现有工作、整理、外语学习目标。只允许计划向其他五个模块单向移动；移动后删除原计划，在目标模块创建未完成事项，使用目标模块自己的默认分类。不得改变各模块数据结构、备份或云同步格式。


---

## 原文件：`docs/requirements_V10.2_remove_login_lockout.md`

# V10.2 需求规格：移除登录失败锁定

## 目标
移除项目自定义的“连续输错 5 次后暂停登录 10 分钟”功能，避免该规则阻止合法用户继续尝试登录。

## 功能要求
1. `planner_check_password(p_username, p_password)` 只负责校验允许的用户名及密码摘要，不读写失败计数或锁定时间。
2. 登录 RPC `planner_login` 的函数签名、返回类型与调用方式保持不变。
3. 云端数据 RPC `planner_get_data`、`planner_put_data` 继续使用同一密码校验函数，错误凭据仍被拒绝。
4. 新安装用 `supabase-setup.sql` 不创建 `planner_login_attempts` 表。
5. 已部署的数据库提供独立迁移脚本：替换校验函数、移除旧统计表并保留 RPC 权限配置。
6. 页面不再提示用户因项目自定义的 5 次失败规则等待 10 分钟；当前页面本来就没有该倒计时 UI，无需增加前端登录逻辑。
7. 回收站、归档、撤销、计划数据和云端快照结构不变。

## 安全影响
移除应用层失败次数限制会降低对密码猜测的防护。继续使用强密码、限制数据库权限并只在可信 HTTPS 部署地址使用系统。Supabase 平台或网络层自身的限制（若有）不由本项目迁移控制。

## 升级步骤
- 新项目：运行 `docs/supabase-setup.sql`。
- 已部署 V9/V10/V10.1 项目：运行 `docs/migration_V10.2_remove_login_lockout.sql`，不需要重建凭据表或重新录入密码。


---

## 原文件：`docs/requirements_V10.35_language_workspace_v2.md`

# V10.35 外语学习工作区 V2 需求规格

> 状态：已确认（2026-11-18）。第 2、3 节按推荐方案执行。
> 前置版本：V10.34.0 外语学习独立工作区 V1。
> 参考：《慢慢计划新增外语学习工作区——总体设计方案》第一、二阶段。

## 1. 目标
在 V1 基础上补齐总体设计方案中尚未落实的「产品结构」部分，为后续词汇、语法、统计功能打好数据基础：

1. 引入真正的「工作区」概念，与现有模块切换区分开。
2. 将学习状态扩展为五种，并由学习操作驱动状态变化。
3. 增加「学习单元」层级。
4. 增加内容列表分页与独立笔记。
5. 明确旧版外语学习任务数据的去向。
6. 数据结构升级到 schemaVersion 2，并无损迁移 V1 数据。

本版本不新增词汇、语法、统计页面（见第 11 节）。

## 2. 工作区切换（已确认：推荐方案）

### 2.1 推荐方案
- 顶部公共工具栏增加工作区切换控件：「计划工作区」「外语学习工作区」。
- 计划工作区：现有七个模块（计划、工作、外语学习任务、整理、成绩、未来、备忘）的切换栏、列表、统计、同步等保持原样。
- 外语学习工作区：隐藏模块切换栏和计划列表区域，只显示外语学习工作区的首页与导航。
- 主题、界面语言、登录状态等全局设置在两个工作区共用。
- 应用内切换，不跳转外部页面，不使用 iframe。

### 2.2 状态保持
- 新增本地键 `personal-planner:active-workspace:v1`，取值 `plan` 或 `language`，缺失或非法时默认 `plan`。
- 刷新后恢复上次的工作区；计划工作区内仍按现有 `ACTIVE_MODULE_KEY` 恢复上次模块。
- 外语学习工作区继续通过 `settings.activeTab` 恢复上次导航页。
- 切换工作区不得清除、重新初始化或重新加载任何模块数据；计划工作区的搜索、筛选、分页保持离开前的状态。

### 2.3 未采用方案
维持 V1 做法：点击「外语学习」模块即进入工作区。缺点是旧外语任务数据无入口（见第 3 节），且与总体方案「工作区」定位不一致。

## 3. 旧版外语学习任务数据（已确认：推荐方案）

V1 进入「外语学习」模块后，旧任务列表（`personal-language:v1`）被工作区替换，现有数据仍保存但界面不可见。

### 推荐方案
- 计划工作区中的「外语学习」模块恢复为原有任务列表，界面名称改为「外语任务」（中/英/日：外语任务 / Language Tasks / 語学タスク）。
- 用于管理「今天学习 30 分钟英语」这类计划任务，与工作区中的学习内容、学习记录分开保存，符合总体方案第七章。
- 存储键、分类、星级统计、分页、移动目标、备份、云同步分区 `language` 全部保持不变。
- 不自动把旧任务转换为学习内容。

## 4. 学习状态

### 4.1 五种状态
| 内部值 | 显示 | 含义 |
|---|---|---|
| `not_started` | 未学习 | 新建后尚未打开学习 |
| `learning` | 学习中 | 已开始学习，尚未得出结果 |
| `completed` | 已完成 | 已学完一遍或答对，尚未确认掌握 |
| `review` | 需要复习 | 答错或主动标记需要复习 |
| `mastered` | 已掌握 | 确认掌握 |

### 4.2 状态转换（由操作驱动）
| 操作 | 结果状态 | 是否生成学习记录 |
|---|---|---|
| 新建内容 | `not_started` | 否 |
| 在详情或练习中首次打开 `not_started` 的内容 | `learning` | 是（action=`start`） |
| 点击「完成本次学习」 | `completed` | 是（`complete`） |
| 点击「需要复习」 | `review` | 是（`review`） |
| 点击「我已掌握」 | `mastered` | 是（`master`） |
| 在已掌握内容上点击「重新学习」 | `learning` | 是（`relearn`） |
| 编辑内容 | 保持原状态 | 否 |

- 状态只能通过上述操作改变，编辑对话框中不提供直接修改状态的下拉框。
- 练习中心抽题范围：除 `mastered` 外的全部内容，`review` 优先。
- 错题管理显示 `review` 状态内容。

### 4.3 V1 状态映射
`new` → `not_started`；`mistake` → `review`；`mastered` → `mastered`；其他未知值 → `not_started`。

## 5. 内容层级

- 层级：语言 → 内容类型 → 学习单元 → 学习内容 → 学习记录。
- 学习内容新增可选字段 `unit`（学习单元，最多 60 字符，例如「N1 词汇第 3 课」「A2 语法」）。
- 原 `category` 字段保留，显示名称仍为「分类」，用于自由标签。
- 内容列表增加「学习单元」筛选，选项从当前语言、类型筛选后的已有单元中动态生成；未填写的显示为「未分单元」。
- 卡片显示：内容名称、语言 · 类型、单元、难度（新增可选字段 `level`，最多 30 字符，例如 N1、B1、TOEIC 800）、学习状态、最近学习时间。
- 不强制各语言使用相同的类型或单元。

## 6. 内容列表

- 学习内容、错题管理、学习记录三处列表分页，每页 10 条，交互与计划模块分页一致（上一页/下一页/页码，超过 5 页显示当前页附近页码）。
- 搜索、筛选变化后回到第 1 页；删除导致总页数减少时自动校正页码。
- 内容列表新增状态筛选（全部 + 五种状态）和排序：最近学习时间、最近更新、创建时间、名称。
- 当前页码、筛选条件保存在内存中，切换工作区后返回时保留；刷新后不要求保留。

## 7. 内容详情与笔记

- 点击卡片的「学习」进入详情视图，按内容类型显示：题干/原文、选项、答案/释义（默认隐藏，可切换）、解析。
- 详情页提供第 4.2 节的状态操作按钮。
- 原 `notes` 字段改名显示为「解析」（数据字段保持 `notes` 不变，避免迁移）。
- 新增独立「个人笔记」：
  - 存于 `data.notes` 数组：`id`、`itemId`、`text`（最多 3000 字符）、`createdAt`、`updatedAt`。
  - 一个学习内容可以有多条笔记，在详情页按时间倒序显示，可新增、编辑、删除。
  - 删除学习内容时，笔记与学习记录一同保留（与 V1 删除规则一致），但在列表中不再显示；后续版本可提供清理入口。

## 8. 数据结构 schemaVersion 2

```
{
  schemaVersion: 2,
  items:   [{ id, title, language, type, category, unit, level,
              prompt, answer, options, notes, status,
              lastStudiedAt, createdAt, updatedAt }],
  records: [{ id, itemId, title, language, type, action, status, at }],
  notes:   [{ id, itemId, text, createdAt, updatedAt }],
  settings:{ activeTab }
}
```

- 存储键保持 `personal-language-study-workspace:v1` 不变。
- 学习记录新增 `type`、`action`、`status`（操作后的状态）；V1 记录的 `result` 映射为 `action`：`mastered`→`master`，`mistake`→`review`，并保留原 `result` 字段。
- `lastStudiedAt`：每次生成学习记录时更新；V1 数据从该内容最后一条记录推算，没有记录则为空。

### 8.1 迁移规则
- 读取到 schemaVersion 1 时自动迁移为 2，迁移前将原始 JSON 原样写入 `personal-language-study-workspace:v1:pre-v2-backup`（已存在则不覆盖）。
- 迁移失败时不写回主键，按只读方式打开并提示用户导出数据。
- 迁移不得删除任何内容或记录。

### 8.2 导入导出
- 导出格式为 schemaVersion 2，包含 `moduleType: "language-workspace"`。
- 导入同时接受 schemaVersion 1 与 2；V1 备份按第 8.1 节迁移后导入。
- 继续保留 5 MB 上限、导入前校验及确认。

## 9. 数据边界
- 不读写计划工作区七个模块的存储键与业务数据。
- 不访问、不修改 Supabase；外语学习工作区仍不参与云同步。
- 计划任务完成状态与学习内容状态分别保存，互不联动。

## 10. 界面与兼容
- 适配现有深色/浅色主题，所有颜色使用现有 CSS 变量。
- 桌面与手机宽度（≥ 360px）均可使用，导航在手机端可横向滚动，不产生页面横向滚动条。
- 本版本界面文案仍以中文为主，新增文案集中定义，为后续三语化做准备。
- 更新应用版本至 10.35.0 与 Service Worker 缓存版本。

## 11. 非目标（留给后续版本）
- V10.36：单词与词汇（L05）、语法学习（L06）页面，简单复习间隔。
- V10.37：学习统计（L08）、学习时长记录。
- 自动评分、套卷、音频上传、间隔重复算法、云同步、三语界面、学习任务与计划任务关联。

## 12. 验收要点
1. 工作区切换控件可在两个工作区间切换，刷新后恢复上次工作区。
2. 计划工作区「外语任务」模块显示原有旧任务数据，数量与升级前一致。
3. 切换工作区前后，计划模块的搜索、筛选、分页及外语学习导航页保持不变。
4. 已有 V1 数据升级后：内容、记录数量不变，状态按 4.3 映射，备份键存在。
5. 新建内容为「未学习」；打开后变「学习中」；完成、需要复习、已掌握、重新学习均按 4.2 转换并生成记录。
6. 单元、状态筛选与排序正确；超过 10 条时分页正确，筛选后回到第 1 页。
7. 笔记可新增、编辑、删除，刷新后保留。
8. V1 与 V2 JSON 备份均可导入；格式错误或超过 5 MB 时原数据不变。
9. 深色/浅色主题、手机宽度下无布局错乱。
10. 现有 Playwright 测试与 `validate-v10.34` 校验继续通过，新增 V10.35 校验与 E2E 用例。


---

## 原文件：`docs/requirements_V10.38_toeic_question_bank.md`

# V10.38 需求：外语学习工作区 · 托业题库

状态：已实现（来源：用户提供的《托业听力题库整理与导入项目 开发文档 v0.8》、toeic-tab.patch、toeic_tool.py）

## 1. 目标

把托业听力题（第 6–12 套，每套 T1、T2，只含 Pt1–Pt4）整理后导入外语学习工作区，在页面里按「套 → T → Part」浏览和做题。

## 2. 版权与存放

- 题目内容有版权，只在本地和浏览器里使用，**不提交进公开仓库**。仓库只放代码、工具和用编造示例写的测试。
- `.gitignore` 排除 `tools/input/`、`tools/output/`、`language-workspace-import.json`、`language-study-backup-*.json`。

## 3. 页面需求

| 需求 | 做法 |
|---|---|
| 层级浏览 | 第一层：第 N 套的 T1/T2；第二层：Pt1–Pt4（题数、页数/组数、进度条）；第三层：题目页。每层有面包屑 |
| 题组一页 | Pt3、Pt4 每组 3 题一页，有题组标签和上一组/下一组；Pt1 每页 6 题，Pt2 每页 5 题 |
| 原文与题目分开 | 原文默认折叠；卡片预览只显示题目 |
| 点选判对错 | 有答案（A–D 开头）时标对错并显示解析；没有答案时只记录选择 |
| 点选记录 | 保存在 `settings.toeic.picks`（题目 id → 字母），随备份导出、导入；可清除本组/本页；首次点选进入「学习中」 |
| 其他 | 占位选项弱化显示；含图表的题加标注；详情页、练习中心使用同样的排版 |

## 4. 数据格式

沿用 schemaVersion 2 和存储键 `personal-language-study-workspace:v1`。条目新增可选字段：

```json
"exam": { "set": 6, "test": 1, "part": 3, "number": 44, "groupStart": 44, "groupEnd": 46 }
```

- 没有 `exam` 时按 id `toeic-s{套2位}-t{T}-pt{部分}-q{题号3位}` 推算；Pt3 从 32、Pt4 从 71 起每 3 题一组。
- 无效的 `exam`（非正整数、Part 不在 1–4、题号不在题组内）会被丢弃，条目按普通内容处理。
- Pt3、Pt4 的 `prompt` 写成 `【原文】…【题目】…`，页面拆开显示。
- 正确答案写在 `answer`，以 A–D 开头再接结尾或标点才算选项字母（`C`、`C) …`），避免把 “A man is…” 误判。

## 5. 整理工具 `tools/toeic_tool.py`

Python 3，无第三方依赖。源文件名必须形如 `6_T1.txt`（套号_T序号）。

```bash
python3 -I tools/toeic_tool.py tools/input/6_T1.txt tools/input/6_T2.txt -o tools/output
python3 -I tools/toeic_tool.py tools/input/7_T1.txt -o tools/output --merge 已导出的备份.json
```

输出整理后的文本、`language-workspace-import.json`、`TODO_missing_options.txt`、`validation_report.txt`。校验不通过时以非零状态退出。

**注意：页面导入会替换整个工作区。** 已有自己的学习内容时，先导出备份，再用 `--merge` 合并后导入。

## 6. 不在本版范围

- 批量填写答案和 Pt3/Pt4 选项（待有答案来源后再定格式，例如每行 `6_T1 Pt3 Q44 = B`）。
- 音频播放、图表图片、云同步。


---

## 原文件：`docs/requirements_V10.3_reference_website.md`

# V10.3 需求文档：计划参考网站

## 目标
在不破坏现有计划管理、提醒、回收站、归档、撤销、备份及 Supabase 同步的前提下，为每条计划增加可选参考网站。

## 功能需求
1. 编辑/新建计划表单在“日期与提醒时间”之后、“备注”之前显示“参考网站”输入框。
2. 输入为可选项，允许最长 2048 个字符；编辑已有计划时回填，清空后保存应移除该链接。
3. 对输入的 HTTP/HTTPS URL 进行格式验证；没有协议的普通域名自动补全为 HTTPS。
4. 有效链接显示在计划列表中，位于备注上方，显示“参考网站”标签与链接文本。
5. 点击链接在新标签页打开，使用 `rel="noopener noreferrer"`，不导航离开原计划系统。
6. 无效/不支持协议的网址不显示为可点击链接；不弹出错误提示，也不执行跳转。
7. 旧数据缺少 `referenceUrl` 字段时兼容为空，不影响加载、编辑、完成、归档、回收站和恢复。
8. 参考网址随计划纳入 localStorage、JSON 备份/恢复和现有 Supabase JSONB 整份快照同步；搜索支持匹配该字段。

## 非功能与安全
- 仅允许 `http:` 和 `https:` 协议，拒绝 `javascript:`、`data:` 等协议。
- 使用 DOM API 设置链接文本，不把用户输入拼接进 HTML。
- 新标签页链接设置 `noopener noreferrer`。
- 格式检查只验证 URL 结构，不承诺目标网站在线或可访问；跨域与网络故障由浏览器处理。

## 数据库迁移
无需迁移。参考网站作为现有 JSONB 快照中每条计划的可选字段存储，数据库表结构和 RPC 接口不变。


---

## 原文件：`docs/requirements_V10.4_pdf_export.md`

# V10.4 需求文档：PDF 导出

## 目标
为“慢慢计划”提供可打印并可保存为 PDF 的导出功能，保证一般长度的单条计划不会被分页从中间拆开。此版本不实现数据自动备份与恢复功能。

## 功能需求
1. 页面顶部提供“导出 PDF”按钮。
2. 导出内容仅包括当前计划列表实际显示的记录，遵循当前周期、搜索关键词、分类筛选与排序。
3. 空列表时不打开空白导出页，并显示简短提示。
4. 使用独立打印排版页，用户可在浏览器打印对话框选择“另存为 PDF”。不依赖在线 CDN 或新增第三方库。
5. 每条计划记录采用防分页拆分样式；一条记录尽量整体移至下一页，而非在页尾截断。
6. 导出计划标题、完成状态、分类、优先级、提醒时间、有效参考网站及备注；不存在的可选字段不输出空字段。
7. 长备注保留换行，长 URL 与长单词允许换行；中文使用系统字体回退，避免字符被裁切或与其他字段重叠。
8. PDF 显示当前周期、导出时间、计划数量、当前分类、排序和存在时的搜索关键词。
9. 导出过程不修改计划、不改变筛选条件、不改变本地数据和 Supabase 数据。
10. 更新 README、CHANGELOG、验收文档、技术手册、功能说明、部署排障、AI 协作指南及 Service Worker 缓存名。

## 分页限制
采用 `break-inside: avoid` 与 `page-break-inside: avoid` 避免正常长度记录拆分。若单条记录自身高度超过一整页可打印区域，浏览器打印引擎仍可能强制分页；应使用紧凑字号、间距与自动换行降低风险，并在界面/文档中明确此限制，不虚假承诺极端长内容绝不拆页。

## 数据库影响
不改变数据结构，不需要 Supabase SQL 迁移。暂不追加数据自动备份与恢复功能。


---

## 原文件：`docs/requirements_V10.5_five_star_priority.md`

# V10.5 需求文档：五级优先级

## 目标
将计划优先级由 1–3 星扩展为 1–5 星，提供更细致的优先级区分，同时保持旧数据兼容。

## 规则
- 1 星：最低优先级。
- 2 星：较低优先级。
- 3 星：普通优先级。
- 4 星：较高优先级。
- 5 星：最高优先级。

## 功能范围
1. 新建计划与编辑计划均可选择 1–5 星。
2. 计划列表显示与数值相同数量的星形图标。
3. “高优先级”排序按数值降序，5 星在前；同星级继续沿用原创建时间降序次序。
4. JSON 导出、导入、浏览器本地保存、Supabase 云端快照均保留 1–5 数值。
5. PDF 导出显示当前计划的优先级。
6. 手机屏幕上五个选项可自动换行，不应挤压或溢出。
7. 旧任务中的 1、2、3 星值保持不变；缺少优先级的旧数据仍默认为 1 星。
8. 非整数、0 或大于 5 的异常值仍回退为 1 星。

## 数据兼容与迁移
沿用计划对象现有 `priority` 数值字段，不改变 `schemaVersion: 1`，不修改 Supabase SQL/RPC。无需数据库迁移。

## 非目标
不改变分类、提醒、完成状态、周期、归档、回收站、撤销和同步操作规则。


---

## 原文件：`docs/requirements_V10.6_transactional_save.md`

# V10.6 需求规格：事务式保存

## 目标
避免浏览器存储写入失败时，页面仍显示操作成功，导致内存状态与持久化数据不一致。

## 规则
1. 所有业务变更先在候选状态副本上执行。
2. 候选状态成功写入 LocalStorage 后，才替换正式内存状态。
3. 写入失败时保留原状态，不执行成功刷新、不显示成功消息、不创建新的撤销快照。
4. 失败时保留表单输入；完成状态控件恢复原值。
5. 撤销本身也必须先持久化成功，再更新界面。
6. JSON 导入、云端下载和自动清理使用相同提交规则。
7. 数据结构 `schemaVersion: 1` 保持不变。

## 范围
新建、编辑、完成状态、删除、批量删除、归档、取消归档、恢复、永久删除、批量恢复、清空回收站、撤销、导入、云端下载、随机计划清理、过期回收站清理及提醒记录。

## 非目标
不调整业务规则、页面布局、Supabase 表结构或现有 JSON 格式。


---

## 原文件：`docs/requirements_V10.7_quick_add.md`

# V10.7 快速添加计划需求说明

## 1. 目标

在现有计划列表中提供低操作成本的快速录入入口，减少打开完整新增表单的步骤。

## 2. 功能范围

- 在计划卡片的完成进度条下方显示常驻快速添加栏。
- 用户输入计划名称后，可按 Enter 或点击“＋ 添加”提交。
- 默认创建到“每日”周期，即今天的计划列表。
- 默认状态为未完成；分类为“未分类”；优先级为 1 星。
- 不设置提醒、备注或参考网站。
- 保存成功后切换到每日视图，清除搜索词与分类筛选，刷新列表，清空输入框并保持焦点。
- 输入为空或仅包含空格时不创建计划。
- 保存失败时保留输入内容，不显示成功提示。
- 原有完整新增／编辑表单保持不变。

## 3. 非功能要求

- 必须复用 V10.6 的 `commitState()` 事务保存机制。
- 不增加或修改计划数据字段，不改变 `schemaVersion: 1`。
- 不增加 Supabase SQL、外部依赖或构建步骤。
- 桌面与手机布局均可使用，输入框具备可访问标签和错误提示。

## 4. 验收标准

详见 `docs/acceptance_V10.7_quick_add.md`。


---

## 原文件：`docs/requirements_V10.8_release_history.md`

# V10.8 版本记录与部署状态需求

## 目标
让用户从首页直接查看当前运行版本、完整更新履历，并确认 GitHub Pages 对 main 最新提交的构建部署状态。

## 功能
- 首页顶部增加「版本与更新记录」入口。
- 弹窗显示 APP_VERSION 的版本号。
- 从 GitHub main 的 CHANGELOG.md 加载 V0 至最新版本履历。
- 加载失败时提供 CHANGELOG GitHub 页面链接。
- 查询 main 最新 commit SHA 与 GitHub Actions workflow runs。
- 只匹配 Pages build and deployment 工作流，并要求 run.head_sha 与 main 当前 SHA 一致。
- 显示部署成功、正在部署、失败、等待记录或检查失败。
- 显示短 SHA、更新时间及 Actions 运行链接；支持手动刷新。

## 限制
- 使用公开 GitHub API，不在前端存放 token；匿名 API 额度或网络策略可能导致检查失败。
- 工作流成功不代表每个浏览器或 PWA 缓存均已更新。
- 不修改计划数据结构、保存机制或 Supabase 数据库。


---

## 原文件：`docs/requirements_V10.9_priority_sorting.md`

# V10.9 任务优先级默认排序需求

## 目标
默认先显示重要且尚未完成的任务，同时保留其他排序方式。

## 适用范围
每日、每周、每月、每年，以及每日随机、每周随机、每月随机临时计划。

## 默认排序
1. 未完成任务在前，已完成任务在后。
2. 各完成状态分组内部按有效优先级 5、4、3、2、1 星降序排列。
3. 同星级任务保持当前筛选结果中的原始相对顺序。
4. 缺失或异常优先级按现有 validPriority() 规则视为 1 星。

## 可选排序
优先级（未完成优先，默认）、原始顺序、名称 A–Z、最近添加、最早添加。不新增截止日期排序：当前 dueAt 是提醒日期时间字段，不应误作截止日期字段。

## 筛选与偏好
先按周期及归档状态取得任务，再应用搜索、分类筛选，最后排序。排序模式使用独立 LocalStorage 键 personal-planner:sort-mode:v1；首次访问、缺少或无效配置时默认 priority-desc。用户切换后保存并在刷新后恢复。不纳入任务业务状态、JSON 备份或 Supabase 云端快照。

## 数据与兼容
排序仅影响显示，不修改计划顺序、星级、创建时间、完成状态或所属周期；不调用 commitState()，不触发业务保存成功提示。保持 schemaVersion: 1，无 SQL 迁移。

## 验收
- 未完成五星至一星依序排列；已完成任务整体置底且内部五星至一星。
- 同星级保持原相对顺序。
- 七个计划视图均应用规则。
- 搜索和分类筛选结果正确排序。
- 切换其他排序模式有效，刷新后恢复上次选择。
- 星级修改、完成／取消完成、新建、恢复、导入后列表顺序正确。
- 排序不改变业务数据；V10.6 commitState() 事务机制不受影响。


---

## 原文件：`docs/requirements_V10_trash_undo_archive.md`

# 慢慢计划 V10 需求文档：回收站、归档与操作撤销

## 1. 目标
降低误删和误操作风险，并清晰区分归档、软删除和永久删除。

## 2. 功能需求

### 2.1 回收站
- 单条删除、清空当前周期、清理当前周期已完成计划均改为软删除，移入回收站。
- 回收站记录保存完整计划内容、删除时间以及该计划对应的完成记录。
- 支持单条恢复、勾选多条后批量恢复。
- 支持单条永久删除、批量永久删除和清空回收站；这些操作必须二次确认，且不提供撤销。
- 删除满 30 天的回收站项目自动永久清理。应用启动时清理一次，运行期间定期检查。
- 回收站显示删除时间和剩余保留时间。

### 2.2 归档
- 普通计划可归档；归档计划不显示在常规周期列表，不参与常规列表完成率统计。
- 归档不删除计划和完成记录。
- 提供归档列表和取消归档功能；取消归档后计划重新出现在对应周期。
- 归档计划仍可被移入回收站。

### 2.3 操作撤销
- 编辑计划、切换完成状态、归档/取消归档、移入回收站和恢复操作提供短时撤销入口。
- 撤销以本次页面会话内最近一次可撤销操作为准，提示有效期约 5 秒。
- 永久删除、清空回收站、导入 JSON 和云端下载替换数据不提供操作撤销；这些高影响操作必须使用确认提示或原有替换确认。

### 2.4 数据兼容与备份
- 旧版数据缺少 `trash`、`archivedAt` 字段时，按空回收站、未归档兼容读取。
- JSON 导出/导入须包含回收站、删除时间、归档状态和相关完成记录。
- Supabase 仍将完整状态保存在 `planner_cloud_data.data` JSONB 中；新增字段不改变数据库表结构，旧数据可继续读取。
- 手动云端上传/下载仍为整份快照，不属于自动同步。

## 3. 数据结构
- `state.plans[]`：活动计划，计划对象增加可选 `archivedAt` 时间戳；空字符串表示未归档。
- `state.trash[]`：对象 `{ plan, deletedAt, completions }`，分别保存计划快照、删除时间和该计划相关完成记录。
- 保持 `schemaVersion: 1`，以兼容 V9 的现有 JSON 与云端快照。

## 4. 非功能要求
- 不将回收站内容展示到正常计划列表。
- 恢复时检查 ID 冲突，避免重复计划。
- 永久删除确认清晰，不能与软删除混淆。
- 更新 Service Worker 缓存名，确保部署后加载新代码。


## V10.1 补充要求：首页入口
- 首页顶部必须显示“回收站”按钮及当前回收站数量。
- 首页顶部必须显示“已归档”入口。
- 两个入口均须在通过登录门禁进入主页面后可见并可操作。


---

## 原文件：`docs/initial_requirements_and_design.md`

# 每日／每周／每月／每年计划网页设计文档

**版本：** 1.0  
**产品定位：** 个人使用、无需注册、数据保存在当前浏览器的轻量计划工具  
**目标工期：** 1–3 天（基础版）

## 1. 产品概述

用户可以按每日、每周、每月、每年四种周期管理计划，快速新增、编辑、完成或删除计划。页面优先呈现当前周期的计划，并显示完成进度。基础版不需要账号、服务器或联网，数据保存在浏览器本地。

## 2. 目标与范围

### 目标

- 添加、编辑、完成和删除计划。
- 在每日、每周、每月、每年视图间切换。
- 重新打开网页后仍能看到已保存的数据。
- 在桌面和手机浏览器中均可使用。

### 本期不包含

- 登录、云端同步、多人共享。
- 推送通知或邮件提醒。
- 子任务、复杂标签、附件和协作评论。
- 自动生成计划或智能建议。

## 3. 用户与主要场景

主要用户是希望用一个简单网页安排个人事务的人。典型场景：早上查看今日计划并添加事项；完成后勾选；周末查看本周进度；月初或年初记录较长期目标。

## 4. 信息架构与页面布局

单页应用，无需多级导航。

```text
┌──────────────────────────────────────────────┐
│ 计划                         [+ 新建计划]     │
│ 今天，2026年10月28日                           │
├──────────────────────────────────────────────┤
│ [每日] [每周] [每月] [每年]                    │
│                                              │
│ 今日进度  2 / 5                               │
│ ━━━━━━━━━░░░░░░  40%                         │
│                                              │
│ □ 读书 20 分钟                  [编辑] [删除]  │
│ ☑ 完成项目草稿                  [编辑] [删除]  │
│ □ 散步                         [编辑] [删除]  │
│                                              │
│                         [+ 添加计划]           │
└──────────────────────────────────────────────┘
```

- **顶部栏：** 产品名、当前日期、新建按钮。
- **周期切换：** 每日／每周／每月／每年四个标签。
- **进度区：** 当前视图的完成数量、总数和进度条；无计划时显示 0/0。
- **计划列表：** 完成勾选框、计划标题、编辑和删除入口。
- **新增入口：** 页面顶部和列表底部均可新增，方便操作。
- **空状态：** 显示“这个周期还没有计划”及“添加计划”按钮。

## 5. 核心功能与交互

### 5.1 切换计划周期

点击“每日、每周、每月、每年”标签后，显示对应周期的计划。默认打开“每日”。当前选中项有明显高亮。

### 5.2 新增计划

点击“新建计划”或“添加计划”打开表单。表单字段：

| 字段 | 必填 | 说明 |
|---|---:|---|
| 计划名称 | 是 | 最多 100 个字符，去掉首尾空格 |
| 周期 | 是 | 每日、每周、每月、每年；从当前标签预选 |
| 备注 | 否 | 最多 500 个字符 |

点击“保存”后加入列表并立即持久化；点击“取消”关闭表单，不保存。标题为空时显示就地提示，不提交。

### 5.3 编辑计划

点击计划行的“编辑”打开同一表单，预填现有信息。保存后更新计划；取消则保留原值。

### 5.4 完成／取消完成

点击勾选框切换完成状态。完成计划显示勾选样式，标题可使用删除线或较浅颜色，但仍可编辑或取消完成。完成状态按周期单独记录：每日计划在不同日期有不同的完成状态；每周、每月、每年计划分别按对应周期区间记录。

### 5.5 删除计划

点击“删除”后弹出确认提示，说明删除后无法恢复。确认即删除，取消则保留。删除计划同时删除其完成记录。

### 5.6 周期日期规则

- 每日：以用户设备本地日期为周期标识。
- 每周：周一至周日为一周，周期标识采用该周周一日期。
- 每月：按自然月，周期标识为年份和月份。
- 每年：按自然年，周期标识为年份。

基础版只展示当前周期，不提供历史周期浏览。跨入新周期时，计划定义仍保留；完成状态依据新周期标识重新计算，因此不会自动继承上个周期的完成状态。

## 6. 数据设计

使用浏览器 `localStorage` 保存一个版本化 JSON 文档。建议键名：`personal-planner:v1`。

```json
{
  "schemaVersion": 1,
  "plans": [
    {
      "id": "uuid",
      "title": "读书 20 分钟",
      "note": "睡前阅读",
      "period": "daily",
      "createdAt": "2026-10-28T01:00:00.000Z",
      "updatedAt": "2026-10-28T01:00:00.000Z"
    }
  ],
  "completions": {
    "plan-id|daily|2026-10-28": true
  }
}
```

周期枚举：`daily`、`weekly`、`monthly`、`yearly`。完成记录键由计划 ID、周期类型和当前周期标识组成。每次新增、编辑、删除或勾选后立即写入本地存储。

**本地存储限制：** 数据只存在于当前浏览器和设备；清理浏览器数据或更换设备可能导致数据丢失。本期不做云同步或自动备份。

## 7. 视觉与可用性要求

- 简洁、轻量，优先保证计划列表易读。
- 内容区域在宽屏下居中，建议最大宽度约 800px。
- 手机窄屏下周期标签可横向排列，操作按钮保持易点击。
- 完成状态不能只靠颜色表达，需同时显示勾选图标或文字状态。
- 表单支持键盘操作，焦点顺序清楚，按钮有可见焦点样式。
- 删除操作需确认；保存和错误状态需有清楚反馈。
- 日期使用设备本地时区显示。

## 8. 技术建议

- **前端：** React + TypeScript，或使用项目已有框架。
- **样式：** 普通 CSS 或项目已有组件库；基础版不要求引入大型 UI 框架。
- **存储：** `localStorage`，封装读取、写入和数据校验函数。
- **部署：** 静态网页托管即可，不需要后端服务。
- **错误处理：** 对解析失败或存储不可用提供友好提示；不应因数据读取异常导致白屏。

## 9. 验收标准

1. 首次打开默认进入每日视图，页面清楚显示当前日期。
2. 可以在四种周期中切换，且列表内容与周期一致。
3. 可以新增、编辑和删除计划；必填校验有效。
4. 勾选完成后，列表状态和进度统计立即更新。
5. 刷新或关闭后重开页面，计划与当前周期完成状态仍保留。
6. 新周期开始后，计划继续显示，完成状态按新周期重新统计。
7. 删除计划前会确认，取消确认不会删除。
8. 空列表、无效本地数据和存储不可用时页面仍有明确反馈。
9. 桌面与手机宽度下，核心操作都可见且可操作。

## 10. 1–3 天开发拆分

| 阶段 | 工作内容 | 参考耗时 |
|---|---|---:|
| 第 1 阶段 | 页面骨架、周期切换、计划列表和空状态 | 0.5 天 |
| 第 2 阶段 | 新增／编辑表单、删除确认、完成交互 | 0.5–1 天 |
| 第 3 阶段 | 本地存储、周期标识和进度统计 | 0.5 天 |
| 第 4 阶段 | 手机适配、异常反馈、手动验收与修整 | 0.5–1 天 |

该周期假设由熟悉前端开发的人完成，且不包含账号、云同步、提醒及定制插画等需求。新手边学边做，实际时间可能增加数倍。

## 11. 后续可扩展方向

- 历史周期查看与完成趋势。
- JSON 导入／导出备份。
- 计划排序、分类和搜索。
- 提醒与日历集成。
- 账号登录及跨设备云同步。


---

## 历史快照：`README.md`（整合前）

# 慢慢计划 V10.42 · 个人公司网站项目管理与业务跟进

V10.42 在客户管理基础上增加项目管理和业务跟进。项目可关联客户；跟进记录可关联客户及项目，并记录方式、结果和下次跟进日期。三类业务数据均通过 `company-api` 保存到 `company_records`，与计划模块数据和云端快照隔离。复用慢慢计划现有账号会话。

详细设计与阶段记录：`docs/company-website/`。

## 开发协作规范

Git 分支命名、PR 合并及临时分支清理统一遵循 [`docs/git-branching-workflow.md`](docs/git-branching-workflow.md)：`main` 为唯一永久稳定分支；每项新功能使用独立的 `feat/<功能名称>` 分支；PR 合并到 `main` 后删除对应远程临时分支。

## V10.40 · 首页天气看板

首页固定显示东京与横滨天气，使用 Open-Meteo，无需 API Key。采用 Asia/Tokyo、两天逐小时预报、未来 12 小时降雨/大风提醒；本地缓存 10 分钟，支持立即刷新和离线缓存降级。天气数据独立保存，不进入 Supabase 同步。详见 `docs/home-weather-dashboard.md`。

## V10.34 · 外语学习工作区

V10.34 将现有「外语学习」入口升级为独立学习工作区，包含学习首页、学习内容、练习中心、错题管理、学习记录和数据管理。支持英语、日语、德语、俄语及其他语言，内容类型包括词汇、语法、阅读、听力和练习题。学习内容独立保存在当前浏览器，可通过 JSON 导入/导出备份；不复用 TOEIC Study System 代码，不访问 Supabase，也不修改旧外语模块数据。

详细说明：`docs/language-learning-workspace.md`（另有英文和日文版本）。

# 慢慢计划 V10.28

V10.28 为六大模块增加统一分页，每页显示 10 条；计划七种周期及其他模块的分类分别保持独立分页位置。搜索、筛选和排序后回到第一页，不改变业务数据结构。

# 慢慢计划 V10.20

V10.20 新增四模块整体 JSON 备份，一次导出计划、工作、外语学习和整理四个模块的完整业务数据；保留原有单模块导出/导入。首页四个模块入口分别使用蓝、绿、紫、橙色系背景，提升辨识度。本版本不包含整体导入、运行日志或系统设置备份。

# 慢慢计划 V10.19

V10.19 完成运行日志 Phase 4：为 Supabase RPC、四模块整体快照读取、云端数据校验、本地覆盖和失败回滚增加专项追踪。新增系统健康检查，覆盖四模块本地数据、日志 IndexedDB、关键初始化、Service Worker、Supabase 只读连接及 GitHub Pages 部署记录。健康检查不修改业务数据；日志仍仅保存在当前设备。

V10.17 新增应用内运行日志查看页面（Phase 2）。用户可以直接查看当前设备保存的日志、筛选等级和模块、按日期范围过滤、搜索功能/函数/错误、查看单条详情及完整执行链路，并导出 JSON/CSV。V10.16 提供 IndexedDB 日志基础设施。

# 慢慢计划 V10.16

V10.16 新增本地运行日志基础设施（Phase 1）；V10.14 新增「工作」和「外语学习」模块，形成「计划 → 工作 → 外语学习 → 整理」四模块结构。四个模块共用现有页面和操作引擎，但本地数据、分类、归档、回收站、JSON 备份及 Supabase 云端分区相互独立。计划模块移除「工作」分类，旧计划、归档和回收站中原属「工作」的记录自动转入系统固定分类「未分类」。支持中英日界面，不新增 SQL 迁移。

## V10.14 模块使用说明

- **计划**：原有分类保留原顺序，移除「工作」后为学习、生活、健康、财务、兴趣、未分类。原「工作」分类的记录在首次加载新版时自动转入「未分类」。迁移覆盖普通记录、归档记录和回收站记录；迁移仅修改分类字段，且可安全重复执行。
- **工作**：初始分类为待处理、进行中、已完成、工作记录、会议、其他；另有独立任务状态（待处理、进行中、已完成），状态与完成勾选同步。
- **外语学习**：初始分类为英语、德语、俄语、日语、其他，不包含挪威语。第一阶段使用通用记录功能。
- **整理**：沿用 V10.13 的书籍、电子产品、软件/APP、网站、其他分类。
- 四个模块各自搜索、归档、回收站、JSON 备份与云端同步；请在当前模块分别导出和恢复备份。不要清除浏览器站点数据来处理版本更新。

## V10.13 · 整理模块

V10.13 新增「整理」独立模块，与计划共用页面和操作引擎。整理默认分类为书籍、电子产品、软件/APP、网站、其他；本地数据使用独立存储键，JSON 备份和 Supabase 云端同步均按模块隔离。

## V10.12 · 分类管理

新增分类管理，可添加、编辑和删除分类。保留原有分类和顺序；新建及快速添加默认使用第一项。改名同步普通、归档和回收站计划。删除使用中分类时先选择目标分类并转移关联计划，再删除；取消或保存失败不会改变原数据，删除支持撤销。分类随 JSON 和 Supabase 快照同步，旧数据自动兼容，无需数据库迁移。

## V10.11 · 中英日多语言界面（2026-11-03）

新增独立多语言模块，支持简体中文、English、日本語。默认中文；用户切换后立即生效，并保存在当前浏览器，刷新或重新打开 PWA 后继续使用上次语言。登录页面和主界面均提供语言切换入口，覆盖系统菜单、表单、计划周期、分类显示、弹窗、确认提示、操作反馈、回收站、归档、同步、日期时间及 PDF 导出。用户输入的计划名称、备注、参考 URL 和用户名保持原样，不会被翻译。语言设置使用独立 LocalStorage 键，不改变计划数据、JSON 备份、schemaVersion 或 Supabase 结构，无需数据库迁移。

## V10.10 · 首页星级统计与任务快速定位（2026-11-03）

首页显示 1–5 星未完成任务数量。点击某个非零星级，会优先进入该星级未完成任务数量最多的每日、每周、每月或每年页面；数量相同时按每日→每周→每月→每年选择。系统清除搜索和分类筛选，保留当前排序模式，滚动至第一条匹配任务并短暂高亮。统计排除已完成、已归档和随机临时计划；不修改业务数据，无需数据库迁移。

## V10.9 · 任务优先级默认排序（2026-11-03）

任务列表默认按优先级排序：未完成任务排在已完成任务之前，各组内部按 5 星至 1 星排列；同星级保持原列表顺序。适用于每日、每周、每月、每年及随机临时计划视图。可切换原始顺序、名称 A–Z、最近添加或最早添加；选择会保存在当前浏览器并在刷新后恢复。排序只改变显示，不修改任务数据或云端快照。

## V10.8 · 版本与更新记录（2026-11-03）

首页新增「版本与更新记录」按钮，可查看 V0 至当前版本的完整更新履历，并刷新 GitHub Pages 部署状态。部署状态通过 GitHub API 对照 main 最新提交与对应 Pages build/deployment workflow，显示部署成功、正在部署、失败或等待记录，并提供 Actions 运行链接。此状态表示 GitHub Pages 工作流结果，不保证所有用户设备上的 PWA 缓存已同步更新。

## V10.7 · 快速添加计划（2026-11-02）

在计划列表中新增快速添加栏。输入计划名称后按 Enter 或点击“＋ 添加”即可创建今日计划；默认未完成、未分类、1 星且不设置提醒。保存成功后清空输入框，支持连续录入。保存失败会保留输入内容，不显示成功提示。复用 V10.6 事务保存机制，不改变数据结构，无需数据库迁移。

## V10.6 · 保存操作一致性修复（2026-11-02）

统一使用事务式状态提交：先生成候选数据并写入 LocalStorage，成功后才更新内存状态和界面。保存失败时保留原状态，不显示成功提示；覆盖完成状态、删除／批量删除、归档／取消归档、恢复／永久删除、编辑／新建、JSON 导入、云端下载、撤销及自动清理。数据结构和 `schemaVersion: 1` 不变。

## V10.5 · 五级优先级（2026-11-02）

优先级由 1–3 星扩展为 1–5 星。1 星最低、5 星最高；旧任务的 1/2/3 星数值保持不变，新增 4/5 星。新建、编辑、列表、优先级排序、JSON 备份恢复、云端快照和 PDF 导出均支持五级。数据结构仍为 schemaVersion 1，无需 SQL 迁移。

## V10.11 · multilingual_ui

每日、每周、每月、每年的轻量计划网页。无需构建步骤或后端，可直接发布到 GitHub Pages。

## 在线预览

直接打开 `index.html` 可预览主要功能。完整的离线缓存和 PWA 安装功能需要通过 HTTPS 或 localhost 访问。

## 发布到 GitHub Pages

1. 在 GitHub 创建一个空仓库。
2. 上传并提交本文件夹中的全部文件，保持 `index.html`、`manifest.webmanifest`、`sw.js` 和 `icon.svg` 位于仓库根目录。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**，分支选 `main`，目录选 `/(root)`，然后保存。
5. 等待 Pages 发布完成后，使用设置页面提供的 HTTPS 地址打开网页。

如果把文件放在仓库子目录中，而不是仓库根目录，请在 Pages 中选择该目录，或将项目发布到独立仓库；项目内资源路径均使用相对路径。

## 功能

- 四种计划周期：每日、每周、每月、每年。
- 新建、编辑、完成／取消完成、删除计划。
- 显示当前周期的完成数量和进度。
- 使用浏览器 `localStorage` 保存数据；每种周期的完成状态独立记录。
- 一键导出 JSON 备份；选择备份 JSON 并确认后可恢复，导入前会校验结构。
- “导出 PDF”仅导出当前可见计划，遵循当前周期、搜索、分类筛选和排序；生成打印排版页，在浏览器打印窗口选择“另存为 PDF”。每条计划尽量保持在同一页，长备注和 URL 自动换行。
- 计划模块支持学习、生活、健康、财务、兴趣和未分类；工作事项由独立工作模块管理。
- 可搜索计划名称、备注或参考网站，并按默认顺序、名称或添加时间排序。
- 每项计划可设置 1–5 星优先级，列表以矢量星形图标显示，也可按优先级排序。
- 可为计划设置日期与提醒时间；到时通过浏览器通知提醒未完成计划。
- 可在日期与提醒时间和备注之间填写参考网站；列表在备注上方显示有效的 HTTP/HTTPS 链接，并在新标签页打开。无效格式不显示可点击链接，不弹出错误提示。
- 支持 Supabase 数据库用户名/密码认证，并手动上传本机数据或下载云端数据，在多设备间迁移计划。
- 通过 Supabase 数据库中的用户名和密码认证后进入计划系统。
- 增加每日随机、每周随机、每月随机临时计划视图；临时计划只保留到本周期结束。
- 七个计划视图均提供清空当前标签全部计划、清空当前标签已完成计划的操作；执行前会确认。
- 首页提供「计划／工作／外语学习／整理」等七个独立计划模块，并增加独立的「个人公司网站」工作区；公司业务资料通过 company-api 保存到 company_records，不进入计划模块的本地数据或云端快照。
- 支持简体中文、English、日本語三种界面语言；首次默认中文，切换后记住上次选择。登录页和主界面均可切换；只翻译系统界面，不修改用户输入的计划名称、备注或 URL。
- 自适应手机和桌面布局；提供可选的 PWA 离线缓存。

## 数据说明

计划、工作、外语学习、整理分别保存在 `personal-planner:v1`、`personal-work:v1`、`personal-language:v1`、`personal-organizer:v1`；登录并手动上传后，数据会保存到你自己的 Supabase 项目。点击各模块的“导出 JSON”下载当前模块数据；新增“整体导出 JSON”可一次备份四模块的分类、记录、优先级、提醒、完成记录、归档及回收站等现有备份支持内容；“导入 JSON”会显示计划数量并要求确认，确认后替换当前浏览器数据。导入仅接受支持的 schema，文件不超过 2 MB。来自较旧版本的备份会将缺失分类设为“未分类”、缺失优先级设为 1 星。更换浏览器或设备、清理网站数据仍可能导致数据丢失。

临时计划只属于其创建时所在的自然日、自然周（周一开始）或自然月。周期结束后，网页下次打开时会清除过期临时计划；页面持续打开时最多一分钟内清除。普通每日、每周、每月计划仍按原规则保留。

每个计划标签下方均有批量清理按钮。确认后只删除当前标签里的计划及相关完成记录；批量清理会忽略当前搜索词和分类筛选，确保清理整个标签。清空已完成会删除当前标签中在本周期已勾选的计划；取消确认不会改变数据。空列表或没有已完成计划时，对应按钮不可用。

## 目录

```text
index.html
i18n.js
manifest.webmanifest
sw.js
icon.svg
README.md
CHANGELOG.md
CHANGELOG.en.md
CHANGELOG.ja.md
docs/
  部署与故障排查.md
  AI协作开发指南.md
  玩法与系统说明.md
  技术手册.md
  设计文档.md
  初始需求设计文档.md
```

## 提醒说明

提醒需要浏览器通知权限，且计划页面需保持打开；页面关闭时不会在后台定时触发。浏览器或操作系统可能暂停后台页面。提醒只发送一次，并且计划未完成时才发送。

## 数据库账号说明

登录由 Supabase SQL 函数校验，网页中不再包含固定密码。先执行 `docs/supabase-setup.sql`，再在 SQL Editor 单独创建初始账号。初始化命令不要提交到公开仓库；数据库保存 bcrypt 密码摘要。V10.2 起不再记录登录失败次数，也不再设置临时锁定。

## Supabase 账号认证配置

新建数据库先在 Supabase SQL Editor 执行 `docs/supabase-setup.sql`；已部署的数据库先执行 `docs/migration_V10.2_remove_login_lockout.sql`。再按脚本末尾注释单独创建或保留初始账号。不要将包含真实密码的 SQL 保存或提交到公开仓库。登录页填写项目 URL、publishable/anon key、用户名和密码。

## 云端同步配置

登录需要 HTTPS 页面（如 GitHub Pages）；直接双击 `index.html` 的 `file://` 地址可能被浏览器跨域策略阻止。

在 Supabase SQL Editor 执行 `docs/supabase-setup.sql` 并创建用户名 `oooo` 的初始账号。网页登录页填写项目 URL、公开 publishable/anon key、用户名和密码。每台设备登录后，通过“上传本机数据”或“下载云端数据”手动同步。两个操作传输完整数据；下载会替换此设备数据，上传会覆盖云端快照。建议先导出 JSON。

请只使用公开客户端 key，不要使用 `service_role` 密钥。用户名和密码只保存在当前页面会话内，并通过 RPC 提交；切换设备或刷新后需重新登录。当前版本不自动合并、不实时同步；完成勾选或修改后，需要手动上传，其他设备再下载。

## V10 回收站、归档与撤销

- 删除计划、清空当前周期或清理已完成计划会先移入回收站，默认保留 30 天。
- 回收站支持单条恢复、批量恢复、永久删除及清空；超过 30 天的项目会在启动时和运行期间自动清理。
- 归档用于暂时隐藏不再活跃的计划，不会删除计划；可在“归档”面板取消归档。
- 编辑计划、完成状态切换、归档/取消归档、删除和恢复等操作可在提示出现后的短时间内撤销。永久删除与清空回收站不提供撤销。
- 回收站及归档状态包含在 JSON 备份与 Supabase 云端数据快照中。云端仍需手动上传/下载才能跨设备同步。
- 回收站保留期限按删除时间计算；清理仅针对回收站，不会清理普通计划或归档计划。

详见 V10.4 PDF 导出需求与验收文档、V10 回收站文档，以及 `docs/requirements_V10.2_remove_login_lockout.md`、`docs/acceptance_V10.2_remove_login_lockout.md` 和 `docs/impact_analysis_V10.2_remove_login_lockout.md`。

## 个人公司网站

个人公司网站开发文档位于 `docs/company-website/`。当前已实现客户管理、项目管理和业务跟进；使用慢慢计划现有账号会话，客户、项目和跟进数据独立存储。详细设计、数据库、API 与阶段记录见该目录下的 Markdown 文档。

## 版本

V10.4 · pdf_export（2026-11-01）。新增按当前可见列表导出 PDF，使用防拆分分页样式。

V10.3 · reference_website（2026-11-01）。新增每条计划可选参考网站。

V10.2 · remove_login_lockout（2026-11-01）。移除连续登录失败 5 次后暂停 10 分钟的项目自定义锁定；提供现有数据库迁移 SQL。

V10 · trash_undo_archive（2026-11-01）。增加回收站、归档与短时操作撤销。

V9 · database_auth（2026-10-29）。在 V8 基础上将固定访问码改为 Supabase 数据库认证，并将同步操作改为受密码校验的 RPC。

V8 · access_gate（2026-10-29）。增加轻量访问验证入口。

V7 · cloud_sync（2026-10-29）。在 V6 基础上增加 Supabase 邮箱登录与手动云端快照同步。

项目表结构与 RLS 权限初始化脚本：`docs/supabase-setup.sql`。

V6 · reminders（2026-10-28）。在 V5 基础上增加计划日期、提醒时间和浏览器通知。

V5 · bulk_clear_controls（2026-10-28）。在 V4 基础上增加按当前标签清空全部计划或已完成计划的确认操作。


## V10.2 移除登录失败锁定
- 移除 Supabase `planner_check_password` 中的失败次数与 10 分钟锁定逻辑。
- 新建数据库脚本不再创建 `planner_login_attempts` 表；已有数据库需执行独立迁移脚本。
- 登录、云端上传和下载继续使用原有 RPC 与 bcrypt 密码摘要校验。
- 注意：移除锁定降低了对密码猜测的防护，请使用强密码并保护公开客户端配置及数据库权限。

## V10.1 首页入口修复
- 首页顶部“账号与同步”旁新增“回收站”和“已归档”按钮。
- 回收站按钮显示当前回收站项目数量；点击后可查看、恢复或永久删除项目。
- 已归档按钮打开归档管理窗口。
- 若浏览器仍显示旧版，请强制刷新页面；PWA 用户可关闭后重新打开应用。


---

## 历史快照：`docs/feature_and_system_guide.md`（整合前）

# V10.13 整理模块

首页新增「整理」入口，与计划模块并列。整理模块使用同一套列表和编辑交互，但数据完全独立。初始分类为书籍、电子产品、软件/APP、网站、其他；新建和快速添加默认选择书籍。支持新增、编辑、删除、搜索、筛选、排序、分类管理、归档、回收站、撤销、独立 JSON 备份／恢复和 Supabase 云端保存。整理内容不使用计划周期，作为单一列表管理。计划与整理分别保存在不同的本地存储键，云端快照也使用独立 organizer 分区；任何模块的备份、恢复和上传／下载均不覆盖另一模块。

# V10.12 分类管理

首页新增分类管理入口，支持添加、编辑和删除。原有「未分类、工作、学习、生活、健康、财务、兴趣」及顺序完整保留。新建计划和快速添加默认使用第一项。分类名非空、最多 30 字符、大小写不敏感去重，至少保留一项。改名同步普通、归档和回收站计划。删除被使用分类时必须选择目标分类，先迁移关联计划再删除；取消或保存失败不改变数据，删除支持撤销。分类随本地保存、JSON 备份／恢复和 Supabase 整份快照同步。旧数据自动补充原分类，schemaVersion: 1 不变，无 SQL 迁移。自定义分类名不自动翻译。

## V10.10 首页星级统计与任务快速定位

首页欢迎语下方显示 1–5 星未完成任务分布。统计范围仅包括每日、每周、每月、每年四种正式周期中的未归档任务；已完成任务与每日／每周／每月随机临时计划不计入。完成状态按当前周期的完成记录判断。

点击某个星级时，系统分别统计该星级在四个正式周期中的未完成数量，进入数量最多的周期；若数量相同，固定按每日、每周、每月、每年优先。进入目标周期前会清空搜索关键词与分类筛选，避免匹配任务被过滤隐藏；保留用户当前排序模式。列表渲染后，自动滚动到该星级第一条未完成任务并短暂高亮。统计为 0 的星级不可点击。

本功能只读取现有计划、优先级、归档状态和当前周期完成记录，不改变计划数据、完成状态、撤销历史、JSON 备份或云端快照。随机临时计划仍可正常使用，但不进入首页四周期统计。

## V10.9 任务优先级默认排序

所有计划列表默认使用「优先级（未完成优先）」排序，适用于每日、每周、每月、每年，以及每日／每周／每月随机临时视图。先将未完成任务排在已完成任务之前，再在各自分组内按 5 星至 1 星排序。同星级任务保持筛选后原列表中的相对顺序。

排序下拉框仍保留「原始顺序」「名称 A–Z」「最近添加」「最早添加」。切换后会记住当前浏览器中的选择，刷新页面后继续使用上次模式。优先级排序下，已完成任务始终位于未完成任务之后；切换到其他排序模式时，按所选模式排序。

搜索和分类筛选先执行，排序再作用于筛选结果。排序属于显示逻辑，不修改计划数据、创建时间、完成状态或 Supabase 快照，不触发任务保存事务。排序偏好单独保存在浏览器 LocalStorage，不进入 JSON 备份或云端数据。

## V10.8 版本与更新记录

首页顶部增加「版本与更新记录」按钮。点击后显示当前运行版本、从 V0 开始的完整更新履历和 GitHub Pages 部署状态。更新履历从 GitHub main 分支的 `CHANGELOG.md` 实时读取；网络不可用时可通过弹窗中的链接打开 GitHub 文档。部署状态通过 GitHub API 获取 main 最新提交 SHA 和 Actions workflow runs，筛选 `pages build and deployment` 工作流并匹配相同 SHA，区分部署成功、进行中、失败和等待记录；同时显示短 SHA、更新时间及运行记录链接。

部署状态表示 GitHub Pages 构建／部署工作流的结果，不保证用户浏览器或已安装 PWA 已立即更新。PWA 可能仍使用旧缓存，必要时需完全关闭后重新打开。

## V10.7 快速添加计划

计划列表进度条下方新增常驻快速添加栏。输入计划名称后按 Enter 或点击“＋ 添加”即可创建计划。快速添加固定创建到“每日”周期（即今天的计划列表），默认未完成、分类为“未分类”、优先级 1 星，不设置提醒时间。创建成功后自动切换到每日视图、清除搜索词与分类筛选、清空输入框并保持焦点，便于连续录入。名称为空时不保存并提示填写。

快速添加沿用 V10.6 `commitState()`：先持久化候选状态，只有写入成功才更新界面、清空输入框和显示成功消息；写入失败保留输入内容和原数据。原有“新建计划”完整表单仍保留，可继续设置周期、分类、优先级、备注、参考网站及提醒。

## V10.6 保存操作一致性

所有重要数据修改采用事务式提交：先在候选状态上执行修改并写入浏览器存储，只有写入成功才更新正式状态及界面。保存失败时保留原数据，不显示操作成功提示。适用操作包括新建／编辑、完成状态、删除／批量删除、归档／取消归档、回收站恢复／永久删除、导入、云端下载及撤销。

## V10.5 五级优先级

新增／编辑计划时可选 1–5 星。1 星为最低优先级，5 星为最高优先级；列表显示对应数量的星形图标，“高优先级”排序按 5 星至 1 星排序。旧任务的 1、2、3 星保持原值。JSON 备份、导入、云端快照与 PDF 导出自动沿用同一优先级值。

# 功能与系统说明

## 1. 使用目标

用一个简洁网页记录个人的日、周、月、年计划，并通过勾选跟踪当前周期进度。

## 2. 操作说明

| 操作 | 结果 |
|---|---|
| 点击每日／每周／每月／每年 | 切换至对应计划列表 |
| 点击新建计划／添加计划 | 打开计划表单 |
| 填写名称、选择周期并保存 | 新增计划并进入对应周期视图 |
| 点击编辑 | 修改名称、备注或周期 |
| 勾选完成框 | 标记当前周期完成，再次点击可取消 |
| 点击删除并确认 | 删除计划及该计划的完成记录 |
| 点击导出 JSON | 下载包含计划与完成记录的备份文件 |
| 点击导入 JSON 并选择文件 | 查看导入数量，确认后用备份内容替换当前数据 |
| 新建／编辑时选择 1 至 5 星 | 设置计划优先级；列表显示对应星形图标 |
| 新建／编辑时填写日期和时间 | 设置提醒；授权浏览器通知后，到时提醒未完成的计划 |

## 3. 完成进度

进度只统计当前周期、当前视图中的计划。无计划时显示 `0 / 0`，进度条为 0%。完成记录按周期标识保存；新的一天／周／月／年不会继承上个周期的完成状态。

## 4. 周期规则

- 每日使用设备本地日期。
- 每周以周一为第一天。
- 每月使用自然月。
- 每年使用自然年。

当前版本只展示现在所在的周期，不提供查看历史日期的控件。

## 5. 数据保留

计划默认写入浏览器 `localStorage`，离线时仍可使用。登录 Supabase 后可以手动上传或下载完整数据；跨设备使用需在每台设备登录同一账号。下载会替换本机数据，清除网站数据前仍建议保留 JSON 备份。

## 6. JSON 备份

导出文件是 UTF-8 JSON，包含 schema 版本、计划、完成记录、导出时间和应用版本。导入仅接受 schemaVersion 为 1 的文件，单文件上限 2 MB、最多 5000 个计划；导入会先显示各周期计划数量，确认后整体替换当前数据。取消确认不会更改数据。建议恢复前先导出当前数据。导入数据只在本地处理，不会上传。

## 7. 分类、搜索与排序

计划分类包括未分类、工作、学习、生活、健康、财务和兴趣；可在新增或编辑计划时选择。优先级可设为 1–5 星，列表用矢量星形标识。分类筛选、搜索关键词和排序方式作用于当前周期。搜索会匹配计划名称和备注；排序可选默认顺序（添加顺序）、高优先级、名称 A–Z、最近添加或最早添加。进度数字根据当前筛选结果计算。旧版备份缺少分类字段时自动归为“未分类”，缺少优先级时默认 1 星。

## 8. 随机临时计划

每日随机、每周随机、每月随机是与普通计划分开的临时列表，但支持相同的名称、备注、分类、星级优先级、搜索、排序和完成操作。每日随机计划有效至当天结束；每周随机计划有效至周日结束（周一开启新周期）；每月随机计划有效至当月结束。周期结束后，过期条目及其完成记录会自动清理；页面保持打开时每分钟检查一次，重新打开时也会清理。它们不会自动重复到下一个周期。JSON 备份会保留其周期标识。

## 9. 数据库账号登录

登录页使用 Supabase 数据库中的用户名和密码校验。当前单账号为 `oooo`，密码摘要存于凭据表；用户名/密码只在页面内存保留，刷新后需重新登录。V10.2 起不再因连续登录失败而暂时锁定。初始化与密码重置 SQL 见 `docs/supabase-setup.sql`。

## 10. 云端同步

在“账号与同步”中设置项目 URL 和公开 key 后，可注册或登录 Supabase 邮箱账号。每个账号对应独立云端快照；上传以本机完整数据覆盖云端，下载以云端完整数据覆盖本机。没有自动合并或实时同步，修改后需手动上传，再在其他设备下载。SQL 与初始化步骤见 `docs/supabase-setup.sql` 和部署说明。

## 11. 提醒与通知

计划可选填日期与时间。保存含提醒时间的计划时，浏览器会请求通知权限；允许后，网页在打开期间每 15 秒检查一次，到时为尚未完成的计划发送一次通知。完成的计划不会提醒；修改提醒时间后可再次提醒。

提醒由当前页面运行，不是系统级后台定时任务。页面关闭时不会触发；浏览器暂停后台页面、设备休眠或通知权限关闭时，提醒可能延迟或不显示。

## 12. 批量清理

每个标签下均有“清空当前标签计划”和“清空当前标签已完成”按钮。点击后先弹出确认框；确认才执行，取消不改变数据。前者删除当前标签所有计划，后者删除当前标签中本周期已完成的计划；两者均同时删除相关完成记录，不影响其他标签。批量操作作用于整个当前标签，不受搜索词或分类筛选影响。没有可删除条目时按钮禁用。
## 参考网站（V10.3）
编辑计划时可在日期与提醒时间与备注之间填写参考网址。保存后链接显示在备注上方，点击在新标签页打开；无效网址静默忽略。



## PDF 导出（V10.4）

点击页面顶部“导出 PDF”，导出当前可见的计划列表。当前周期、搜索、分类筛选和排序会原样应用；如需导出全部计划，请先清除搜索条件并将分类切换为“所有分类”，再逐个周期导出。系统会打开独立打印排版页，浏览器打印窗口中选择“另存为 PDF”。PDF 包含计划名称、完成状态、分类、优先级、提醒时间、参考网站与备注。每条记录设置避免分页拆分；单条内容超过整页高度时受浏览器打印引擎限制。


## V10.11 多语言界面

应用通过独立的 `i18n.js` 模块提供简体中文（zh）、英文（en）和日文（ja）界面。首次使用默认中文；语言偏好保存于 `personal-planner:language:v1`，与计划数据分开。登录页和主界面均可切换语言，切换立即生效。系统自身的菜单、按钮、表单、筛选排序、弹窗、确认提示、操作反馈、回收站、归档、云端同步、日期时间、通知和 PDF 导出使用当前语言。用户输入的计划标题、备注、参考 URL、用户名等内容不翻译。分类和周期的存储值保持中文原始枚举，不随显示语言改变；JSON 备份与 Supabase 快照格式不变。


---

## 历史快照：`docs/technical_manual.md`（整合前）

# V10.24 成绩与未来双模块技术实现

- 模块顺序：`plan`、`work`、`language`、`organize`、`results`、`future`；原四模块顺序不变。
- 独立 LocalStorage：`personal-results:v1`、`personal-future:v1`。模块状态仍为 `schemaVersion: 1`，结构复用 `categories`、`plans`、`completions`、`trash`。
- 成绩默认分类为考试成绩、资格证书、学习成果、其他；未来默认分类为短期目标、中期目标、长期目标、人生愿望。分类可通过既有分类管理界面维护。
- 两个模块均为无周期的单列表，沿用工作／外语学习／整理的 CRUD、快速添加、完成状态、优先级、搜索、分类、归档、回收站、撤销、PDF 和模块专属 JSON 备份。
- 单模块 Supabase 分区分别使用 `results`、`future`；上传保留其他所有分区，下载只恢复当前模块。整体同步按六个模块读写。旧云端快照缺少 `results` 或 `future` 时，整体下载将对应模块初始化为空状态；原四个分区仍要求存在且有效。
- 全局检索顺序为计划周期顺序，其后工作、外语学习、整理、成绩、未来。
- 不修改原四模块存储键、原数据、计划周期、`schemaVersion`、既有 JSON 单模块备份格式或 Supabase RPC。无需 SQL 迁移。
- 成绩模块配色为青绿色，未来模块配色为柔和玫瑰粉；均支持深色／浅色主题。中英日文案同步更新。
- Service Worker cache：`daily-weekly-planner-v10-24-results-future-modules`。

# V10.23 黑白主题与周期颜色

- 默认主题为深色，HTML 根节点使用 `data-theme="dark"`；启动时优先读取独立偏好键 `personal-planner:theme:v1`，仅接受 `dark` 或 `light`。
- 主题切换通过根节点主题属性和 CSS 变量实现。浅色主题沿用既有样式；深色主题覆盖页面、卡片、表单控件、对话框、模块导航及主要状态色。
- 主题偏好不写入四模块业务对象，不参与 JSON 备份或 Supabase 同步。
- 周期颜色仅根据既有 `data-period` 标识进行样式区分：普通周期蓝色，随机周期橙色；不修改 `PERIODS`、`RANDOM_BASE` 或周期处理逻辑。
- APP_VERSION：`V10.23_dark_theme_period_colors`；Service Worker cache：`daily-weekly-planner-v10-23-dark-theme-period-colors`。
- 验收清单见 `docs/acceptance_V10.23_dark_theme_period_colors.md`。

# V10.19 数据与云端专项追踪、系统健康检查（Phase 4）

- Supabase `supabaseRequest()` 记录 START / END SUCCESS / END FAILED；仅记录路径、HTTP 方法、HTTP 状态，不记录请求体、用户名、密码、apikey 或会话信息。
- 单模块及整体上传／下载的失败分支写入 Cloud ERROR；底层 RPC 请求保留独立 trace。
- `localModuleSnapshot()`、`validateWholeCloudSnapshot()`、`persistWholeLocalSnapshot()` 分别记录本地快照读取、云端整体分区校验、本地四模块覆盖及失败回滚执行结果。
- 首页「系统健康检查」由 `health-check.js` 提供。检查项：应用版本／入口、四个 LocalStorage 分区结构、运行日志 IndexedDB 诊断写入与查询、Service Worker 注册、Supabase `planner_get_data` 只读调用、当前 main 对应 GitHub Pages workflow。
- 健康检查仅读取业务数据；不会写入／修复／覆盖业务 LocalStorage。Supabase 只调用读取 RPC。IndexedDB 测试只产生一条普通运行日志诊断记录。
- 未登录时 Supabase 状态为 Not Checked；GitHub API 网络失败时部署状态为 Not Checked，不误报部署失败。
- 检查结果按 INFO/WARN/ERROR 写入本机日志并显示时间；支持中英日及响应式布局。
- 不改变四模块键、`schemaVersion: 1`、JSON 备份结构、Supabase RPC／DB schema 或登录流程。
- APP_VERSION：`V10.19_data_cloud_health_check`；Service Worker cache：`daily-weekly-planner-v10-19-data-cloud-health-check`。
- Phase 4 验收见 `docs/acceptance_V10.19_runtime_logging_phase4.md`。

# V10.16 运行日志基础设施（Phase 1）\n\n- 独立模块：`logger.js`，通过 `window.AppLogger` 暴露统一接口；在主应用脚本前加载。\n- 存储：IndexedDB 数据库 `manman-planner-runtime-logs`，对象仓库 `entries`；索引包括 createdAt、level、module、executionId。与四个业务模块的 LocalStorage 键隔离。\n- 等级：ERROR、WARN、INFO、DEBUG；DEBUG 默认关闭，设置键为 `personal-planner:runtime-log-settings:v1`。\n- 追踪：`start/end/fail/cancel`，记录 Execution ID、spanId、parentSpanId、耗时和版本。\n- 保留：30 天；容量目标 10,000 条，优先淘汰最旧 DEBUG/INFO；IndexedDB 不可用时使用最多 200 条内存降级队列。\n- 安全：敏感字段名、Bearer 凭据和带查询参数 URL 做基础脱敏；日志失败不得影响业务启动。\n- 全局监听：记录 window error 和 unhandledrejection。\n- 主应用版本：V10.16_runtime_logging_foundation；Service Worker cache：`daily-weekly-planner-v10-16-runtime-logging`。\n- Phase 1 不包含日志 UI、完整业务函数接入或健康检查；验收步骤见 `docs/acceptance_V10.16_runtime_logging_phase1.md`。\n\n# V10.15 四模块整体云端同步技术实现

- 新增首页整体同步区，入口按钮为 `sync-all-upload` 与 `sync-all-download`；当前模块独立按钮及原处理函数保持不变。
- 模块顺序：`plan`、`work`、`language`、`organize`；云端 JSONB 分区映射为根对象（计划）、`work`、`language`、`organizer`。
- 整体上传分别读取四个 LocalStorage 键，按模块默认分类执行 `safeState()` 校验，构建单个根 JSON 对象并调用一次 `planner_put_data` RPC。现有 SQL 函数对根计划结构校验后在单条 INSERT ... ON CONFLICT 中写入完整 JSONB 快照，PostgreSQL 事务保证云端整体替换。
- 整体下载调用一次 `planner_get_data`，要求根计划及 `work`、`language`、`organizer` 均存在且可通过对应模块数据校验；任何分区缺失或格式异常均在写入本地前终止。
- 用户确认覆盖后，先读取四个本地存储原值，再逐键写入；任一写入异常时尽力恢复四个原值。恢复成功后清空模块内存缓存，重新载入当前活动模块并刷新分类、列表、归档和回收站视图。整体覆盖不做智能合并。
- 整体下载清除当前撤销快照，避免撤销操作把旧状态重新写回。模块独立上传／下载逻辑不变。
- PWA cache：`daily-weekly-planner-v10-15-whole-cloud-sync`。不修改业务 schemaVersion（仍为 1），不需要 SQL 迁移。

# V10.14 四模块管理技术实现

- 模块标识：`activeModule` 取值 `plan`、`work`、`language`、`organize`；模块入口顺序固定。四个模块复用渲染、编辑、搜索、分类、归档、回收站、撤销和 PDF 引擎。
- 本地存储：`plan`=`personal-planner:v1`、`work`=`personal-work:v1`、`language`=`personal-language:v1`、`organize`=`personal-organizer:v1`。最后活动模块单独保存在 `personal-planner:active-module:v1`。
- 分类：计划默认分类按原有顺序移除「工作」，保留「学习、生活、健康、财务、兴趣、未分类」；工作默认分类为待处理、进行中、已完成、工作记录、会议、其他；外语学习默认分类为英语、德语、俄语、日语、其他；整理分类保持 V10.13。计划「未分类」为固定分类。
- 迁移：首次载入计划状态时，把分类数组、普通／归档计划和回收站计划中的「工作」映射到「未分类」，删除旧分类；事务保存成功后才替换内存状态。迁移不修改 ID、标题、备注、日期、完成记录、优先级、提醒或归档时间。
- 工作状态：计划对象增加可选 `status`（待处理／进行中／已完成）；仅工作模块显示状态选择器。工作状态与该模块稳定 completion key 同步；其他模块不受影响。
- JSON：所有导出均包含 `moduleType`（`plan`／`work`／`language`／`organize`）。非计划模块必须匹配当前模块类型；计划模块拒绝其他模块备份，但兼容历史无 `moduleType` 的计划备份。
- Supabase：沿用 `planner_get_data`／`planner_put_data` RPC。根对象保存原计划 schema；工作使用 `work`、外语学习使用 `language`、整理继续使用历史字段 `organizer`。上传前读取远端快照，只替换当前分区并保留其他分区；下载只恢复当前模块。无需 SQL 迁移。
- PWA：Service Worker cache 更新为 `daily-weekly-planner-v10-14-four-module-management`。

# V10.13 整理模块技术实现

- 模块标识：`activeModule`，取值 `plan` 或 `organize`；两个模块共用页面和渲染／编辑／分类／归档／回收站引擎。
- 本地存储：计划使用 `personal-planner:v1`，整理使用 `personal-organizer:v1`。切换模块时加载对应状态；`save()` 按当前模块写入独立键。整理默认分类为书籍、电子产品、软件/APP、网站、其他，项目周期固定为 `daily` 以复用既有状态校验，但 UI 隐藏周期选择并将列表作为整体显示。
- JSON：导出增加 `moduleType`（`plan`／`organize`）。整理导入要求 `moduleType: organize`；计划拒绝整理备份，旧版无 moduleType 的计划备份仍可导入。
- Supabase：沿用 `planner_get_data`／`planner_put_data` RPC。云端根对象继续保存原计划 schema（`schemaVersion`、`plans`、`categories`、`completions`、`trash`），另加 `organizer` 对象保存整理完整状态。上传前先读取远端快照，只替换当前模块并保留另一个分区；下载只解析当前模块。旧版无 `organizer` 字段时视为尚无整理云端备份。
- SQL `planner_put_data` 仅校验根对象的 schemaVersion、plans 和 completions，允许额外 JSON 字段，因此无需 SQL 迁移；计划 schemaVersion 保持 1。
- Service Worker cache 更新至 `daily-weekly-planner-v10-13-organize-module`。

# V10.12 分类管理实现

- 业务状态新增 categories 数组，默认保留原有七项；计划 category 字段不变，schemaVersion: 1 不变。
- normalizeCategories() 和 safeState() 兼容旧状态／旧备份缺少 categories 的情况，并兼顾回收站计划引用。
- 分类增删改通过 commitState() 事务保存。改名同步 plans 与 trash[].plan；删除使用中的分类时先迁移两处引用，再移除分类。撤销快照包含完整状态。
- renderCategoryOptions() 统一刷新新建／编辑下拉框和筛选器。新建及快速添加均使用 state.categories[0]。
- JSON 备份与 Supabase 整份快照均包含 categories；旧快照自动回退原有分类。无需 SQL 迁移。
- i18n 增加中英日静态文案，并跳过用户自定义分类名称。

## V10.10 首页星级统计与定位实现

- 版本标识：APP_VERSION 为 V10.10_star_dashboard_jump；Service Worker cache 为 daily-weekly-planner-v10-10-star-dashboard-jump。
- renderStarSummary() 遍历 state.plans，只纳入 daily、weekly、monthly、yearly，排除 archivedAt 非空及 state.completions[completionKey(plan)] === true 的计划；优先级经 validPriority() 归一为 1–5。
- 统计使用 completionKey(plan)，因此每日／每周／每月／每年的完成状态均按当前周期计算；随机周期不计入。
- 点击星级时按 daily → weekly → monthly → yearly 顺序查找最大计数；使用严格大于比较保留首次命中的周期作为并列规则。
- 跳转时清空搜索和分类筛选，更新周期标签并调用统一 render()；排序偏好不变。列表行写入 data-priority，再查找首个匹配的 .task，平滑滚动并添加短时高亮 class。
- 统计按钮由 DOM API 创建，标签使用 textContent；零计数按钮 disabled。功能不调用 commitState()，不修改 state、不新增存储键、不改变 schema 或 Supabase 接口。
- 首页摘要在 render() 中同步刷新，因此完成状态、计划新增／编辑／归档／恢复、导入及云端下载等现有重绘操作都会更新计数。

## V10.9 优先级默认排序实现

- 版本标识：APP_VERSION 为 V10.9_priority_sorting；Service Worker cache 为 daily-weekly-planner-v10-9-priority-sorting。
- 排序偏好使用独立键 personal-planner:sort-mode:v1 保存，不写入 personal-planner:v1 业务状态、JSON 备份或 Supabase 快照。
- loadSortMode() 只接受白名单模式；首次使用、存储缺失或读取失败时默认为 priority-desc。
- render() 先应用周期、归档、搜索与分类过滤，再排序。优先级模式使用完成状态（未完成 0、已完成 1）、有效星级降序、筛选后原始索引作为三级排序键。
- 同星级排序通过筛选结果的原始索引稳定打破平局；不依赖创建时间，不改变 state.plans 的原始顺序。
- 保留 default（原始顺序）、title、created-desc、created-asc 现有模式。排序模式切换只写独立偏好键并重绘，不调用 commitState()。
- 所有周期标签共用 render()，普通与随机临时视图均使用相同规则。完成状态、星级编辑、导入、恢复等现有操作重绘后自动重新排序。
- 不修改计划 schema、完成记录、撤销逻辑或云端同步接口；无 SQL 迁移。

## V10.8 版本履历与部署状态

- 入口：`#open-release`；弹窗：`#release-dialog`。
- 当前运行版本来自 `APP_VERSION`，只显示语义版本前缀（例如 V10.8）。
- 履历：`loadReleaseHistory()` 请求 `raw.githubusercontent.com/.../main/CHANGELOG.md`，`renderReleaseHistory()` 将 Markdown 标题和列表项通过 DOM `textContent` 构建，避免将远程内容作为 HTML 执行。
- 部署状态：`refreshReleaseStatus()` 并行请求 GitHub REST `commits/main` 与 `actions/runs?branch=main&per_page=20`，匹配 Pages build and deployment workflow 的 `head_sha` 与 main 当前 SHA。按 workflow 状态显示 success / in progress / failure / no matching run；GitHub API 网络或限流错误显示检查失败并可手动刷新。
- 不使用认证 token；依赖公开仓库 GitHub API 的匿名访问额度。更新履历读取失败时提供 CHANGELOG 页面链接。
- Service Worker 缓存名升级至 V10.8；业务数据 schema 与 `commitState()` 不变。

## V10.7 快速添加计划实现

- UI：`#quick-add-form`、`#quick-add-title` 与 `#quick-add-error` 位于当前计划卡片的进度条下方，桌面端横向排列，窄屏自动适配。
- 交互：表单 submit 同时支持 Enter 和按钮点击；输入仅做 trim，空字符串不提交。输入变更时清除错误状态。
- 数据：创建普通 `daily` 计划，字段沿用现有结构：`title`、空 `note`／`referenceUrl`／`dueAt`、`category: '未分类'`、`priority: 1`、空提醒标记及时间戳；不增加 schema 字段。
- 事务：`quickAddPlan()` 使用 `commitState()` 写入候选状态。只有成功后才切换每日标签、清理搜索／分类过滤、重绘、清空输入并提示成功；失败保留输入框内容。
- 快速添加不替代 `openDialog()` 完整表单。无 SQL 或数据迁移。

## V10.6 事务式保存机制

- `save(nextState = state)` 将指定候选状态序列化并写入浏览器存储，返回布尔结果；失败时不修改正式状态。
- `cloneState(source)` 生成独立状态副本；`commitState(mutator, options)` 在副本上执行修改，写入成功后才赋值 `state = next`。
- 只有持久化成功后才更新撤销快照、刷新界面、执行后续 UI 回调及显示成功消息。
- 失败路径不替换 `state`；表单不关闭，完成复选框恢复原值。
- 撤销先保存快照，再提交到内存；撤销保存失败时保留当前状态和撤销能力。
- JSON 导入、云端下载与自动清理同样使用候选状态；提醒标记先保存，再发送系统通知。
- 数据结构及 `schemaVersion: 1` 不变，不需要数据库迁移。

### 失败路径测试建议

通过浏览器开发者工具临时模拟存储写入异常，分别测试新建、编辑、完成切换、删除、归档、恢复、永久删除、导入和撤销；确认旧数据保持一致、无成功提示、表单仍可继续编辑。测试结束后恢复原生存储方法。

## V10.5 五级优先级实现

- `validPriority(value)` 接受 1–5 的整数；其他值（含缺失、非整数、0 或大于 5）回退为 1。
- 计划对象字段名仍为 `priority`，JSON 与 Supabase 快照结构不变；`schemaVersion` 继续为 1。
- UI 提供五个星级按钮；列表按 `validPriority(plan.priority)` 绘制相应数量的 SVG 星形。高优先级排序沿用数值降序。
- PDF 从 `.priority-display` 的无障碍标签读取优先级，因此输出 1–5 星。
- 旧数据中的 1/2/3 不变；旧备份缺少该字段仍按 1 星处理。无需 SQL 迁移。

# 技术手册

## V9 数据库认证接口

登录页调用 `planner_login` RPC；同步分别调用 `planner_put_data`、`planner_get_data`。数据库以 pgcrypto bcrypt 摘要验证密码，客户端不读取账号或密码摘要表。各 RPC 对账号密码重新验证。V10.2 起不再启用登录失败次数统计或临时锁定。`planner_credentials` 仅允许 `oooo` 一个用户名。初始账号由项目管理员通过 SQL Editor 单独插入；切勿将带有密码的初始化语句提交至公开仓库。


## 1. 技术构成

- `index.html`：页面、样式和交互逻辑，原生 HTML/CSS/JavaScript，无第三方依赖和构建步骤。
- `manifest.webmanifest`：PWA 名称、图标、启动路径和显示模式。
- `sw.js`：静态资源缓存及离线入口回退。
- `icon.svg`：应用图标。
- JSON 备份：由页面 Blob 下载生成；恢复时解析并验证 JSON，再写入现有本地存储键。

## 2. 本地数据结构

存储键：`personal-planner:v1`。

```json
{
  "schemaVersion": 1,
  "plans": [{
    "id": "uuid",
    "title": "读书 20 分钟",
    "note": "睡前阅读",
    "period": "daily",
    "category": "学习",
    "priority": 3,
    "dueAt": "2026-10-28T18:30",
    "notifiedFor": "",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }],
  "completions": {
    "uuid|daily|2026-10-28": true
  }
}
```

周期值包括 `daily`、`weekly`、`monthly`、`yearly`，以及临时的 `daily_random`、`weekly_random`、`monthly_random`。随机临时计划还保存创建时的 `cycleId`。计划分类允许 `未分类`、`工作`、`学习`、`生活`、`健康`、`财务`、`兴趣`。优先级是 1–5 的整数。提醒时间 `dueAt` 为本地 `YYYY-MM-DDTHH:mm` 字符串，`notifiedFor` 记录已发送提醒对应的时间；旧数据缺少这些字段时视为未设置提醒。读取时会检查 schema 版本、字段类型和周期枚举；旧数据缺少 category 时映射为“未分类”，缺少 priority 时映射为 1。列表文本通过 `textContent` 显示，不作为 HTML 执行。

### JSON 备份格式与校验

导出文件保留 schemaVersion 1 的数据结构，并增加 `appVersion` 与 `exportedAt` 元信息；提醒时间和已提醒标记随计划导出。导入上限为 2 MB、5000 条计划和 100000 条完成记录；验证 ID 唯一、标题和周期有效，仅接受属于导入计划的完成记录。确认导入后整体覆盖当前存储。用户取消确认时不写入。解析或结构错误不会覆盖现有数据。

## 2.2 分类、筛选与排序

计划 `category` 是本地受控枚举，`priority` 范围 1–5；旧版本数据和备份按默认值“未分类”和 1 星兼容。列表先按当前周期筛选，再按分类和标题／备注关键词筛选，最后按添加顺序、优先级、标题 localeCompare 或 ISO 创建时间排序。进度统计基于筛选后的可见计划。星形使用内嵌 SVG symbol，无外部图片资源。

## 临时计划过期规则

`RANDOM_BASE` 将三个随机周期映射至 daily／weekly／monthly 的周期标识。创建临时计划时保存 `cycleId`；载入状态及每分钟刷新时，对照当前周期标识清理过期计划与完成记录。周周期从周一开始。导入备份时保留周期标识；旧备份没有随机周期记录。若新格式随机计划缺少 `cycleId`，导入时按当前周期初始化。

## 批量清理范围

清理操作以 `activePeriod` 作为唯一范围，不读取搜索关键词或分类筛选器。清空全部时选中该周期全部计划；清空已完成时仅选择 `completionKey(plan)` 在当前周期为 `true` 的计划。确认后统一删除计划和相关完成记录，再持久化并重绘界面。确认提示列明标签和数量。

## 2.3 提醒机制

提醒由页面打开期间的定时检查触发，使用浏览器 Notification API。首次保存提醒计划时请求通知权限；每 15 秒检查一次，计划未完成且提醒时间已到时发送一次，并保存 `notifiedFor` 防止重复。更改提醒时间会重置该字段。提醒时间按设备本地时区解释。页面关闭时无后台触发能力；推送或系统级定时提醒需要服务端推送或平台支持。

## 3. 周期标识

每日为 `YYYY-MM-DD`；每周为包含该日的一周周一日期；每月为 `YYYY-MM`；每年为 `YYYY`。日期按设备本地时区计算，周一为周起始日。

## 4. 修改约定

- 修改产品行为时同步更新本手册、玩法说明和更新记录。
- 更新 Service Worker 覆盖的静态资源后，应递增 `sw.js` 中的缓存名。
- 数据结构改变时递增存储 schema，并设计旧数据迁移或清晰的错误反馈。
- 不要在 `innerHTML` 中拼接用户输入；保留对存储数据的类型校验。
- 生产部署需经 HTTPS，以启用 Service Worker 和 PWA 安装能力。

## 5. 已知限制

没有服务器、账号或同步机制。浏览器存储可能被用户清理或受浏览器隐私策略限制。本版本没有历史周期选择、提醒和自动化测试。
## 参考网站字段（V10.3）
计划对象增加可选 `referenceUrl` 字符串。旧数据缺少该字段时按空字符串处理。有效 HTTP/HTTPS 链接在计划列表备注上方显示，点击在新标签页打开；网址格式无效时不显示可点击链接、不弹提示。字段自动随 JSON 备份和 Supabase JSONB 快照同步，无需 SQL 迁移。



## PDF 导出（V10.4）

顶部“导出 PDF”按钮从当前渲染后的 `#task-list .task` DOM 读取记录，因此导出范围与屏幕当前可见结果一致：当前周期、搜索关键词、分类筛选和排序均生效。回收站、归档管理窗口以及被筛选隐藏的计划不会被导出。导出器将当前可见记录转为独立打印页，采用内联 CSS 和系统中文字体回退，不依赖第三方库或在线 CDN。浏览器打印对话框中选择“另存为 PDF”即可保存。

每条计划使用 `.plan-record { break-inside: avoid; page-break-inside: avoid; }`，长备注保留换行并允许断词，长 URL 可折行；打印使用 A4 页面、适合打印的页边距和页码。该 CSS 可避免一般长度的计划记录被拆开，但 CSS 分页规则不能保证将超过整页可打印高度的单条记录缩放到一页；此类极端长内容仍可能由浏览器分页引擎拆开。导出只读取 DOM，不修改本地计划或云端快照，不需要数据库迁移。


## V10.11 多语言模块设计

`i18n.js` 在应用脚本之前加载，提供 `window.PlannerI18n` 的 `getLanguage()`、`setLanguage(lang)`、`locale()` 和 `t(text)` 接口。翻译字典以现有中文系统文案为键，支持 zh（默认）、en、ja。语言偏好保存在独立 LocalStorage 键 `personal-planner:language:v1`，不写入业务状态对象。模块扫描系统界面文本及 placeholder、aria-label、title 等显示属性，并监听后续动态 DOM 更新；计划标题、备注、参考链接等用户内容节点被排除。日期格式通过当前语言 locale 输出。版本履历按语言加载 `CHANGELOG.md`、`CHANGELOG.en.md` 或 `CHANGELOG.ja.md`。PDF 导出使用当前语言的系统标签。

语言功能不得改变 `schemaVersion: 1`、计划字段、分类枚举、周期枚举、完成记录、JSON 备份、Supabase RPC 或事务式保存机制。新增语言仅扩展字典和对应版本履历。


---

## 历史快照：`docs/deployment_and_troubleshooting.md`（整合前）

# V10.14 四模块管理部署与数据说明

- V10.14 沿用现有 GitHub Pages、Supabase 登录和 `planner_get_data`／`planner_put_data` RPC，不需要新建数据库表或执行 SQL 迁移。
- Service Worker 缓存名为 `daily-weekly-planner-v10-14-four-module-management`。部署新版时同时发布 `index.html`、`i18n.js`、`sw.js`、三种语言 CHANGELOG 和文档。
- 本地数据键：计划 `personal-planner:v1`、工作 `personal-work:v1`、外语学习 `personal-language:v1`、整理 `personal-organizer:v1`。切换模块不会混合数据。
- 首次打开 V10.14 时，计划模块会将普通记录、归档记录和回收站中 category=「工作」的记录迁移为「未分类」，并从计划分类中移除「工作」。迁移只修改分类字段，保持其他字段、记录顺序和完成信息；迁移可重复执行。保存成功后才替换当前内存状态；若 LocalStorage 保存失败，原数据不被覆盖，下次进入计划模块会重试。迁移前建议先导出计划 JSON 备份。其他计划分类顺序保持不变。
- 工作分类与任务状态独立；外语学习分类为英语、德语、俄语、日语、其他（不含挪威语）。
- JSON 备份分别使用 `moduleType: plan/work/language/organize`。旧版没有 `moduleType` 的计划备份仍可导入；跨模块备份会被拒绝。
- 云端快照保留原计划根结构，并使用 `work`、`language`、`organizer` 分区保存其他模块。上传当前模块时先读取云端快照并合并，不覆盖其他模块；下载只恢复当前模块。若要把本机计划分类迁移同步到云端，请在计划模块完成首次迁移后上传计划数据。
- 更新后刷新网页；已安装 PWA 请完全关闭后重新打开，等待 Service Worker 更新。不要为了刷新版本而清除整个站点数据，以免删除尚未备份的本地记录。

---

# V10.13 整理模块部署与数据说明

- V10.13 沿用现有 GitHub Pages 和 Supabase 配置，不需要新建数据库表或执行 SQL 迁移。
- 整理数据本地保存在 `personal-organizer:v1`；计划仍保存在 `personal-planner:v1`。清除浏览器数据前，请分别在两个模块导出 JSON 备份。
- 云端上传会先读取当前完整快照，再合并当前模块；请在整理模块中上传整理数据，在计划模块中上传计划数据。下载只替换当前打开的模块。
- 旧云端快照只有计划数据时仍可下载计划；整理模块会提示尚无整理备份，上传整理数据后才建立 organizer 分区。
- JSON 文件包含 moduleType，不能将整理备份导入计划，反之亦然。跨设备恢复时先登录相同 Supabase 账号，再分别下载计划和整理数据。

# V10.12 自定义分类管理部署说明

部署新版 index.html、i18n.js、sw.js、三种语言的 CHANGELOG 和文档。Service Worker 缓存名为 daily-weekly-planner-v10-12-custom-category-management。无需 Supabase SQL 或数据库迁移，schemaVersion: 1 不变。分类配置进入本地状态、JSON 备份／恢复和 Supabase 快照。旧版数据缺少 categories 时自动补充原有七个分类。删除使用中分类前需选择目标分类，普通、归档和回收站计划先迁移再删除。更新后刷新网页；已安装 PWA 请完全关闭后重新打开。不要直接清除整个站点数据。

## V10.10 首页星级统计与任务快速定位

部署新版 index.html、sw.js 和更新后的文档。Service Worker 缓存名升级为 daily-weekly-planner-v10-10-star-dashboard-jump。无需 Supabase SQL 或数据迁移，schemaVersion: 1 和现有 JSON 备份格式保持不变。

首页欢迎语下方会显示 1–5 星未完成任务数量。统计仅包括每日、每周、每月、每年正式计划，排除已完成、已归档和随机临时计划。点击非零星级后进入任务数量最多的周期；并列时每日优先，其次每周、每月、每年。系统会清空搜索和分类筛选，保留排序模式，并定位高亮第一条匹配任务。

更新后若没有看到新面板，请刷新网页；已安装 PWA 请完全关闭后重新打开，等待 Service Worker 更新。统计为 0 的星级不可点击属于正常行为。

## V10.9 优先级默认排序更新

部署新版 index.html、sw.js 及更新后的文档。Service Worker 缓存名升级为 daily-weekly-planner-v10-9-priority-sorting。无需 Supabase SQL 或数据迁移，计划 schemaVersion: 1 不变。

首次使用 V10.9 时，若当前浏览器没有已保存的排序偏好，将默认显示「优先级（未完成优先）」。之后用户切换的排序方式保存在该浏览器的独立 LocalStorage 键中。排序偏好不会随 JSON 备份或 Supabase 云端快照迁移；其他设备首次使用时也会默认优先级排序。

若仍显示旧排序界面，请刷新页面；已安装 PWA 建议完全关闭后重新打开，以便 Service Worker 更新缓存。

## V10.8 版本记录与部署状态

首页「版本与更新记录」弹窗通过公开 GitHub 内容地址读取 CHANGELOG，并调用 GitHub API 检查 main 最新提交与 Pages 构建部署工作流。若 API 受网络限制或匿名请求达到额度，状态会显示「检查失败」，可稍后刷新；完整履历仍可通过弹窗内 GitHub 链接查看。

「部署成功」表示 GitHub Pages 的 build and deployment workflow 已对当前 main SHA 成功完成。它不保证浏览器或 PWA 缓存已经切换到最新文件。若仍看到旧界面，请刷新网页；已安装 PWA 请完全关闭后重新打开。Service Worker 缓存名为 `daily-weekly-planner-v10-8-release-history`。

## V10.7 快速添加计划

部署新版 `index.html`、`sw.js` 及更新后的文档。Service Worker 缓存名升级为 `daily-weekly-planner-v10-7-quick-add`；更新后重新载入网页，已安装 PWA 建议完全关闭后重新打开。无需 Supabase SQL 或数据迁移，`schemaVersion: 1` 保持不变。

快速添加位于计划卡片进度条下方。输入名称后按 Enter 或点击“＋ 添加”。新计划进入每日视图，默认未完成、未分类、1 星且无提醒。保存失败时输入内容会保留；若出现存储错误，请先检查浏览器站点存储，不要清除网站数据。

## V10.6 保存一致性修复

部署新版 `index.html` 与 `sw.js`。Service Worker 缓存名升级为 V10.6，更新后建议重新载入页面；已安装 PWA 可完全关闭后重新打开。无需数据库迁移，数据结构保持 `schemaVersion: 1`。

若出现保存失败提示，应用会保留本次操作前的数据状态。建议先导出 JSON 备份，再检查浏览器站点存储空间、隐私模式或存储限制。不要为了排查而直接清除网站数据，以免删除尚未备份的计划。

## V10.5 五级优先级更新

上传新版 `index.html`、`sw.js` 及更新后的文档即可。Service Worker 缓存名已升级为 V10.5。无需 Supabase SQL 迁移；优先级继续存储在原 `priority` 字段，旧数据 1/2/3 无需转换。JSON 备份恢复和云端上传/下载会自动保留 4、5 星。

# 部署与故障排查

## 数据库账号初始化

1. 在新 Supabase 项目 SQL Editor 中全选 `docs/supabase-setup.sql` 的全部内容并运行，确保最后一个函数结束标记也包含在内。不要只运行从 `returns boolean ... as $put_data$` 开始的选中片段。
2. 按 SQL 脚本注释在 SQL Editor 单独插入用户名 `oooo` 的密码摘要。该初始化命令不要加入公开仓库。
3. 登录页面填入项目 URL、公开 publishable/anon key、用户名和密码。
4. V10.2 已移除项目自定义的连续失败锁定；若旧数据库仍表现为锁定，请确认已执行 `docs/migration_V10.2_remove_login_lockout.sql`。

登录验证和数据读写由 database RPC 处理；直接访问表的权限已撤销。不要将 service_role key 填入网页。

## V9 云端同步

登录页需要 Supabase 项目 URL 和公开 publishable/anon key。登录使用 `planner_login` RPC；同步读写使用 `planner_get_data` 与 `planner_put_data`。SQL 初始化步骤在前面的“数据库账号初始化”中。部署到 HTTPS 后使用 GitHub Pages 网址登录；直接用 `file://` 打开时，浏览器可能拦截对 Supabase 的请求。

### 同步报错

- 检查 URL 与 publishable/anon key 是否来自同一个 Supabase 项目。
- 若提示关系或权限错误，确认已执行 `docs/supabase-setup.sql`，并确认 `planner_login`、`planner_get_data`、`planner_put_data` RPC 已创建且允许 anon 调用。
- 同步按钮为灰色时，先登录账号。
- 上传和下载是整份快照的单向替换，不是自动合并；先确认数据来源并保留 JSON 备份。

## 1. 发布到 GitHub Pages

1. 在 GitHub 创建一个仓库。
2. 上传本项目全部文件，保持 `index.html`、`manifest.webmanifest`、`sw.js` 和 `icon.svg` 位于发布目录根部。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**，选择 `main` 分支和 `/(root)`，保存。
5. 等待部署完成后，打开 Pages 页面显示的 HTTPS 地址。

Pages 的实际访问地址由 GitHub 提供。项目使用相对资源路径，既可部署到用户站点也可部署到仓库项目路径。

## 2. 手机使用与离线能力

首次请通过 HTTPS 在线打开。Service Worker 安装后会缓存入口、manifest 和图标。支持 PWA 安装的浏览器可从菜单选择“安装应用”或“添加到主屏幕”；不同浏览器选项可能不同。双击本地 HTML 可使用核心功能，但不启用 Service Worker 离线缓存。

## 3. 更新后仍显示旧版

更新静态资源时递增 `sw.js` 中的 `CACHE_NAME`，再提交到 GitHub。若仍显示旧版，确认 Pages 发布完成，关闭旧标签页后重新打开并刷新；必要时清理该站点缓存或重新安装 PWA。清除站点数据可能同时清除本地计划，请谨慎操作。

## 4. 常见问题

### 批量清理按钮是灰色的

- “清空当前标签计划”在该标签没有计划时禁用。
- “清空当前标签已完成”在该标签当前周期没有已完成计划时禁用。
- 批量操作按当前标签范围处理，不会因搜索或分类筛选而缩小范围；执行前会显示影响数量并要求确认。

### 提醒没有出现

- 确认保存时允许了浏览器通知权限，并检查系统是否允许该浏览器发送通知。
- 提醒需要计划页面保持打开；页面关闭、浏览器休眠或设备省电可能导致不触发或延迟。
- 已完成的计划不会提醒，且每个提醒时间只发送一次。

### 随机临时计划消失

随机临时计划只在创建时所在的日、周或月内有效。日历周期结束后会自动清除；每周按周一开始计算。需要跨周期保留的事项，请添加为普通每日／每周／每月计划。

### JSON 导入失败

- 确认选择的是本网页导出的 `.json` 文件，文件大小不超过 2 MB。
- 文件必须包含支持的 `schemaVersion: 1`，且计划字段和周期值有效。
- 导入错误不会改写当前数据；可尝试从原网页重新导出备份。
- 导入确认会替换当前浏览器数据，恢复前可先导出一份现有备份。
- 旧版备份中的计划若未包含优先级，会显示为 1 星。

### 导出后找不到文件

- 查看浏览器默认“下载”目录及下载列表。
- 检查浏览器是否拦截了下载，或设备存储空间是否充足。

### V1 备份中的分类为空

V1 不包含分类字段。导入 V1 备份后，计划默认显示为“未分类”，可以逐条编辑选择分类，再导出新的 V2 备份。

### 页面空白

- 确认打开的是 Pages 发布地址，而不是仓库源码页。
- 检查根目录是否包含 `index.html`。
- 打开浏览器开发者工具 Console 查看脚本报错。
- 检查 HTML 上传是否完整。

### 计划没有保留

- 确认没有使用无痕窗口，且仍在同一浏览器和设备访问。
- 检查浏览器是否限制网站存储或已清理该站点数据。
- 页面出现存储警告时，浏览器可能拒绝读取或写入 `localStorage`。

### PWA 没有安装或离线不可用

- PWA 需通过 HTTPS 或 localhost 访问，不能依赖 `file://`。
- 确认 manifest、图标和 `sw.js` 均可通过发布网址访问。
- 部分浏览器不会显示安装提示，可尝试浏览器菜单中的安装选项。

## 5. 发布前检查

- [ ] GitHub Pages 能打开首页。
- [ ] 新增、编辑、完成、取消完成和删除流程可操作。
- [ ] 刷新后本地计划仍存在。
- [ ] 桌面和手机视口下布局可用。
- [ ] 静态资源路径正确，缓存名与本次版本一致。
## V10.3 参考网站部署说明
本功能仅修改前端计划 JSON 字段，无需执行 Supabase SQL。部署时上传完整项目文件并确保 `sw.js` 一并更新，以便浏览器更新缓存。



## V10.4 PDF 导出说明

PDF 导出在浏览器本地生成打印排版页，不调用服务器，也不依赖外部 CDN。点击“导出 PDF”后需允许本站打开新窗口；若没有打开，请检查浏览器的弹出窗口拦截设置。随后在浏览器打印对话框中选择“另存为 PDF”。如需中文字体正常显示，建议使用现代版 Chrome、Edge 或 Firefox，并确保操作系统有可用的中文字体。若打印预览仍显示旧版，请强制刷新页面；PWA 用户可关闭后重新打开，以加载新的 Service Worker 缓存版本。


## V10.11 多语言部署与缓存

部署时必须同时上传 `index.html`、`i18n.js`、`sw.js` 和三种语言的 CHANGELOG 文件。Service Worker 缓存名升级为 `daily-weekly-planner-v10-11-multilingual-ui`，并将 `i18n.js` 加入预缓存列表，因此三种语言界面支持首次在线载入后离线使用。无需 Supabase SQL、数据库迁移或计划数据转换；语言偏好单独保存在 `personal-planner:language:v1`。更新后请刷新网页；已安装 PWA 请完全关闭再重新打开。若仍显示旧版本，检查 Pages 对应提交的部署工作流成功后再处理站点缓存，避免清除会影响计划数据的整个站点存储。


---

## 历史快照：`docs/nightly-e2e-testing.md`（整合前）

# Nightly Playwright E2E and Stability Testing

## Purpose

This project is a static HTML application. The browser suite verifies real user-visible behavior without changing the production application or its data format.

## Safety boundary

- Every test uses a fresh Playwright browser context and its isolated LocalStorage.
- The test intercepts the Supabase login RPC and returns a synthetic success response.
- Every other request under `/rest/v1/` is blocked by Playwright.
- No real Supabase account, password, snapshot, upload, or download is used.
- The tests do not open cloud-sync dialogs or invoke cloud synchronization.
- Test records exist only in the temporary browser context created by the test runner.

## Test coverage

- All seven module navigation buttons.
- Independent LocalStorage partitions for Plan, Work, Language, Organize, Results, Future, and Memo.
- Create/save behavior in each module.
- Persistence after a browser reload.
- Plan completion-state persistence.
- Long-running repeated module navigation and LocalStorage JSON/schema audits.
- Uncaught browser JavaScript errors.

## Run locally

Requirements: Node.js 24, Python 3, and npm.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Run only the normal browser regression tests:

```bash
npm run test:e2e:smoke
```

Run a shorter stability test while developing:

```bash
STABILITY_DURATION_MINUTES=2 npm run test:stability
```

## GitHub Actions

- Daily schedule: removed in V10.35 to keep maintenance light for a personal project.
- Push and pull-request validation: 1-minute stability smoke duration plus all functional tests.
- Manual run: Actions → Nightly Playwright E2E and Stability → Run workflow; default stability duration 10 minutes, can be changed.
- Job timeout: 60 minutes.
- HTML report, JSON results, screenshots, traces, and stability summary are uploaded as an artifact for 30 days.

There is no scheduled run. Re-add a `schedule` trigger to the workflow if nightly runs are needed again.

## Interpreting results

A green workflow means the browser scenarios and the configured soak duration completed without detected failures. It is not a proof that every possible application state is defect-free. A failed run should be inspected through the HTML report and any attached screenshot/trace.

---

## V10.56.0 · 阶段 3-A 交易收支、业务文档与私有附件（2026-11-21）

- 需求：实现阶段 1-A 设计中未落地的 `transaction`、`document`、`file` 记录与私有 Storage 文件上传/下载。
- 影响：新增前端模块 `company-records-rules.js`、`company-records-workspace.js`；`company-business.js` 仅增加标签切换事件和扩展标签保护；company-api 升级为 v6（新增 `/files` 端点、交易/文档校验、禁止经 `/records` 操作 file 记录）；新增 Storage Bucket 迁移；不修改 `company_records` 结构、计划模块数据、备份格式或登录流程。
- 验证：`scripts/validate-v10.56.mjs` 与既有 20 个验证脚本通过；新增 `tests/e2e/company-records.spec.js`（模拟 API）在本地 Chrome 通过。既有 `company-business`、`company-navigation`、`company-task-due-date` 三个 E2E 用例在未修改的 V10.54.0 上同样失败，属既有问题，非本次回归。
- 交付：按用户要求直接提交到 `main`；Storage 迁移和 company-api v6 尚未部署；未进行真实浏览器验收。详见 [阶段 3-A](company-website/phase-3a-transactions-documents-files.md)。
