# 阶段 1-A：数据库、RPC 认证与私有文件存储设计

- 项目：`daily_weekly_planner`
- 模块：个人公司网站
- 文档状态：设计基线（2026-11-20）
- 对应代码基线：`main`，提交 `37993103ff3934d5f98ca121019bfc0c5aa572a3`
- Supabase 项目：慢慢计划现有项目 `kopvznygsqsheibsjjvv`
- 当前实施状态：**只完成设计，未对数据库、Storage 或 Edge Functions 执行写入**

---

## 1. 设计原则与范围

当前以个人开发练习和个人使用为主。优先做出能实际使用的版本，允许未来较大幅度调整，不提前建设复杂企业架构。

已确定的约束：

1. 复用慢慢计划当前 Supabase 项目和现有账号登录方式。
2. 第一版业务数据集中在一张主要业务表 `company_records`；客户、项目、任务、交易、文档和附件元数据均以不同记录类型保存。
3. 记录类型差异字段放入 JSONB，不为每种业务类型单独建业务表。
4. 交易保留原始金额和原始币种（JPY、CNY、USD），第一版不换算汇率、不跨币种求和。
5. 文件内容放 Supabase Storage，不放进 JSONB。
6. 第一版只支持当前个人账号；预留未来增加员工的归属字段，但不建设员工管理。
7. 不修改现有 `planner_cloud_data` 快照结构和现有计划、外语模块数据。

### 1.1 数据库现状依据

阶段 0 只读检查确认：

- `planner_credentials`：当前自定义账号凭据表。
- `planner_cloud_data`：当前慢慢计划云端 JSONB 快照。
- `planner_sync`：旧 Auth 同步相关数据。
- `planner_login`、`planner_get_data`、`planner_put_data`：现有自定义认证/同步 RPC。
- 慢慢计划 Supabase 项目当前没有 Storage Bucket，也没有 Edge Functions。
- `planner_credentials` 和 `planner_cloud_data` 已启用 RLS，普通客户端直接表权限已撤销；现有 RPC 则允许 anon/authenticated 调用并使用 SECURITY DEFINER。
- Supabase Security Advisor 对现有公开可调用 SECURITY DEFINER RPC 提示风险。新模块不复制这种公开授权方式。

---

## 2. 业务数据表：`public.company_records`

### 2.1 记录类型

第一版固定以下 `record_type`：

| record_type | 含义 | 示例 |
|---|---|---|
| `customer` | 客户 | 公司、个人客户 |
| `project` | 项目或订单 | 贸易订单、开发项目、电商运营项目 |
| `task` | 任务 | 联系客户、交付功能、处理订单 |
| `follow_up` | 跟进记录 | 电话、邮件、会议、后续联系 |
| `transaction` | 收入或支出交易 | 收款、付款、采购支出 |
| `document` | 业务文档记录 | 报价、合同、发票、订单资料 |
| `file` | 附件元数据 | PDF、图片、表格等文件 |

联系人、地址、商品信息、开发技术栈、报价明细等不另建业务表，先放在对应记录的 `data` JSONB 中。

### 2.2 业务类型

`business_type` 可为空；适用时使用：

- `trade`：贸易
- `software`：软件开发
- `ecommerce`：电商

客户、任务、跟进、交易和文档可继承所属项目的业务类型；不属于特定业务的通用客户可留空。

### 2.3 最终字段基线

