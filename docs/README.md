# 文档中心

按用途查阅文档，当前产品规范、功能说明、技术实现与历史档案分开维护。

## 当前项目入口

- [项目总览](project-overview.md)：当前项目定位、模块组成和数据边界。
- [产品功能与业务规范](product-specification.md)：跨语言的产品目标、业务规则、数据生命周期、功能状态和未来重建基线。
- [功能与系统说明](feature_and_system_guide.md)：当前应用各模块功能入口和行为摘要。
- [技术手册](technical_manual.md)：当前 JavaScript 实现、数据分区、API/RPC 和关键技术约束。
- [部署与故障排查](deployment_and_troubleshooting.md)：Pages、PWA、Supabase 和公司网站服务的部署与排查。
- [开发历史与历史交付档案](development-history.md)：旧版本需求、影响分析、验收和交付原文归档。

## 专项设计与维护

- [运行日志系统设计](runtime-logging.md)：日志基础设施、阶段技术设计和阶段验收。
- [数据库认证设计](database_auth_design_document.md)：计划系统账号校验和数据库权限设计。
- [天气看板](home-weather-dashboard.md)：天气数据来源和缓存规则。
- [美股七巨头行情看板](stock-dashboard.md)：股票数据来源、交易周规则和缓存设计。
- [外语学习工作区（中文）](language-learning-workspace.md) · [English](language-learning-workspace.en.md) · [日本語](language-learning-workspace.ja.md)。
- [公司网站开发文档](company-website/README.md)：客户、项目和业务跟进的设计、数据库、API 与阶段记录。
- [AI 协作开发指南](ai_collaboration_guide.md)：与 AI 协作开发的约定。
- [Git 分支工作流](git-branching-workflow.md)：分支命名、PR 和合并后清理规则。
- [夜间 E2E 测试说明](nightly-e2e-testing.md)：现有自动化测试运行说明。

## 数据库脚本

- [Supabase 初始化 SQL](supabase-setup.sql)
- 历史迁移脚本保留为独立文件，执行前确认目标数据库和适用版本。

## 文档维护约定

- 产品功能与业务规范维护跨语言稳定的产品行为、业务概念和数据边界。
- 功能与系统说明只描述当前实现的功能摘要；变化时同步更新状态。
- 技术手册只描述当前技术实现，不要求未来其他语言照搬当前内部结构。
- 开发历史档案保存历史需求、影响分析、验收和交付信息。
- 三语 CHANGELOG 保留简短版本摘要。
- 不为五种未来语言提前创建实现指南；待产品和目标语言确定后再逐一编写。
- 只有独立设计、子系统或专项技术记录确有需要时，才新增 Markdown 文件。
