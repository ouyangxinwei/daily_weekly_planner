# 项目总览

## 项目定位

慢慢计划是一个以个人计划和工作管理为核心的综合 Web/PWA 工作区。项目逐步扩展为多个职责和数据边界清晰的工作区，并增加个人公司业务管理能力。

- 仓库：`ouyangxinwei/daily_weekly_planner`
- 当前仓库版本：`10.67.0`（以根目录 `VERSION` 为准）
- GitHub Pages 入口：https://ouyangxinwei.github.io/daily_weekly_planner/
- 日常开发分支：`development`
- 稳定与部署分支：`main`
- Agent 特别保留分支：`feat/agent-plan-steps`
- 当前参考实现：原生 HTML、CSS、JavaScript；部署于 GitHub Pages。

## 产品工作区

1. **计划工作区**：周期计划、工作事项、外语任务和整理资料，以及搜索、筛选、排序、分页、归档、回收站、撤销和备份。
2. **外语学习工作区**：独立学习内容、练习、错题、学习记录和数据管理。
3. **成绩与未来**：计划工作区中的两个独立模块（V10.24 起），用于个人成果记录与未来规划；专门业务实体仍待确认。
4. **个人公司网站**：客户、项目、任务、业务跟进、业务工作台，以及交易收支、业务文档和私有附件。
5. **首页天气看板**：东京与横滨天气信息。
6. **系统工具**：账号与同步、主题/语言设置、运行日志和系统健康检查等。

## 产品规范与文档边界

[产品功能与业务规范](product-specification.md)是跨语言的产品基线，记录产品目标、各工作区职责、业务规则、核心概念、数据生命周期、数据隔离和功能状态。未来更换开发语言时，应以该规范保持业务行为一致。

其他文档按职责维护：
- [功能与系统说明](feature_and_system_guide.md)：当前功能摘要。
- [技术手册](technical_manual.md)：当前 JavaScript/Supabase 参考实现的技术细节。
- [开发历史与历史交付档案](development-history.md)：历史需求、影响分析、验收和交付记录。
- [专项文档](company-website/README.md)：独立子系统的详细设计与阶段记录。

当前功能状态以产品规范和对应专项文档为准；代码合并、自动化测试、真实浏览器验证和线上部署是不同的状态，不能相互替代。

## 仓库管理

V10.67.0 在 `development` 增加独立仓库管理模块，用于手动维护 GitHub 仓库清单、分类、技术栈、状态、优先级、特殊标记和备注。初始导入 16 个账号仓库；初始分类仅为整理建议，状态统一为「待整理」，技术栈留空并标记「待核实」，不得将未经审计的信息当作事实。数据使用独立 LocalStorage key `planner-repositories:v1`，不参与计划模块 JSON 备份、七模块云端同步或 Supabase 数据分区。JSON 导入先校验并显示新增/更新/跳过预览，确认后按仓库 ID 或 GitHub URL 合并，不会删除未出现在导入文件中的现有记录。

## 核心数据边界

- 计划、工作、计划内外语任务和整理资料分别管理。
- 独立外语学习工作区不与计划内外语任务混用，也不参与计划工作区四模块整体备份和云端快照。
- 公司客户、项目、任务、跟进、交易、文档和附件独立于计划工作区数据，不进入计划模块 JSON 快照或云端分区；附件内容保存在私有 Storage。
- 天气缓存独立于业务数据。
- 运行日志仅用于当前设备诊断，不上传业务云端。

## 当前参考实现与外部服务

- **GitHub Pages / GitHub Actions**：代码托管、自动化检查和静态站点发布。
- **Supabase**：计划模块账号校验与云端快照，以及公司网站业务记录和 Edge Function。
- **Open-Meteo**：首页天气数据接口。

这些是当前实现的技术选型，不构成未来五种语言必须沿用的架构约束。

## 重要边界

- 不要把 Supabase `service_role` 密钥、真实密码或 Token 写入仓库。
- 不要把公司业务记录写入计划模块快照。
- 不要把运行日志、天气缓存或独立外语学习工作区数据误认为四模块云端快照的一部分。
- GitHub 提交或构建成功不等于已部署；部署结论必须以对应 Actions / Pages deployment 成功记录为准。

## 主要文档

- [产品功能与业务规范](product-specification.md)
- [功能与系统说明](feature_and_system_guide.md)
- [技术手册](technical_manual.md)
- [部署与故障排查](deployment_and_troubleshooting.md)
- [公司网站阶段文档](company-website/README.md)
- [开发历史档案](development-history.md)
- [Git 分支工作流](git-branching-workflow.md)