| 字段 | PostgreSQL 类型 | 约束 / 用途 |
|---|---|---|
| `id` | UUID | 主键，默认 `gen_random_uuid()` |
| `owner_username` | TEXT | 非空，第一版固定归属现有账号 `oooo`；未来员工化时再迁移归属模型 |
| `record_type` | TEXT | 非空；限制为本节定义的七种类型 |
| `business_type` | TEXT | 可空；非空时只能是 trade/software/ecommerce |
| `title` | TEXT | 非空；记录名称 |
| `status` | TEXT | 可空；状态值先由前端按记录类型管理，避免数据库过早固定复杂状态机 |
| `parent_record_id` | UUID | 可空；同表自关联，表达主要父级关系 |
| `related_record_ids` | UUID[] | 非空，默认空数组；用于额外关联客户、项目等记录 |
| `amount` | NUMERIC(20,6) | 可空；交易原始金额，不使用浮点类型 |
| `currency` | TEXT | 可空；仅允许 JPY/CNY/USD |
| `record_date` | TIMESTAMPTZ | 可空；业务发生日期 |
| `due_date` | TIMESTAMPTZ | 可空；任务截止日或预计交付日期 |
| `data` | JSONB | 非空，默认空对象；记录类型的扩展字段 |
| `schema_version` | SMALLINT | 非空，默认 1；标记 JSONB 结构版本 |
| `created_at` | TIMESTAMPTZ | 非空，默认 now() |
| `updated_at` | TIMESTAMPTZ | 非空，默认 now() |

必要索引：

- `(owner_username, record_type, created_at desc)`
- `(owner_username, business_type, record_date desc)`
- `parent_record_id`
- 对 `data` 暂不默认建立 GIN 索引；出现真实查询需求后再添加。

必要约束：

- `record_type` 必须在七种记录类型中。
- `business_type` 只能是 NULL、trade、software、ecommerce。
- `currency` 只能是 NULL、JPY、CNY、USD。
- `amount` 与 `currency` 必须同时为空或同时有值。
- `record_type='transaction'` 时必须提供 `amount` 和 `currency`。
- 金额只保存原币，不在数据库触发器或 RPC 中进行汇率转换。
- `parent_record_id` 只能关联同一 owner 的记录；RPC 写入前必须检查。
- `related_record_ids` 中每个 ID 都必须属于同一 owner；由 RPC 验证，避免跨账号引用。

### 2.4 JSONB 字段约定

常用核心字段放在表列中；变化频繁的业务专属字段放入 `data`。

示例（仅说明结构，不是实际数据）：

```json
{
  "customer": {
    "country": "Japan",
    "contactName": "",
    "email": "",
    "phone": "",
    "tags": []
  },
  "project": {
    "customerId": "关联记录 UUID",
    "description": "",
    "deliveryDate": "",
    "items": []
  },
  "task": {
    "priority": "normal",
    "completedAt": null
  },
  "transaction": {
    "direction": "income",
    "paymentStatus": "unpaid",
    "counterparty": "",
    "reference": ""
  },
  "document": {
    "documentType": "quote",
    "documentNumber": "",
    "issueDate": "",
    "validUntil": ""
  },
  "file": {
    "bucket": "company-documents",
    "path": "records/<record-id>/<file-id>",
    "fileName": "quote.pdf",
    "mimeType": "application/pdf",
    "fileSize": 12345
  }
}
```

说明：

- 实际每条记录只保存对应类型所需的字段，不要求包含全部示例对象。
- `data` 中的关联 ID 必须由 RPC 验证，不信任前端传来的归属信息。
- `schema_version` 在 JSONB 字段结构发生不兼容变化时递增。
- 不在 `data` 或日志中保存密码、API Secret、签名 URL 或其他凭据。

### 2.5 记录关系约定

- 项目：`parent_record_id` 指向客户。
- 任务：`parent_record_id` 指向项目。
- 跟进：`parent_record_id` 指向客户或项目。
- 交易：`parent_record_id` 优先指向项目；客户可通过 `related_record_ids` 关联。
- 文档：`parent_record_id` 指向客户或项目。
- 文件：`parent_record_id` 指向被附件关联的业务记录；文件本身也作为 `record_type='file'` 保存。

这样保持一张业务表，同时允许一个业务记录关联多个对象。第一版不增加独立的关系表。

---

## 3. RPC 与认证安全

### 3.1 调用结构

浏览器不直接访问 `company_records`，也不直接调用有数据库写权限的 RPC。

采用以下路径：

