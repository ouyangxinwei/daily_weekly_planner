# 阶段 2-A：业务总览首页

## 目标

在现有个人公司网站工作区增加统一业务总览入口，将客户、项目、任务和业务跟进的关键数据集中呈现，帮助快速了解当前业务状况与需要处理的事项。

## 页面范围

### 核心 KPI
- 客户总数：所有 customer 记录，不按客户状态排除。
- 进行中项目：project 记录中 status 为 active 的数量。
- 未完成任务：task 记录中 status 不为 completed 的数量。
- 待处理跟进：follow_up 记录中 status 为 pending 的数量。

### 需要关注
- 逾期任务：due_date 早于浏览器本地今天，且状态不是 completed。
- 今日到期：due_date 等于浏览器本地今天，且状态不是 completed。
- 未来 7 天：今天至第 6 天（含今天），且状态不是 completed。
- 逾期待跟进：data.next_follow_up_date 早于浏览器本地今天，且 status 为 pending。

### 近期业务
- 最近更新项目：按 updated_at、created_at、record_date 的顺序选择可用时间排序，最多显示 3 条。
- 最近任务：按 updated_at、created_at、record_date 排序，最多显示 3 条。
- 最近客户跟进：按 updated_at、created_at、record_date 排序，最多显示 3 条。
- 项目条目打开项目详情；任务和跟进条目打开对应编辑器。

## 快捷导航

- 客户总数进入客户列表并清除客户筛选。
- 进行中项目进入 status=active 的项目列表。
- 未完成任务进入排除 completed 的任务列表。
- 待处理跟进进入 status=pending 的跟进列表。
- 四类关注项分别进入逾期、今日、未来 7 天任务筛选，或逾期待跟进筛选；快捷入口清除可能干扰结果的旧搜索和关联筛选条件。

## 数据读取与完整性

- 使用 company-api v5 的 GET /records 分页接口分别读取 customer、project、task、follow_up。
- 每页 limit=100，使用接口 total 继续读取，校验分页期间 total 保持一致、页面无提前结束且最终读取条数等于 total。
- API offset 最大为 1,000,000；若超出可读取范围或分页数据不完整，显示错误，不将不完整结果当成准确统计。
- 所有汇总仅在完整读取成功后显示；失败时清空统计卡片并显示错误，避免把失败误显示为 0。
- 近期记录的时间字段优先级为 updated_at、created_at、record_date。

## 技术与兼容边界

- 新增纯函数模块 company-overview-metrics.js，负责统计口径与近期记录排序，并提供独立验证脚本。
- 沿用 public.company_records、现有认证和 company-api v5。
- 不修改数据库 schema、migration、RLS、Edge Function、账号认证或生产业务数据。
- 保留客户、项目、任务、跟进 CRUD、项目进度自动联动、关联导航及任务截止日期筛选。
- 提供简体中文、English、日本語；支持桌面和移动端。
- 更新应用版本至 V10.51.0 和 Service Worker 缓存清单。

## 验证与验收

- 独立验证脚本覆盖 KPI 口径、逾期/今日/未来 7 天边界、已完成任务排除、待处理跟进和近期记录排序。
- GitHub Actions 检查 JavaScript 语法并执行 V10.51 验证脚本及既有回归验证。
- 用户生产浏览器验收待部署后完成。
- Playwright 不作为本阶段默认合并前提；若未取得明确结果，不记录为通过。

## 当前交付状态

- 版本：V10.51.0（开发分支）。
- 数据库/API：无变更，继续使用 company-api v5。
- PR、Actions、Pages 部署和用户验收结果：待完成。
