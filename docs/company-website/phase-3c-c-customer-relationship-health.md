# Phase 3-C-C：客户关系健康度与跟进机会（V10.65.0）

## 1. 目标

在客户、项目、跟进和活动记录已经具备的基础上，识别需要重新联系、需要安排下次跟进或仍有进行中项目但缺少近期联系的客户。提供透明、可解释的跟进提醒，不做未经数据支持的客户价值判断。

## 2. 识别规则

- 逾期待跟进：pending 跟进记录的 next_follow_up_date 早于今天。
- 待跟进缺少下次日期：pending 跟进记录没有有效 next_follow_up_date。
- 有进行中项目但无跟进历史：存在 active 项目且客户没有跟进记录。
- 有进行中项目且超过 30 天未联系：存在 active 项目，最近一次跟进日期早于今天减 30 天。
- 无进行中项目且超过 30 天未联系：作为普通机会提示，不标记为紧急风险。
- 新建不足 30 天且没有跟进历史的客户不会仅因缺少历史被标记为长期未联系。
- 客户关联通过 follow-up data.customer_id、related_record_ids 或客户 parent_record_id 识别。

## 3. 展示内容

- 客户总数、有进行中项目的客户、逾期待跟进客户、待跟进未设置下次日期客户、长期未联系且有进行中项目客户、无跟进历史客户。
- 客户卡片按紧急、需要关注、机会提示、暂无明显风险排序。
- 展示最近联系日期、下次跟进日期、待跟进数量、进行中项目，并可直接打开客户或项目。
- 30 天为明确、可解释的规则阈值；不生成 AI 分数、客户价值、流失概率或收入预测。

## 4. 技术实现

- 纯规则模块：company-customer-health.js。
- UI 入口：公司业务工作区新增“客户关系健康”标签。
- 复用 company-record-loader.js 完整分页读取 customers、projects、follow_up。
- 不新增数据库表、字段、RPC、RLS、Edge Function 或 Supabase migration。
- 不修改真实业务数据。

## 5. 验证

scripts/validate-v10.65.mjs 覆盖：
- 逾期与未来日期边界、30 天联系窗口。
- 进行中项目、已完成项目、跟进历史、无下次日期和新客户。
- 客户关联路径、优先级排序、未知创建日期保护。
- UI、Service Worker、版本和历史验证兼容。

## 6. 交付状态

- 目标版本：V10.65.0。
- 开发分支：feature/phase-3c-c-customer-relationship-health。
- 功能 PR #85 已 squash merge；合并提交：8e3bc14957fae6a83f6ea9f2ffbd15180d1b8363。
- PR 验证 workflow Run #478（45518013740）：completed / success；JavaScript 语法检查、V10.65 专项规则验证及 V10.50–V10.64 历史回归均通过。
- 生产数据库与 company-api：无变更。
- Pages 对应 build/deploy 成功证据尚未取得，不标记为已部署；真实浏览器验收暂缓。
- 数据库 / company-api：无变更。
- Pages 和真实浏览器验收状态以合并后的部署证据及用户确认记录为准。
