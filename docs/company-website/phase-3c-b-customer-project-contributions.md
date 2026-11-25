# Phase 3-C-B：客户与项目收支贡献分析（V10.64.0）

## 1. 目标

在 Phase 3-C-A 经营决策台基础上，把交易与客户、项目之间的已有关系转化为可读的收支贡献视图，回答：

- 最近 12 个月，哪些客户对应较多已完成收入？
- 各项目分别关联了多少已完成收入和支出？
- 预计金额与已完成金额有何区别？
- 有多少交易没有关联客户或项目？

## 2. 统计规则

- 默认最近 12 个自然月，包含当前月；交易按 record_date 归属。
- JPY / CNY / USD 必须分开查看，不做汇率换算。
- 只统计 completed 和 planned；cancelled 排除。
- completed 的收入、支出与净现金流独立计算；planned 收入/支出单独列示。
- 金额使用 BigInt 微单位精确计算。
- 客户视图以 data.customer_id 为准；项目视图以 data.project_id 为准。缺少客户关联但有项目关联时，尝试从项目 parent_record_id 推导所属客户。
- 没有客户和项目关联的交易进入未关联汇总。

## 3. 重要口径

客户维度与项目维度是两种独立的归属分析：
- 同一笔交易同时关联客户和项目时，会在客户视图、项目视图各出现一次。
- 两个视图不能相加作为整体总额；整体总额只按原始交易计算一次。
- 客户收入占比的分母为该币种、该期间全部已完成收入（包含未关联收入）。
- 净现金流 = 已完成收入 - 已完成支出；不等于会计利润、毛利或项目利润率。
- 当前没有可靠成本/工时分摊数据，不推断客户利润或项目盈利能力。

## 4. 技术实现

- 纯规则模块：company-contribution-analysis.js。
- UI 入口：公司业务工作区新增“客户/项目收支贡献”标签。
- 复用 company-record-loader.js 完整分页读取 customers、projects、transactions。
- 复用 company-records-rules.js 中的 recordRelations、parseAmountMicros。
- 不新增数据库表、字段、RPC、RLS、Edge Function 或 Supabase migration。
- 不修改真实业务数据。

## 5. 验证

scripts/validate-v10.64.mjs 覆盖：
- 12 个月边界、当前月、币种隔离。
- 客户/项目双维度归属与未关联交易。
- 已完成、预计、取消状态区分。
- BigInt 金额精度、净现金流和收入占比。
- UI、Service Worker、版本与历史验证兼容。

## 6. 交付状态

- 目标版本：V10.64.0。
- 开发分支：feature/phase-3c-b-customer-project-contributions。
- 数据库 / company-api：无变更。
- Pages 和真实浏览器验收状态以合并后的部署证据及用户确认记录为准。
