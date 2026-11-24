# Phase 3-B-A：客户、项目、任务与跟进附件管理（V10.59.0）

## 目标

把 Phase 3-A 已完成并在生产部署的私有附件能力扩展到客户、项目、任务和业务跟进记录。用户可在相应业务记录入口打开统一附件窗口，完成上传、查看、下载和删除。

## 实施范围

- 客户卡片：新增「附件」入口。
- 项目列表：新增附件入口。
- 任务列表：新增附件入口。
- 业务跟进列表：新增附件入口。
- 交易和业务文档：继续使用 Phase 3-A 已有附件入口，不重复实现。
- 界面支持简体中文、英文和日文。

## 技术实现

- 复用 `company-records-workspace.js` 内现有 `openAttachments(record)`，通过 `window.CompanyRecords.openAttachments` 暴露受控入口。
- 客户入口由 `company-website.js` 调用；项目、任务和跟进入口由 `company-business.js` 调用。
- 文件列表、上传、下载、删除继续走现有 `company-api v6`：
  - `POST /files/upload-url`
  - 浏览器向短时签名 URL 直接 PUT
  - `POST /files` 确认元数据
  - `GET /files?parent_record_id=`
  - `GET /files/:id/download-url`
  - `DELETE /files/:id`
  - 上传确认失败时使用 `POST /files/abort` 清理未登记对象
- 后端现有 `ATTACHABLE_RECORD_TYPES` 已允许 customer/project/task/follow_up；无需扩展 API 端点。
- 文件继续存储于私有 Bucket `company-documents`，单文件最大 10 MiB；不创建公开 URL，不向浏览器暴露服务端密钥。
- 签名 URL 只在当前操作期间使用，不写入 LocalStorage、日志或业务记录。

## 数据与安全影响

- 不新增数据库表或字段。
- 不修改 RLS、Storage policy、认证流程、company-api 版本或生产配置。
- 附件元数据仍以 `record_type='file'` 存储于 `company_records`，`parent_record_id` 指向所属客户、项目、任务或跟进。
- 既有删除保护继续生效：有附件的业务记录不能直接删除；先删除附件再删除记录。
- 不修改计划、工作、外语、整理、成绩、未来或云端快照数据。

## 验证

- `node --check`：相关前端模块与验证脚本。
- `node scripts/validate-v10.59.mjs`：版本、三语入口、四种业务记录入口、既有签名文件 API 和 10 MiB 限制静态契约。
- GitHub Actions：验证 workflow 纳入 V10.59 检查。
- 本阶段不启用或运行 Nightly Playwright；真实生产浏览器验收由用户在部署后完成，不把未执行的浏览器验收记为通过。

## 交付状态

- 目标版本：V10.59.0。
- 生产 API / Storage：复用已部署的 company-api v6 与私有 Bucket，无需后端部署或数据库迁移。
- Pages：以本阶段 PR 合并后的 GitHub Pages build/deploy Actions 为准。
- 用户验收：部署后待用户真实浏览器确认。