```text
浏览器（慢慢计划现有登录）
  │  Supabase URL + publishable/anon key
  │  现有账号 username/password
  ▼
Supabase Edge Function：company-api
  │  校验请求、CORS、输入、限流
  │  使用服务端 Secret Key
  ▼
受限 company_* RPC
  │  再次校验现有账号密码
  │  校验 owner_username 和关联记录归属
  ▼
public.company_records
```

Edge Function 是服务端安全边界。浏览器现有公开 Supabase Key 只用于识别项目，不是用户身份凭据；真正身份仍由现有账号密码验证。

### 3.2 Edge Function

名称：`company-api`

职责：

- 接收浏览器的公司业务请求。
- 处理 CORS，仅允许慢慢计划正式 Pages 来源及本地开发来源。
- 校验请求体大小、字段类型和允许的操作。
- 对认证请求实施按来源 IP 的限流；不采用简单的“错误几次就锁定账号”策略，避免单人账号被恶意锁死。
- 从 Supabase Edge Function 环境读取 Secret Key。
- 调用受限 RPC 或 Storage 管理 API。
- 统一返回 JSON 错误码；不返回数据库内部堆栈和密码校验细节。
- 不记录密码、Secret Key、签名 URL 或文件内容。

因为当前登录不是 Supabase Auth JWT，第一版 Edge Function 不依赖 `auth.uid()`。部署时需明确配置函数 JWT 校验策略，并在函数内部强制执行自定义账号密码验证。关闭平台 JWT 校验不等于允许匿名业务访问。

Secret Key 只能存在 Edge Function Secrets，绝不能进入前端、GitHub Pages 文件或仓库。

### 3.3 新增 RPC 接口

所有新 RPC 均要求 `p_username`、`p_password`，在数据库函数内再次调用现有 `planner_check_password` 验证；所有读取和写入均限制 `owner_username = p_username`。

| RPC | 用途 | 主要参数 |
|---|---|---|
| `company_verify_credentials` | 验证现有账号 | username、password |
| `company_list_records` | 分页查询、筛选记录 | username、password、record_type、business_type、status、keyword、limit、offset |
| `company_get_record` | 获取单条记录 | username、password、record_id |
| `company_create_record` | 新建记录 | username、password、record_type、business_type、title、status、parent_record_id、related_record_ids、amount、currency、record_date、due_date、data |
| `company_update_record` | 更新记录 | username、password、record_id、可更新字段 |
| `company_delete_record` | 删除记录 | username、password、record_id |

接口规则：

- 列表默认按 `updated_at desc` 排序；默认每页 20 条，单页最大 100 条。
- 关键词只搜索标题和明确允许搜索的字段，不拼接动态 SQL。
- 更新采用白名单字段，禁止修改 `id`、`owner_username`、`created_at`。
- 创建时 owner 由经过验证的 username 决定，忽略客户端提交的 owner 字段。
- 删除前检查子记录；第一版采用明确的限制或受控级联策略，不做静默跨记录删除。
- 每个函数使用固定的空 `search_path`，表和函数引用全部写完整 schema。
- 业务函数可使用 `SECURITY DEFINER` 绕过表 RLS，但必须同时做到严格校验、最小权限和固定 search_path；不能只依靠函数被授权执行就认为数据已隔离。

### 3.4 数据库权限

`company_records`：

- 启用 RLS。
- 撤销 `anon`、`authenticated`、`PUBLIC` 的直接表访问权限。
- 不创建允许浏览器直接读写的宽泛策略。
- 服务端业务 RPC 执行数据库操作。

新建 `company_*` RPC：

- 撤销 `PUBLIC`、`anon`、`authenticated` 的 EXECUTE。
- 仅授予服务端 `service_role`（或当前项目对应 Secret Key 的服务角色）执行权限。
- `SECURITY DEFINER` 函数固定 `search_path = ''`，所有对象显式限定 schema。
- 函数体必须验证密码、记录 owner、关联记录 owner 和字段白名单。
- 不修改现有 `planner_login`、`planner_get_data`、`planner_put_data` 的行为和权限。

