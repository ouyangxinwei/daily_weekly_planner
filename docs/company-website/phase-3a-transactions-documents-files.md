# 阶段 3-A：交易收支、业务文档与私有附件（V10.57.0，已验收）

> 本阶段补齐阶段 1-A 设计中一直未实施的三种记录类型：`transaction`（交易）、`document`（业务文档）和 `file`（附件元数据），并首次启用私有 Storage。

## 1. 目标与范围

| 能力 | 内容 |
|---|---|
| 交易收支 | 收入/支出、金额、币种（JPY/CNY/USD）、状态（预计/已完成/已取消）、交易日期、类别、备注；可选关联客户和项目 |
| 业务文档 | 报价单、合同、发票、订单、收据、其他；文档编号、状态（草稿/已发出/已完成/已作废）、日期、有效期/到期日、备注；可选关联客户和项目 |
| 私有附件 | 交易和文档均可上传、列出、下载、删除附件；文件保存在私有 Bucket `company-documents` |
| 统计 | 交易页按当前筛选后的**全部**记录、按币种分别汇总已完成收入/支出/净额和预计收支；不做汇率换算，已取消交易不计入 |

不在本阶段范围：汇率换算和统一财务报表、PDF 自动生成、电子签章、OCR、附件版本管理、客户/项目/任务/跟进上的附件入口（API 已允许，界面暂未开放）。

## 2. 数据设计（沿用 `company_records`，无表结构变更）

| 记录 | 主要字段 |
|---|---|
| transaction | `title`、`status`、`amount`（NUMERIC 原值）、`currency`、`record_date`（交易日期）、`data.direction`（income/expense）、`data.category`、`data.notes` |
| document | `title`、`status`、`record_date`（日期）、`due_date`（有效期/到期日）、`data.document_type`、`data.document_number`、`data.notes` |
| file | `title`=原始文件名、`status=stored`、`parent_record_id`=所属业务记录、`data.file = { bucket, path, fileName, mimeType, fileSize, uploadedAt }` |

关联规则沿用业务跟进的模式：

- `parent_record_id` = 关联项目，否则关联客户，否则为空；同时关联项目和客户时 `related_record_ids = [customer_id]`。
- `data.customer_id`、`data.project_id`、`data.project_title` 冗余保存，便于筛选和显示。
- 因此数据库既有的删除保护自动生效：客户或项目仍被交易/文档引用时不能删除；交易或文档仍有附件时不能删除（界面会先提示“请先删除附件”）。

金额以字符串传输并按 6 位小数的整数微单位（BigInt）汇总，避免 `0.1 + 0.2` 之类的浮点误差。

## 3. 私有 Storage

迁移：`supabase/migrations/20261121090000_company_documents_storage_stage_3a.sql`

- Bucket `company-documents`：`public = false`，单文件上限 10 MB，MIME 允许列表：PDF、PNG、JPEG、WebP、纯文本、CSV、Word、Excel、PowerPoint（doc/docx/xls/xlsx/ppt/pptx）。
- **不创建任何 `storage.objects` 策略**：anon/authenticated 无法直接读写；只有 `company-api` 以服务端密钥签发单对象签名 URL。
- 对象路径由服务端生成：`<所属记录 id>/<随机 UUID>`；原始文件名只作为元数据保存。

## 4. company-api v6 新增与变更

| 方法与路径 | 说明 |
|---|---|
| `POST /files/upload-url` | 校验账号、文件名、MIME、大小（≤10 MB）和所属记录（customer/project/task/follow_up/transaction/document），生成路径并返回短时签名上传 URL |
| `POST /files` | 上传完成后调用；校验路径属于该记录，用 Storage list 确认对象存在且大小/类型一致，再创建 `record_type='file'` 元数据。元数据写入失败时删除对象，避免孤儿文件 |
| `GET /files?parent_record_id=` | 列出某条记录的附件 |
| `GET /files/:id/download-url` | 签发 300 秒签名下载 URL（带 `download=原始文件名`） |
| `DELETE /files/:id` | 先删 Storage 对象，成功后再删元数据；Storage 删除失败时保留元数据并返回可重试错误 |

同时：

- `POST /records` 不再允许直接创建 `file`；`PATCH`/`DELETE /records/:id` 对 file 记录返回 `FILE_ENDPOINT_REQUIRED`，附件只能经 `/files` 管理。
- 交易：状态必须为 planned/completed/cancelled，金额必须大于 0 且小于 10^14，`data.direction` 必须为 income/expense。
- 文档：状态必须为 draft/issued/completed/void，`data.document_type` 必须为允许值。
- 签名 URL 不写入日志、LocalStorage 或业务记录；前端只接受以本项目 `/storage/v1/` 开头的签名 URL。

## 5. 前端实现

