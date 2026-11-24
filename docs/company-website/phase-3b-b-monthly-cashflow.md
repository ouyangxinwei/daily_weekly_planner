# Phase 3-B-B：按币种的月度收支趋势（V10.60.0）

## 1. 目标

在公司业务工作区增加独立的「月度收支趋势」页面，按币种观察最近 12 个自然月的收入、支出和净额，避免把 JPY、CNY、USD 直接相加造成错误的财务结论。

## 2. 展示与交互

- 最近 12 个自然月，包含当前月；默认币种 JPY，可切换 JPY / CNY / USD。
- 每月展示已完成收入、已完成支出及交易笔数，并以双条形进度展示相对金额。
- 顶部汇总：12 个月已完成收入、已完成支出、净额、预计收入/支出。
- 预计金额单独展示，不混入实际收入/支出；已取消交易不计入。
- 默认按浏览器本地日历月显示；切换币种只重新计算已加载数据，不重复请求 API。
- 提供刷新按钮，重新从 API 读取完整交易记录。
- 简体中文、英文、日文；桌面双列、移动端单列。

## 3. 统计口径

- 数据源：`company_records` 中 `record_type='transaction'` 的完整记录。
- 月份归属：交易日期 `record_date` 的前 10 位日历日期，按 YYYY-MM 归属；不使用 created_at / updated_at 代替交易日期。
- 实际收入/支出：仅 `status='completed'` 且 `data.direction` 为 income/expense 的记录。
- 预计收入/支出：`status='planned'` 单独累计，不并入实际净额。
- `status='cancelled'` 排除。
- 只纳入所选币种；JPY、CNY、USD 不做汇率换算，不跨币种合计。
- 金额沿用 NUMERIC(20,6) 对应的 BigInt 微单位，避免浮点误差。
- 缺失/无效日期、无效金额、未知币种和无效收支方向不计入。

## 4. 数据读取与技术边界

- 使用现有 company-api v6 的 GET /records 分页读取交易记录，沿用完整性校验（total 一致、无提前空页/短页、最终条数一致）。
- 只请求 transaction；不重复读取客户、项目、文档和附件，避免不必要的 API 请求与限流。
- 不新增表、字段、RPC、Edge Function、migration 或 Supabase 配置。
- 不改动既有交易记录，不修改 Phase 3-A 交易编辑/筛选/附件功能。
- 复用 `company-records-rules.js` 金额解析/格式化能力，新增纯函数 `getMonthlyCashflow`；界面在 `company-records-workspace.js` 中增加独立扩展标签。

## 5. 验证

- 新增 `scripts/validate-v10.60.mjs`。
- 覆盖 12 个月边界、跨币种隔离、收入/支出、净额、planned 单独累计、cancelled 排除、无效日期/金额、空月份、精确小数和非法参数。
- 静态检查三语标签、币种切换、完整分页读取入口、版本及缓存标记。
- 接入常规 GitHub Actions 验证。
- 不启用或运行 Nightly Playwright；真实浏览器验收可以后补，不阻断后续开发。

## 6. 交付状态

- 目标版本：V10.60.0。
- 功能 PR #74：https://github.com/ouyangxinwei/daily_weekly_planner/pull/74，已于 2026-11-24 squash merge。
- 合并提交：`6b29839b0dbf7975597ac44ede571d068e89a941`。
- 验证 workflow run #427（`45387896039`）：completed / success；JavaScript 语法检查、隔离/迁移回归、V10.50～V10.60 业务规则验证均通过；日志明确输出 `V10.60 monthly cashflow validation passed.`。
- 数据库 / API / Storage：无变更，复用生产 company-api v6。
- V10.59.0 的实际浏览器验收由用户暂缓；该项不阻断 V10.60.0 开发与合并。
- V10.60.0 Pages build/deploy：当前尚未取得对应成功运行证据，不标记为已部署。
- 真实浏览器验收状态独立记录，不因自动化验证成功而推定通过；用户已说明目前不方便验收，暂缓处理。