### 3.5 限流与密码处理

- 继续使用现有 bcrypt 密码摘要和现有登录账号。
- 浏览器只在内存中持有当前会话所需的账号密码，不写入 LocalStorage、IndexedDB、URL 或日志。
- Edge Function 使用 HTTPS 接收凭据；每个敏感请求都由数据库函数再次校验。
- 对认证失败按来源 IP 限流，不对账号本身实施永久或长时间锁定。
- 若实现持久化限流，可增加一张仅供安全控制使用的技术表（例如 `company_auth_rate_limits`）；它不保存客户、项目或财务业务数据，不改变“一张业务主表”的决定。
- 对外统一返回“认证失败”，不区分账号不存在或密码错误。
- 现有公开 RPC 的 Security Advisor 警告属于既有系统风险；本阶段不擅自修改旧登录流程，后续可单独评估。

---

## 4. 私有文件上传与下载

### 4.1 Bucket

新增私有 Bucket：

`company-documents`

第一版建议限制：

- Bucket 必须为 private。
- 限制单文件大小（初版建议 10 MB，实际开发时可调整）。
- MIME 类型采用允许列表：PDF、PNG、JPEG、WebP、纯文本、CSV、常见 Office 文档。
- 文件路径由服务端生成 UUID，不直接使用用户原始文件名作为对象路径。
- 原始文件名只作为元数据保存。
- 不提供 public URL，不将文件设置为公开访问。

### 4.2 文件元数据

文件元数据仍然存放在 `company_records`，使用 `record_type='file'`。

`data.file` 至少保存：

- `bucket`
- `path`
- `fileName`
- `mimeType`
- `fileSize`
- `uploadedAt`
- `parentRecordId`（如果未使用表级 parent_record_id，则仅保存一个位置，避免两处不一致）

实际二进制内容只存储在 Storage。

### 4.3 上传流程

1. 浏览器选择文件，发送文件名、MIME、大小、目标业务记录 ID 和账号凭据给 `company-api`。
2. Edge Function 验证账号、文件大小、MIME、目标记录归属。
3. 服务端生成不可预测的 UUID 文件路径。
4. 服务端使用 Secret Key 创建短时 signed upload URL。
5. 浏览器使用该 URL 上传文件，不接触 Secret Key。
6. 上传完成后通知 Edge Function。
7. Edge Function 检查 Storage 对象确实存在，再创建 `record_type='file'` 元数据记录。
8. 如果元数据保存失败，执行清理或记录待清理对象，避免孤儿文件。

### 4.4 下载流程

1. 浏览器请求下载某个 file record。
2. Edge Function 验证账号。
3. 数据库确认文件记录属于当前 owner，并读取 bucket/path。
4. 服务端创建短时 signed download URL（初版建议 5 分钟）。
5. 浏览器使用该 URL 下载文件。

签名 URL 是短期 bearer 凭据：任何持有 URL 的人在过期前都可能访问文件，因此不能写入日志、LocalStorage 或业务记录。需要撤销时，可删除或移动对象；单个签名 URL 不保证可即时撤销。

### 4.5 文件删除

- 先验证 file record 的 owner。
- 服务端删除 Storage 对象。
- 再删除 file record，或采用可恢复状态后清理。
- 若 Storage 删除失败，不删除元数据，向用户返回可重试错误。
- 不允许浏览器直接对 Storage 执行任意路径删除。

---

## 5. 数据示例与多币种规则

交易记录示例：

| title | amount | currency | data.transaction.direction |
|---|---:|---|---|
| 日本客户软件开发收入 | 100000 | JPY | income |
| 商品采购 | 5000 | CNY | expense |
| 海外客户服务费 | 1000 | USD | income |

规则：

- 金额用 NUMERIC 保存，禁止使用 REAL/DOUBLE PRECISION。
- 不将 JPY、CNY、USD 原始金额直接相加。
- 第一版不保存自动汇率，不计算本位币金额。
- 以后加入汇率时保留原始 amount/currency，不覆盖原始交易数据。

