# 慢慢计划

个人计划与工作管理 PWA，持续演进为包含学习、资料整理和个人公司业务管理的综合工作区。

- **当前仓库版本：** `10.72.0`（以根目录 `VERSION` 为准）
- **在线入口：** https://ouyangxinwei.github.io/daily_weekly_planner/
- **主要技术形态：** 静态 HTML / CSS / JavaScript，部署到 GitHub Pages，支持 PWA。
- **日常开发分支：** `development`；**稳定部署分支：** `main`。

> 在线入口可用于访问应用；某个提交是否已部署，以 GitHub Actions 中 GitHub Pages 的实际部署结果为准。

## 从这里开始

| 想了解 | 文档 |
|---|---|
| 当前项目定位、组成模块和数据边界 | [项目总览](docs/project-overview.md) |
| 当前各模块功能和使用行为 | [功能与系统说明](docs/feature_and_system_guide.md) |
| 版本需求、设计、验收和交付历史 | [开发历史与历史交付档案](docs/development-history.md) |
| 技术架构、数据结构和关键实现 | [技术手册](docs/technical_manual.md) |
| 部署、更新和故障排查 | [部署与故障排查](docs/deployment_and_troubleshooting.md) |
| AI 协作开发约定 | [AI 协作开发指南](docs/ai_collaboration_guide.md) |
| Git 分支与固定开发工作流（本地 development → Actions → main 部署） | [Git 分支与固定开发工作流](docs/git-branching-workflow.md) |
| 仓库管理模块 | [仓库管理说明](docs/repository-management.md) |
| 当前开发状态 | [当前开发交接](docs/current-handoff.md) |
| Agent 自动化工作流（PLAN.md + run-plan.ps1） | [Agent 工作流实施指南](docs/agent-workflow.md) |
| 个人公司网站的设计、数据库、API 和阶段记录 | [公司网站开发文档](docs/company-website/README.md) |

## 当前功能概览

- **计划与工作管理：** 周期计划、工作事项、优先级、搜索筛选、分类、归档、回收站、撤销和分页。
- **外语与学习：** 外语任务管理，以及独立的外语学习工作区；学习工作区的数据管理和学习流程见对应文档。
- **整理：** 独立资料列表，用于管理书籍、电子产品、软件/APP、网站等资料。
- **成绩与未来：** 独立工作区入口，承载相应的个人记录与规划功能。
- **个人公司网站：** 客户、项目、任务和业务跟进管理，业务总览/待办/概况/趋势、经营决策、收支贡献、客户关系健康和项目交付分析工作台，以及交易收支、业务文档和私有附件（Phase 3-B-A V10.59.0 已合并；当前新增 Phase 3-D-A 项目交付分析 V10.66.0）；业务数据通过 `company-api` 保存到 Supabase 的 `company_records`，附件保存在私有 Storage，与计划模块数据分离。
- **开发日记：** 独立记录已经发生的活动，支持日/周浏览、空白日回顾、历史补记、编辑、删除、标题/详情/标签搜索（最多 50 条）和固定分类筛选；复用现有账号认证，日记数据独立于计划 JSON 备份和云端快照。详细设计与生产迁移记录见 [开发日记 V1](docs/development-diary.md)。
- **仓库管理（V10.70.0）：** 独立维护 GitHub 仓库清单，支持手动 CRUD、分类/状态/优先级/特殊标记/备注、筛选统计、JSON 预览合并导入/导出、一键清空云端清单（二次确认，不删除 GitHub 仓库或原始备份），以及 GitHub 全量提取提示词。数据保存在 Supabase 独立私有表；本次复用既有 API，无新增 migration 或 Edge Function 部署。详见 [仓库管理说明](docs/repository-management.md)。
- **首页天气看板：** 东京与横滨天气信息，细节见 [天气看板说明](docs/home-weather-dashboard.md)。
- **学习会议（V10.71.0）：** 顶部「学习会议」按钮，记录想参加的学习会议、讲座和展会；支持手动录入、AI 解析助手（复制提示词给 AI，粘贴返回的 JSON 批量导入）和导出 `.ics`（加入 Google 日历等，时间按日本时间）。**当前为本地手动维护：** 数据保存在当前浏览器（localStorage），通过「导出 JSON 备份」「导入 JSON 文件」在设备间迁移，不经过 company-api、不进入计划备份或云端快照。云端方案（Supabase 表 `learning_meetings_data` + company-api `/learning-meetings`）保留在仓库中暂不使用。 详见 [学习会议说明](docs/learning-meetings.md)（含部署步骤和待测试清单）。
- **启动入口分流（V10.72.0）：** 启动时选择「个人入口」或「管理员入口」。个人入口沿用现有账号登录；管理员入口无需登录，提供只读后台监控入口。它不是权限系统，不改变账号、API 或数据库权限。详见 [入口分流说明](docs/user-role-mode.md)。
- **测试画面：** 主界面顶部「测试画面」按钮打开测试画面列表（`test-screens.html`），选择要打开的测试项目；当前只有 `testNisa`（演练区，见 [testNisa 演练区说明](docs/testnisa-lab-preview.md)）。后续新增测试画面直接往 `test-screens.html` 的 `TEST_SCREENS` 列表配置里追加即可。
- **运行日志与健康检查：** 在当前设备查看诊断信息；日志不作为业务数据上传云端。
- **界面模式 / 使用身份（V10.69.0）：** 登录后选择「个人用户」（简洁界面，隐藏版本与更新记录、运行日志、系统健康检查、自动化测试）或「管理员」（完整界面）；可在「账号与同步」中切换，退出登录时清除。只调整界面显示，**不是权限控制**；身份只保存在当前浏览器。未选择时按完整界面显示。详见 [界面模式说明](docs/user-role-mode.md)（含待测试清单）。

