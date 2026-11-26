# 个人公司网站开发文档

本目录维护「慢慢计划」内个人公司网站模块的需求、架构决定、实施记录、整体路线和验收结果。跨语言的客户、项目和跟进业务语义以[产品功能与业务规范](../product-specification.md)为总基线；本目录保留公司子系统的技术设计和阶段证据。

## 当前状态

- **最新完成阶段：Phase 3-D-A——项目计划进度与实际进度偏差分析（V10.66.0，PR #92 已合并；验证 Run #505 成功；Pages 部署结果待确认）。**

- **整体阶段：Phase 3——财务与文档资料（Phase 2 已全部完成并通过用户验收）。**
- **Phase 1：当前定义的 13 个核心工作项均已完成并通过阶段验收。**
- **最近完成基线：Phase 3-C-C——客户关系健康度与跟进机会（V10.65.0，PR #85 已合并；验证 Run #478 成功；无数据库/API 变更）。Phase 3-C（A/B/C）全部完成。当前推进 Phase 3-D-A。**
- Phase 3-B-A（V10.59.0，PR #72）已合并；用户暂缓实际浏览器验收，后续开发继续推进。
- Phase 3-A（V10.56.0）已于 2026-11-21 通过生产真实浏览器验收；V10.58.0 数据完整读取修复已合并并部署。
- **V10.58.0：业务记录完整读取与限流保护修复（PR #66，已合并、已部署；自动化验证通过，真实浏览器验收状态未单独记录）。**
- 2-D 业务趋势与周期复盘（V10.54.0）：已合并、部署并通过用户真实浏览器验收（2026-11-21）；Phase 2 正式完成。
- **Phase 2 路线：2-A 业务总览 → 2-B 待办事项中心 → 2-C 项目与客户业务概况 → 2-D 业务趋势与周期复盘。**
- 当前 main 应用版本：V10.68.0（PR #93 已合并；V10.68 Pages 部署成功）；V10.68 Pages 部署 Run `45732359753` 的 build、deploy、report-build-status 均成功；真实浏览器验收待用户确认。Pages 部署状态以对应 GitHub Actions build/deploy 结果为准。
- Phase 3-B-C：状态变更历史（V10.61.0），项目/任务/跟进初始状态及每次状态变化由数据库触发器记录；业务趋势按真实完成事件时间统计。
- 项目定位：个人开发练习优先，先实现可用版本，保持结构简单、易修改。
- 业务数据：使用主要业务表 `company_records`，不同记录类型共用基础字段，差异字段放入 JSONB。
- 认证：沿用慢慢计划现有自定义账号认证；Edge Function 在服务端再次验证请求身份。
- API：生产 `company-api` v10（ACTIVE）；包含 `/status-history`、认证分页 `/activity-history` 与私有仓库管理 `/repositories` GET/PUT。
- 文件存储：私有 Bucket `company-documents` 已部署，`public=false`，10 MiB 上限、12 种 MIME 类型；不开放客户端 Storage RLS 策略，附件只通过 company-api 签发的短时签名 URL 上传/下载。
- 阶段 1-A 至 1-H：设计、数据库/API、客户、项目、任务和项目进度联动能力均已完成。
- 阶段 1-I-A：跨模块导航 V10.46.0 已合并、部署并通过用户真实浏览器验收。
- 阶段 1-I-B：关联信息展示优化 V10.47.0 已合并、部署并通过用户真实浏览器验收。
- 阶段 1-I-C：关联筛选状态提示与快捷清除 V10.48.0 已合并、部署并通过用户真实浏览器验收。
- 阶段 1-I-D：关联记录快捷打开与编辑 V10.49.0 已合并、部署并于 2026-11-20 通过用户真实浏览器验收。
- 当前已定义的 13 个阶段工作项（1-A 至 1-H、1-I-A 至 1-I-E）均已完成并按阶段要求验收，Phase 1 核心业务工作区目标已达成。Phase 2 的 2-A、2-B、2-C、2-D 均已于 2026-11-20 至 2026-11-21 完成生产部署并通过用户真实浏览器验收，Phase 2 正式关闭。