- `company-records-rules.js`：纯函数（文件类型/大小校验、精确金额解析与汇总、筛选、排序、关联字段生成），由 Node 验证脚本直接导入。
- `company-records-workspace.js`：在公司工作区导航中追加「交易收支」「业务文档」两个标签，独立面板、编辑窗口和附件窗口；中、英、日三语；桌面/移动端布局。
- `company-business.js` 的改动仅限：切换标签时广播 `company-business-tab-change` 事件；`loadActive` 只处理项目/任务/跟进；语言切换不覆盖扩展标签文字。
- 上传流程：浏览器校验 → `POST /files/upload-url` → 直接 `PUT` 到签名上传 URL（只带公开 apikey，不带 Authorization）→ `POST /files` 确认。
- 由于 Windows 常把 `.csv` 报告为 `application/vnd.ms-excel`，前端按扩展名优先确定 MIME，保证声明类型、Storage 内容类型与服务端校验一致。

## 6. 验证

- `scripts/validate-v10.56.mjs`（已加入 GitHub Actions 验证工作流）：文件类型/大小边界、金额精度（含 0.1+0.2）、按币种汇总、筛选与排序、关联字段；以及迁移、Edge Function 路由和安全约束、前端接线、版本与 Service Worker 的静态契约。
- 既有 20 个验证脚本全部通过，未发现回归。
- `tests/e2e/company-records.spec.js`：使用内存模拟的 company-api 与 Storage，覆盖交易新增/校验/编辑/删除、币种汇总与筛选、文档新增、附件类型拒绝、上传/下载/删除、有附件时禁止删除文档，以及返回项目标签后既有面板正常。本地（系统 Chrome，模拟 API）通过。
- 既有 E2E 用例 `company-business`、`company-navigation`、`company-task-due-date` 在本地失败；在未修改的 V10.54.0 上运行结果相同，属既有问题，不是本阶段引入的回归，后续需单独排查。

## 7. 部署状态（2026-11-21，后端部署更新）

| 项目 | 状态 |
|---|---|
| 代码 | 已提交到 `main`（本地提交，见 Git 历史） |
| 数据库迁移（Storage Bucket） | **已执行并核验**：migration `20261121020047`；Bucket 私有、10 MiB、12 种 MIME 类型 |
| Edge Function `company-api` v6 | **已部署并核验 ACTIVE，版本 6，verify_jwt=false，函数内部执行 Basic 认证** |
| GitHub Pages 前端 | V10.57.0 已由用户在生产入口完成真实浏览器验收 |
| 用户真实浏览器验收 | **2026-11-21 用户确认验收 OK；Phase 3-A 正式完成** |

后端已通过 Supabase 管理接口完成迁移与 Edge Function 部署。部署证据：Bucket 查询确认 `public=false`、`file_size_limit=10485760`、12 个 MIME 类型；Storage `pg_policies` 查询返回空；Edge Function 列表显示 `company-api` ACTIVE version 6；生产业务记录类型数量在部署前后保持 customer=1、follow_up=1、project=2、task=1，未产生交易、文档或附件测试数据。

```bash
supabase link --project-ref kopvznygsqsheibsjjvv
supabase db push
supabase functions deploy company-api --no-verify-jwt
```

（也可在 Supabase SQL Editor 执行上述迁移文件，并在控制台部署 `supabase/functions/company-api/index.ts`。）

**验收结果：** 用户于 2026-11-21 确认生产环境验收 OK，Phase 3-A 正式完成。日常使用中仍建议关注附件上传失败、签名 URL 过期和大文件网络中断等边界情况。Supabase Security Advisors 仍提示现有自定义登录模式下 `planner_diary_*`、`planner_login`、`planner_get_data`、`planner_put_data` 等 SECURITY DEFINER RPC 可由 anon/authenticated 调用（函数内部自行验证密码），此为现有认证架构的安全提示，不是本次 Storage 迁移新增的权限策略。

## 8. 验收清单（部署后）

1. 新增收入和支出交易（三种币种各一笔），刷新后金额、币种、状态、关联客户/项目保持不变。
2. 汇总按币种分别显示，已取消交易不计入；筛选后汇总随之变化。
3. 金额为 0、负数或超过 6 位小数时被拒绝。
4. 新增合同/发票等文档；编号、日期、状态、关联正确。
5. 上传 PDF 和图片附件；上传 .exe 或超过 10 MB 的文件被拒绝。
6. 下载附件得到原始文件名；5 分钟后旧下载链接失效。
7. Storage 中对象不能通过 public URL 访问。
8. 有附件的文档不能删除；删除附件后可删除文档；删除附件后 Storage 对象也被删除。
9. 被交易或文档关联的客户/项目不能删除。
10. 中、英、日界面与移动端布局正常；Phase 1/2 既有功能无回归。
