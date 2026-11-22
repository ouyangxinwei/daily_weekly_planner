# 技术手册

本文档描述当前系统的技术边界和关键实现入口。历史版本实现细节及当时的验收状态见 [开发历史档案](development-history.md)；运行日志专项技术设计见 [运行日志设计](runtime-logging.md)。

## 1. 应用结构

- `index.html`：应用入口、主要页面结构及模块脚本加载。
- `i18n.js`：主应用中英日界面文案。
- 模块脚本与样式：按功能拆分为独立 JS/CSS 文件（例如天气、外语学习工作区、公司网站工作区）。
- `sw.js`：Service Worker 与静态资源缓存策略。
- `manifest.webmanifest`、`icon.svg`：PWA 元数据与图标。
- `logger.js`、`runtime-logs.js`、`health-check.js`：运行日志、日志界面和健康检查。

项目采用原生 HTML、CSS、JavaScript，不依赖前端打包流程作为运行前提。

## 2. 计划模块数据

计划、工作、外语任务、整理、成绩、未来等模块使用独立数据分区。主要本地键如下：

| 模块 | LocalStorage key |
|---|---|
| 计划 | `personal-planner:v1` |
| 工作 | `personal-work:v1` |
| 外语任务 | `personal-language:v1` |
| 整理 | `personal-organizer:v1` |
| 成绩 | `personal-results:v1` |
| 未来 | `personal-future:v1` |

各模块复用部分列表和编辑引擎，但数据、分类、归档、回收站、JSON 备份和云端分区按模块隔离。不要因模块共用 UI 而合并存储键。

## 3. Supabase 账号与云端快照

- 计划系统沿用自定义数据库账号校验及 RPC。
- 主要 RPC：`planner_login`、`planner_get_data`、`planner_put_data`。
- 浏览器端只使用公开客户端配置，不得使用 `service_role`。
- 云端快照按模块分区；单模块同步必须保留其他模块分区。
- 上传/下载属于覆盖型同步，不是实时双向合并；执行前应阅读界面确认提示并保留 JSON 备份。
- 初始化 SQL：`supabase-setup.sql`；历史数据库迁移 SQL 保持为独立脚本，不要把可执行 SQL 并入 Markdown 档案。

认证设计细节见 [数据库认证设计](database_auth_design_document.md)。

## 4. 外语学习工作区

- 独立于计划工作区内的外语任务列表。
- 使用独立 LocalStorage 数据键及独立 schemaVersion。
- 支持独立 JSON 导入/导出及兼容迁移。
- 不参与计划模块的 Supabase 云端快照与四模块整体备份。

三语说明：[中文](language-learning-workspace.md) · [English](language-learning-workspace.en.md) · [日本語](language-learning-workspace.ja.md)。

## 5. 个人公司网站

- 前端入口和资源：`company-website.js`、`company-website.css`、`company-business.js`、`company-business.css`，以及 V10.56.0 的 `company-records-rules.js`（纯规则）和 `company-records-workspace.js`（交易/文档/附件界面）。V10.58.0 新增 `company-record-loader.js`：公司业务记录的完整分页读取（total 一致、无空页/短页、最终数量等于 total，否则报错）和短时缓存（进入页面 15 秒、页面内筛选/翻页 60 秒、刷新重读、写入后清空），所有需要全量数据的地方都经由它读取。
- 后端：Supabase Edge Function `company-api`。
- 业务表：`company_records`，通过 `record_type` 区分 customer、project、task、follow_up 等对象；任务通过 `parent_record_id` 关联项目，`due_date` 保存截止日期。V10.45.0 使用 `data.progress_mode`（manual/auto）、`data.manual_progress_percent`、`data.progress_percent` 及自动统计字段；数据库触发器在任务变化时更新自动进度。
- 前端复用当前登录会话，通过 HTTPS Basic Authorization 请求 API；不得把密码持久化到 LocalStorage，也不得暴露 service-role/secret key。
- 客户、项目、项目任务和跟进记录与计划模块 LocalStorage、云端快照隔离。
- 项目删除受下游关联保护，不应擅自改成级联删除。
- 交易（`transaction`）：`amount`/`currency` 原值、`record_date`、`data.direction`（income/expense）；文档（`document`）：`data.document_type`、`data.document_number`、`record_date`、`due_date`。两者的 `parent_record_id` 为关联项目或客户，与业务跟进相同。
- 附件（`file`）：元数据在 `company_records`（`parent_record_id` 指向所属记录，`data.file` 保存 bucket/path/fileName/mimeType/fileSize/uploadedAt），内容在私有 Bucket `company-documents`。只能通过 `company-api` 的 `/files` 端点管理：`POST /files/upload-url`、`POST /files`、`GET /files?parent_record_id=`、`GET /files/:id/download-url`、`DELETE /files/:id`；`/records` 不能创建、修改或删除 file 记录。
- 签名下载 URL 有效期 300 秒，属于短期凭据，不得写入日志、LocalStorage 或业务记录。
- `supabase/migrations/20261121090000_company_documents_storage_stage_3a.sql`：创建私有 Bucket（10 MB、MIME 允许列表），不创建 `storage.objects` 客户端策略。
- `supabase/migrations/20261120065100_company_project_progress_linkage_stage_1h.sql`：增加项目进度同步触发器；触发器使用 SECURITY DEFINER、空 search_path、按 owner/project 过滤并撤销普通角色直接执行权限。

专项设计、数据库和 API 说明见 [公司网站开发文档](company-website/README.md)。

## 6. 天气服务

首页天气使用 Open-Meteo。天气缓存独立于业务模块数据，不参与 Supabase 计划快照。城市、预报字段、缓存和排序规则见 [天气看板说明](home-weather-dashboard.md)。

## 7. 运行日志与健康检查

- 日志存储在独立 IndexedDB，不上传云端。
- 日志记录必须脱敏，不得包含密码、Token、密钥、完整请求体或完整业务数据。
- 日志不可用不得阻断主要业务操作。
- 健康检查应区分检查失败与因网络/未登录导致的无法检查。
- 完整设计与阶段验收见 [runtime-logging.md](runtime-logging.md)。

## 8. 多语言、主题和缓存

- 主应用中英日界面通过 i18n 文案维护；用户输入内容保持原样。
- 主题偏好与业务数据分离。
- 任何被 Service Worker 缓存的静态资源变更，都要检查 `sw.js` 的资源列表和 cache name。
- 不要通过清除整个站点数据来解决版本更新问题，以免删除未备份的本地数据。

## 9. 版本与发布

版本声明位于根目录 `VERSION`、`package.json` 和应用版本标记等位置。正式应用版本变更时，按发布流程同步更新 CHANGELOG（三语）和 Service Worker 缓存。

文档整合不属于应用版本发布，不应为了修改 Markdown 而变更应用版本号。

