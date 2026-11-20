# 慢慢计划

个人计划与工作管理 PWA，持续演进为包含学习、资料整理和个人公司业务管理的综合工作区。

- **当前仓库版本：** `10.45.0`（以根目录 `VERSION` 为准）
- **在线入口：** https://ouyangxinwei.github.io/daily_weekly_planner/
- **主要技术形态：** 静态 HTML / CSS / JavaScript，部署到 GitHub Pages，支持 PWA。
- **开发主分支：** `main`。

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
| 分支、PR 和临时分支清理 | [Git 分支工作流](docs/git-branching-workflow.md) |
| 个人公司网站的设计、数据库、API 和阶段记录 | [公司网站开发文档](docs/company-website/README.md) |

## 当前功能概览

- **计划与工作管理：** 周期计划、工作事项、优先级、搜索筛选、分类、归档、回收站、撤销和分页。
- **外语与学习：** 外语任务管理，以及独立的外语学习工作区；学习工作区的数据管理和学习流程见对应文档。
- **整理：** 独立资料列表，用于管理书籍、电子产品、软件/APP、网站等资料。
- **成绩与未来：** 独立工作区入口，承载相应的个人记录与规划功能。
- **个人公司网站：** 客户、项目和业务跟进管理；业务数据通过 `company-api` 保存到 Supabase 的 `company_records`，与计划模块数据分离。
- **首页天气看板：** 东京与横滨天气信息，细节见 [天气看板说明](docs/home-weather-dashboard.md)。
- **运行日志与健康检查：** 在当前设备查看诊断信息；日志不作为业务数据上传云端。

## 数据与安全边界

- 计划、工作、外语任务和整理模块使用各自独立的数据分区；JSON 备份与云端同步按模块边界处理。
- 外语学习工作区使用独立本地数据，不与计划模块外语任务或公司业务数据混用。
- 公司客户、项目和跟进数据由独立 API 保存，不写入计划模块本地数据或云端快照。
- 不要把 Supabase `service_role` 密钥、真实密码或 Token 提交到仓库。
- 重要操作前建议先导出 JSON 备份；云端上传/下载行为及覆盖边界以应用提示和技术文档为准。

## 版本记录

简要版本变化分别维护在 [中文 CHANGELOG](CHANGELOG.md)、[English CHANGELOG](CHANGELOG.en.md) 和 [日本語 CHANGELOG](CHANGELOG.ja.md)。完整历史需求、影响分析、验收记录和交付说明集中在 [development-history.md](docs/development-history.md)，不再为每个版本重复创建多份 Markdown 文件。

## 开发协作

所有正式变更均通过独立临时分支和 PR 合并到 `main`。合并后按规范清理临时远程分支。详细规则见 [Git 分支工作流](docs/git-branching-workflow.md)。