## 数据与安全边界

- 计划、工作、外语任务和整理模块使用各自独立的数据分区；JSON 备份与云端同步按模块边界处理。
- 外语学习工作区使用独立本地数据，不与计划模块外语任务或公司业务数据混用。
- 公司客户、项目、任务、跟进、交易和文档数据由独立 API 保存，附件文件保存在私有 Storage；均不写入计划模块本地数据或云端快照。
- 开发日记使用独立 `diary_entries` 表和经现有账号密码 RPC 验证的 `planner_diary_*` 接口；不写入计划 JSON 备份或云端快照。
- 不要把 Supabase `service_role` 密钥、真实密码或 Token 提交到仓库。
- 重要操作前建议先导出 JSON 备份；云端上传/下载行为及覆盖边界以应用提示和技术文档为准。

## 版本记录

简要版本变化分别维护在 [中文 CHANGELOG](CHANGELOG.md)、[English CHANGELOG](CHANGELOG.en.md) 和 [日本語 CHANGELOG](CHANGELOG.ja.md)。完整历史需求、影响分析、验收记录和交付说明集中在 [development-history.md](docs/development-history.md)，不再为每个版本重复创建多份 Markdown 文件。

## 开发协作

固定开发流程为：**在 development 开发 → 本地页面测试 → GitHub Actions 自动化验证 → 获得明确许可后合并 main → 确认 GitHub Pages 正式部署成功**。GitHub Pages 只从 `main` 正式发布，不用同一个正式网址测试 development。本地页面默认使用 `http://127.0.0.1:4173/`；本地联调可能连接正式 Supabase，写操作会影响正式云端数据，测试时必须注意数据安全。完整步骤和命令见 [Git 分支与固定开发工作流](docs/git-branching-workflow.md)。

**使用 Claude Code 开发时的约定（2026-11-26 起）：** 以开发为优先，尽量省略测试（不新增自动化用例、不在本地跑 E2E）；需要测试的内容写进对应功能文档的「待测试清单」。合并、部署以及部署后的验证由其他人负责。V10.69.0 按用户要求直接提交到 `main`（与 `development` 保持一致）。

> [!WARNING]
> **Agent 测试分支 `feat/agent-plan-steps` 必须保留。**
> 该分支保存了 Agent 工作流（`run-plan.ps1` + Claude Code）首次真实执行 PLAN.md Step 1～5 的结果，用于 Agent 测试和验证留档（提交 `9295d0b`…`54c058c`，见 [Agent 工作流实施指南](docs/agent-workflow.md) 第 15、16 节）。
> - 没有特殊需求不要删除该分支，包括本地和远程；合并到 `main` 后也不按常规自动清理。
> - 确需删除时，必须先获得仓库所有者的明确确认；AI 助手不得自行删除。

- **美股七巨头行情：** 天气预报下方展示最近交易周的七只美股行情，细节见 [股票看板说明](docs/stock-dashboard.md)。

## V10.68 仓库管理云端化进度

仓库管理复用现有账号认证，保存到 Supabase 独立私有数据表；migration 已应用、company-api v10 已部署，Pages 已成功部署，浏览器验收待完成。详见 `docs/repository-management.md` 和 `docs/current-handoff.md`。
