# 个人公司网站开发文档

本目录维护「慢慢计划」内个人公司网站模块的需求、架构决定、实施记录、整体路线和验收结果。跨语言的客户、项目和跟进业务语义以[产品功能与业务规范](../product-specification.md)为总基线；本目录保留公司子系统的技术设计和阶段证据。

## 当前状态

- **整体阶段：Phase 1——公司业务工作区建设。**
- **当前子阶段：Phase 1-I——关联信息与跨模块操作体验完善。**
- **最近完成：1-I-D，已通过用户真实浏览器验收；1-I-E 正在开发。**
- **当前：1-I-E 任务截止日期快速筛选，已确认范围并正在开发。**
- 当前 main 生产版本：V10.49.0；本阶段目标版本：V10.50.0。
- 项目定位：个人开发练习优先，先实现可用版本，保持结构简单、易修改。
- 业务数据：使用主要业务表 `company_records`，不同记录类型共用基础字段，差异字段放入 JSONB。
- 认证：沿用慢慢计划现有自定义账号认证；Edge Function 在服务端再次验证请求身份。
- API：当前生产环境 `company-api` 为 v5；阶段 1-H 增加项目进度模式与 API 参数校验，数据库通过触发器同步自动进度。
- 阶段 1-A 至 1-H：设计、数据库/API、客户、项目、任务和项目进度联动能力均已完成。
- 阶段 1-I-A：跨模块导航 V10.46.0 已合并、部署并通过用户真实浏览器验收。
- 阶段 1-I-B：关联信息展示优化 V10.47.0 已合并、部署并通过用户真实浏览器验收。
- 阶段 1-I-C：关联筛选状态提示与快捷清除 V10.48.0 已合并、部署并通过用户真实浏览器验收。
- 阶段 1-I-D：关联记录快捷打开与编辑 V10.49.0 已合并、部署并于 2026-11-20 通过用户真实浏览器验收。
- 当前已定义的 12 个子阶段（1-A 至 1-H、1-I-A 至 1-I-D）均已完成；1-I-E 是当前开发中的功能阶段。整个 Phase 1 的最终关闭条件和后续 Phase 2 范围尚未确定，不应推断整个项目只剩一个步骤。

## 首要接续文档

- [个人公司网站整体进度与后续路线](./overall-progress-roadmap.md)：重新进入项目时先读这里，了解整体阶段、已完成步骤、下一步和剩余工作估算。

## 阶段文档

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

## 维护规则

1. 每个阶段的关键决定、实施步骤和验收结果以 Markdown 记录。
2. 整体路线、已完成步骤和下一步统一维护在 `overall-progress-roadmap.md`。
3. 重要架构调整记录原因、影响范围和迁移方式。
4. 只做与当前阶段相称的必要测试，但不能省略关键安全检查。
5. 仅文档变更不提升应用 `VERSION`；只有实际应用功能发布时才更新应用版本及对应变更记录。
6. 数据库迁移、Edge Function 和 Storage 变更必须记录 SQL、配置、部署状态及验证结果。