---

## 6. 实施顺序（以尽快交付为优先）

本设计确认后，按以下顺序开发，避免一次做太多基础设施：

### 1-B：数据库最小实现

1. 新增 `company_records` migration SQL。
2. 启用 RLS 并撤销客户端直接访问。
3. 新增最小 CRUD RPC。
4. 对 RPC 执行权限、跨 owner 访问和金额约束做最小 SQL 验证。
5. 暂不创建示例业务数据。

### 1-C：Edge Function 业务 API

1. 新增 `company-api`。
2. 接入现有账号密码验证。
3. 连接 CRUD RPC。
4. 配置 CORS、输入校验、限流和错误处理。
5. 前端先完成客户记录的最小 CRUD，验证整条链路。

### 1-D：文件能力

1. 创建私有 Bucket。
2. 实现 signed upload URL。
3. 实现上传完成确认和文件元数据记录。
4. 实现 signed download URL。
5. 实现安全删除。

### 1-E：进入业务页面开发

先完成客户管理，再扩展项目、任务、交易和文档。每一步尽量交付可用功能，不提前建设完整企业系统。

---

## 7. 最小测试策略

用户明确希望优先开发、测试尽量精简。采用以下最低限度测试：

1. **数据库**：创建、读取、更新、删除各验证一次；再验证 anon/authenticated 不能直接读写表。
2. **认证**：正确密码通过、错误密码拒绝；跨 owner 记录 ID 必须拒绝。
3. **金额**：JPY/CNY/USD 各保存一笔，确认金额和币种原样返回；不做汇率计算。
4. **文件**：上传一个小 PDF，验证私有对象不能通过 public URL 访问、签名下载可用、过期 URL 不再可用。
5. **前端**：只做客户 CRUD 的一条 Playwright smoke 流程；不启动完整回归矩阵，除非发现回归问题。

不为纯文档变更运行完整 Playwright 套件。实际数据库迁移完成后，至少执行一条 schema 检查 SQL 和最小 CRUD 验证。

---

## 8. 明确不做

第一版不做：

- Supabase Auth 迁移。
- 员工、多角色、组织和部门系统。
- 多币种汇率转换和统一财务报表。
- 独立客户表、项目表、任务表、交易表、文档表。
- 复杂关系表、审批流程、审计平台。
- 公开文件链接。
- PDF 自动生成、电子签章。
- 库存、仓储、物流、电商平台自动同步。

---

## 9. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-11-20 | 业务数据先使用一张 `company_records` 主表 | 个人开发练习，需求变化可能较大，优先保持灵活 |
| 2026-11-20 | 业务差异字段使用 JSONB，并带 `schema_version` | 减少早期结构调整成本 |
| 2026-11-20 | 交易保存 NUMERIC 原始金额和 JPY/CNY/USD 原始币种 | 避免浮点精度问题和跨币种误加总 |
| 2026-11-20 | 沿用现有自定义登录，不迁移 Supabase Auth | 避免影响现有慢慢计划认证 |
| 2026-11-20 | 新业务 RPC 仅允许服务端角色执行 | 避免复制现有公开 SECURITY DEFINER RPC 的暴露面 |
| 2026-11-20 | 文件使用私有 Bucket 和短时签名 URL | 合同、报价和发票不能公开访问 |
| 2026-11-20 | 开发优先，采用最小关键路径测试 | 尽快形成可用功能，同时保留关键安全验证 |

---

## 10. 参考资料

以下为设计时核对的 Supabase 官方文档：

- [Database Functions 与 SECURITY DEFINER / EXECUTE 权限](https://supabase.com/docs/guides/database/functions)
- [Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Private Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Signed Download URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- [Signed Upload URLs](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

> 本文是阶段 1-A 的设计基线，不是已经执行的 SQL 或已部署的服务。任何数据库、Storage、Edge Function 的实际变更都必须在后续阶段单独提交迁移文件并记录验证结果。
