# 阶段 1-C：company-api Edge Function

- 项目：`daily_weekly_planner`
- 模块：个人公司网站
- 实施分支：`company-website-phase-1c-edge-api`
- Supabase 项目：`kopvznygsqsheibsjjvv`
- Function：`company-api`
- 当前部署版本：v3（ACTIVE）
- 部署模式：`verify_jwt = false`，由函数内部执行现有自定义账号密码验证

---

## 1. 已实现内容

### 1.1 账号密码验证

- 沿用现有自定义账号 `oooo` 和 `planner_check_password`。
- 不迁移 Supabase Auth，不创建新账号体系。
- 客户端使用 HTTPS Basic Authorization 传递当前账号密码；Basic 只是 Base64 编码，不是加密，必须通过 HTTPS 传输。
- Edge Function 调用 `company_verify_credentials` 验证凭据。
- 其余业务 RPC 也再次验证密码，避免仅依赖 Edge Function 一层认证。
- 不把密码写入日志、URL、LocalStorage 或数据库业务字段。

请求头示例（前端需使用 UTF-8 安全的 Base64 编码）：

```http
apikey: <Supabase publishable/anon key>
Authorization: Basic <base64(username:password)>
Content-Type: application/json
```

Supabase 新式 `sb_secret_*` Key 仅通过服务端 `apikey` 请求头调用 PostgREST；旧式 JWT `service_role` Key 同时使用 Bearer Authorization。Edge Function 自动兼容这两种默认环境变量格式。Secret Key 不会下发浏览器。

### 1.2 六个 RPC 已接入

| RPC | API 使用场景 |
|---|---|
| `company_verify_credentials` | 登录验证 |
| `company_list_records` | 客户/通用记录列表 |
| `company_get_record` | 单条记录查询 |
| `company_create_record` | 创建客户/通用记录 |
| `company_update_record` | 更新客户/通用记录 |
| `company_delete_record` | 删除客户/通用记录 |

数据库函数继续负责最终的密码验证、owner 隔离、父级和关联记录检查、不可变字段限制。

### 1.3 HTTP 路由

| 方法 | 路径 | 功能 |
|---|---|---|
| POST | `/auth/verify` | 验证当前账号 |
| GET | `/customers` | 客户分页列表 |
| POST | `/customers` | 创建客户 |
| GET | `/customers/:id` | 客户详情 |
| PATCH | `/customers/:id` | 更新客户 |
| DELETE | `/customers/:id` | 删除客户 |
| GET | `/records` | 通用记录分页列表 |
| POST | `/records` | 创建任意允许类型记录 |
| GET | `/records/:id` | 通用记录详情 |
| PATCH | `/records/:id` | 更新通用记录 |
| DELETE | `/records/:id` | 删除通用记录 |

客户接口强制 `record_type=customer`，不会通过客户 URL 读取或修改其他类型记录。

列表查询参数：`limit`（默认 20，最大 100）、`offset`、`business_type`、`status`、`q`；通用记录列表额外支持 `record_type`。

### 1.4 请求校验与统一错误

- JSON 请求体最大 32 KB。
- 校验 JSON 对象、允许字段、标题长度、业务类型、状态、UUID、关联 ID 数量、日期、金额/币种和 JSONB 类型。
- 拒绝客户端提交 owner、id、created_at、updated_at 等不可变字段。
- 列表 limit/offset 和筛选参数在 Edge Function 层检查。
- 通用记录更新也执行独立字段白名单校验，拒绝修改 record_type 等不可变字段。
- 对外统一返回 `{ error, request_id }`，不泄露数据库内部错误文本或堆栈。
- 主要 HTTP 状态：400 参数错误、401 认证失败、403 来源不允许、404 记录不存在、409 关联冲突、413 请求过大、415 内容类型错误、429 超出限流、500 内部错误、503 数据库/配置不可用。
- 日志仅记录 RPC 名称、HTTP 状态、数据库错误代码和 request_id，不记录密码或请求正文。

### 1.5 CORS

允许来源：

- `https://ouyangxinwei.github.io`
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`

其他浏览器 Origin 返回 403。CORS 不是身份认证；真正访问仍需通过 Basic 凭据验证。

### 1.6 IP 限流

新增技术表 `company_api_rate_limits`，它只存放 IP 限流技术数据，不存储客户、项目或交易数据，不改变“一张业务主表”的设计。

- 每个来源 IP 每 60 秒最多 30 次请求。
- 只信任 Supabase 边缘代理提供的 `cf-connecting-ip`；缺失时统一使用 unknown 桶，不采信可伪造的 `x-forwarded-for`。
- 使用服务端密钥对 IP 做 HMAC-SHA256，数据库只存哈希，不保存原始 IP。
- 使用原子 UPSERT 计数，适用于多个 Edge Function 实例。
- 仅 service_role 可执行限流 RPC，客户端无表访问权限。
- 过期记录通过低频请求顺带清理。
- 不锁定账号，不会因错误密码永久锁死 `oooo`。

限流迁移版本：`20261120032938_company_api_rate_limit_stage_1c`。

---

## 2. 部署状态

- `company-api` 已部署到慢慢计划 Supabase 项目。
- Supabase 返回 Function 状态 `ACTIVE`，部署版本 v2。
- `verify_jwt=false` 是有意设置：现有账号不是 Supabase Auth JWT，因此函数内部强制执行 Basic 凭据验证。
- Edge Function 从平台默认环境变量读取 `SUPABASE_SECRET_KEYS` 或旧式 `SUPABASE_SERVICE_ROLE_KEY`。服务端密钥没有写入 Git 仓库或浏览器代码。
- 仓库同时维护 `supabase/config.toml`，明确记录该函数的 JWT 网关配置。

函数地址：

`https://kopvznygsqsheibsjjvv.supabase.co/functions/v1/company-api`

## 3. 当前验证边界

已确认：

- 限流表和 RPC 已创建。
- 限流 RPC 不允许 anon 执行，仅允许 service_role 执行。
- Edge Function 部署成功，平台状态 ACTIVE，v2 已读取回查。
- 六个数据库 RPC 的权限和基础 SQL CRUD 已在阶段 1-B 验证。

尚未完成：

- 当前聊天环境没有提供用户真实密码，也不会要求用户把密码发送到聊天中，因此没有执行真实账号下的客户创建/读取/更新/删除端到端操作。
- 当前连接工具可部署和读取 Function，但不提供携带用户 Basic 凭据的 HTTP 调用动作；外部 HTTP 访问工具也无法直接访问该 Supabase Function URL。因此不能把 CRUD 端到端标记为已通过。
- 前端尚未接入 API；GitHub Pages 没有因本阶段更新。

真实凭据 CRUD 验证将在前端接入时，通过用户在自己的浏览器登录后完成。先用错误密码检查 401，再创建一个临时测试客户，执行读取、更新、删除并确认清理。

## 4. 后续

下一阶段接入前端公司网站工作区，先实现客户列表、客户详情、新建/编辑/删除，并让登录凭据仅在内存中使用。之后再进入私有 Storage 文件上传/下载。
