# 阶段 1-D：个人公司网站前端客户工作区

## 目标

在慢慢计划现有应用中新增独立的「个人公司网站」工作区，作为第三个工作区，与「计划工作区」「外语学习工作区」并列。公司业务数据不进入现有七个计划模块的 LocalStorage 或 `planner_cloud_data` 快照。

## 已实施

- 新增工作区入口，并支持记住上次选择；不改变原计划模块的导航和数据结构。
- 新增独立文件 `company-website.js` 与 `company-website.css`。
- 新增客户管理首页、客户总数、当前显示数量、分页、名称搜索、业务类型筛选、状态筛选。
- 新增客户新增/编辑表单：客户名称、业务类型、状态、联系人、邮箱、电话、网站、地址、备注。
- 支持客户删除，并在删除前要求确认。
- 业务类型使用 `trade`、`software`、`ecommerce`；状态第一版使用 `prospect`、`active`、`inactive`。
- 客户资料使用 `company_records` 中的 `record_type=customer`；常见字段保存在表列，联系人和联系方式等可变字段放入 `data` JSONB。
- 使用现有慢慢计划账号会话，不建立第二套登录。通过 `PlannerCompanyContext` 只读桥接现有内存会话；用户名、密码不会写入 LocalStorage。
- 前端通过 HTTPS 调用 `company-api`，使用 Basic Authorization 和公开客户端 key；service_role/secret key 不进入前端。
- 支持中文、英文和日文；PWA Service Worker 缓存新增前端 JS/CSS。
- 应用版本更新为 V10.41.0。

## API 接口

- `POST /auth/verify`：进入公司工作区时验证现有账号。
- `GET /customers`：分页列表，支持 `q`、`business_type`、`status`。
- `POST /customers`：创建客户。
- `GET /customers/:id`：由 API 提供详情接口（本轮列表页未单独增加详情页面）。
- `PATCH /customers/:id`：更新客户。
- `DELETE /customers/:id`：删除客户。

## 安全和数据边界

- 复用已有登录会话，刷新页面后按应用现有规则重新登录。
- 密码仅存在 JavaScript 内存中的既有 `cloudSession`，用于 HTTPS Basic Authorization；不写 LocalStorage、不写 URL、不写日志。
- 前端不访问 `company_records` 表或数据库 RPC，所有业务操作经过 Edge Function。
- 计划模块及其他七个模块的本地存储、云端同步分区和备份格式不变。
- 删除失败（例如记录被其他业务记录关联）时显示统一错误，不清理其他记录。

## 最小验证

- 新增 Playwright 用例 `tests/e2e/company-website.spec.js`，通过模拟 API 验证工作区入口、现有会话桥接、客户新增/读取、编辑、搜索和删除。
- 测试使用虚构凭据和内存 mock，不连接真实 Supabase 客户接口，不创建真实客户数据。
- 真实账号端到端 CRUD 仍需在 GitHub Pages 部署后由用户浏览器完成；此项不会要求用户把密码发送到聊天。

## 本阶段未包含

- 项目、任务、跟进、交易、文件等管理页面。
- 私有 Storage 上传/下载。
- PDF 自动生成、电子签名、员工账号和权限体系。
- 货币换算、库存、仓储、物流及电商平台同步。

## 后续

下一阶段可按业务优先级继续增加项目和跟进管理；文件上传与下载需单独实施私有 Storage 及签名 URL。