## 首要接续文档

- [个人公司网站整体进度与后续路线](./overall-progress-roadmap.md)：重新进入项目时先读这里，了解整体阶段、已完成步骤、下一步和剩余工作估算。

## 阶段文档

- [Phase 3-D：项目交付与资源规划](./phase-3d-delivery-planning.md)
- [Phase 3-D-A：项目计划进度与实际进度偏差分析](./phase-3d-a-project-delivery-analysis.md)

- [Phase 3-C-C：客户关系健康度与跟进机会](./phase-3c-c-customer-relationship-health.md)
- [Phase 3-C-B：客户与项目收支贡献分析](./phase-3c-b-customer-project-contributions.md)
- [Phase 3-C-A：统一经营决策台](./phase-3c-a-business-decision-center.md)
- [Phase 3-B-D：业务活动时间线](./phase-3b-d-business-activity.md)
- [Phase 3-B-C：业务状态变更历史](./phase-3b-c-status-history.md)
- [Phase 3-B-B：按币种的月度收支趋势](./phase-3b-b-monthly-cashflow.md)
- [Phase 2 路线与阶段规划](./phase-2-overview-workbench.md)
- [阶段 2-A：业务总览首页](./phase-2a-business-overview.md)
- [阶段 2-B：待办事项中心](./phase-2b-todo-center.md)

- [阶段 1-A：数据库、RPC 认证与私有文件存储设计](./phase-1a-design.md)
- [阶段 1-B：数据库最小实现](./phase-1b-database.md)
- [阶段 1-C：company-api Edge Function](./phase-1c-edge-api.md)
- [阶段 1-D：客户管理前端工作区](./phase-1d-customer-workspace.md)
- [阶段 1-E：项目管理与业务跟进](./phase-1e-project-follow-up.md)
- [阶段 1-F：项目详情与进度管理](./phase-1f-project-details-progress.md)
- [阶段 1-G：项目任务管理](./phase-1g-project-task-management.md)
- [阶段 1-H：项目任务与进度联动](./phase-1h-project-task-progress.md)
- [阶段 1-I-A：跨模块导航](./phase-1i-a-cross-module-navigation.md)
- [阶段 1-I-B：关联信息展示优化](./phase-1i-b-related-information.md)
- [阶段 1-I-C：关联筛选状态提示与快捷清除](./phase-1i-c-relationship-filter-context.md)
- [阶段 1-I-D：关联记录快捷打开与编辑](./phase-1i-d-related-record-shortcuts.md)
- [阶段 1-I-E：任务截止日期快速筛选](./phase-1i-e-task-due-date-filters.md)

- [Phase 2：业务总览与工作台](./phase-2-overview-workbench.md)
- [阶段 2-A：业务总览首页](./phase-2a-business-overview.md)
- [阶段 2-B：待办事项中心](./phase-2b-todo-center.md)
- [阶段 2-C：项目与客户业务概况](./phase-2c-project-customer-overview.md)
- [阶段 2-D：业务趋势与周期复盘](./phase-2d-business-trends.md)
- [阶段 3-A：交易收支、业务文档与私有附件](./phase-3a-transactions-documents-files.md)
- [阶段 3-B-A：客户、项目、任务与跟进附件管理](./phase-3b-a-entity-attachments.md)
- [阶段 3-B-B：按币种的月度收支趋势](./phase-3b-b-monthly-cashflow.md)
- [V10.58：业务记录完整读取与限流保护（修复）](./v10-58-complete-reads.md)

## 维护规则

1. 每个阶段的关键决定、实施步骤和验收结果以 Markdown 记录。
2. 整体路线、已完成步骤和下一步统一维护在 `overall-progress-roadmap.md`。
3. 重要架构调整记录原因、影响范围和迁移方式。
4. 只做与当前阶段相称的必要测试，但不能省略关键安全检查。
5. 仅文档变更不提升应用 `VERSION`；只有实际应用功能发布时才更新应用版本及对应变更记录。
6. 数据库迁移、Edge Function 和 Storage 变更必须记录 SQL、配置、部署状态及验证结果。
