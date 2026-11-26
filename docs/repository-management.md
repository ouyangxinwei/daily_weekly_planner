# GitHub 仓库管理模块

## 1. 目标与范围

独立维护个人 GitHub 仓库目录，记录仓库用途、进度、优先级、技术栈、特殊标记和备注。模块不创建、修改或删除 GitHub 上的真实仓库。

## 2. 当前状态

- 版本：V10.70.0（PR #103 已合并 development；Actions run `45740957853` 成功；main 合并和 Pages 部署待完成）。
- 开发分支：development。
- V10.67 本地管理 UI 已有；V10.68 已增加私有云端数据层、认证 API 和前端接入代码。
- **Supabase migration、company-api v10 和 GitHub Pages V10.68 均已部署；GitHub Actions 验证通过，真实浏览器验收尚未完成。**
- 初始导入数据为 16 个仓库；名称、URL 和默认分支来自仓库清单。分类为暂定建议，技术栈留空，状态为「待整理」，均标记「待核实」。
- 这份个人仓库清单不保存在公开应用仓库，也不由页面自动下载 seed；应由用户本地持有 JSON 并主动导入。

## 3. 数据字段

| 字段 | 类型 | 用途 |
|---|---|---|
| id | string | 稳定 ID，默认 github:<owner>/<repo> |
| name / url | string | 仓库名称和 HTTPS GitHub 地址 |
| defaultBranch | string | 默认分支 |
| category | string | 用户维护的分类 |
| techStack | string[] | 技术栈标签 |
| status | enum | 待整理、进行中、已暂停、已完成、未完成 |
| priority | enum | 高、中、低 |
| tags | string[] | 待部署、待测试、待核实、未完成等标记 |
| notes | string | 现象、原因、影响和下一步处理 |
| createdAt / updatedAt | ISO datetime | 创建和更新时间 |

## 4. 私有云端存储与认证

- 专用表：public.repository_cloud_data，以现有账号用户名为主键，保存 repositories JSON 数组和 updated_at。
- 认证复用现有慢慢计划单账号登录：前端从 PlannerCompanyContext.getAuth() 获取当前登录态，使用 Basic Authorization 调用 company-api。
- API：GET /repositories 读取；PUT /repositories 保存完整列表。
- Edge Function 通过现有 company_verify_credentials 验证账号，再调用 repository_get_data / repository_put_data RPC。
- 数据表启用 RLS，撤销 public、anon、authenticated 的直接权限；RPC 执行权限仅授予 service_role。前端不持有 service-role key。
- 不将仓库资料放入 planner_cloud_data、计划备份或七模块整体备份。
- 前端不将仓库资料或密码写入 LocalStorage。每次打开管理窗口重新读取云端；登录状态变化或关闭窗口时清除内存中的资料。
- 首次云端无记录时显示空列表，由用户导入 JSON；不会自动上传 seed。
- 原浏览器 LocalStorage 旧记录不会自动迁移。若旧版本已经维护过资料，需先从旧版本导出 JSON，再在云端版本导入。

## 5. JSON 导入与导出

Envelope 保持兼容 V10.67：

```json
{
  "type": "oooo.repository-management",
  "version": 1,
  "exportedAt": "ISO-8601",
  "repositories": []
}
```

- 导入校验 type、version、字段类型、GitHub HTTPS URL 和文件内部重复 ID/URL。
- 先展示新增、更新、跳过预览；只有用户确认后才提交云端。
- 合并按 ID 或 GitHub URL 匹配；文件未包含的云端条目保留。
- 云端保存失败时不更新前端内存、不显示成功；取消或校验失败不修改云端。
- 导出当前完整仓库列表和 schema 元数据，可用于备份。

## 6. CRUD 与「未完成」事项

- 新增、编辑、删除均提交完整列表至专用云端 API，服务端成功后才更新前端状态。
- 删除只删除管理资料，不删除 GitHub 仓库。
- 暂时卡住的事项添加「未完成」标记，在备注中记录现象、原因（未知时写原因待查）、影响和下一步动作；不阻塞其他独立工作。

## 7. 安全、限制与后续验收

- API 服务端最多接受 1000 条记录，单次 JSON 请求最大 1 MiB；字段长度和数组数量均有服务端校验。
- 认证失败、网络错误、限流或云端写入失败时不得提示保存成功。
- migration 已应用；company-api v10 已部署；V10.68 已合并 main，Pages 部署 Run `45732359753` 与验证 Run `45732358997` 均成功。
- 后续进行登录、导入 16 条、刷新读取、CRUD、重复导入、取消导入、导出和未登录拒绝访问测试。


## 8. V10.70 批量清空与 GitHub 全量提取

### 一键清空
- 工具栏增加「清空清单」按钮；清单为空时禁用。
- 二次确认提示当前记录数量、云端清除范围、无法在应用内撤销，以及 GitHub 仓库和原始 JSON 备份不会被删除。
- 取消不发送云端请求；确认后仅调用现有 `PUT /repositories`，提交空的 `repositories: []` 快照。
- 只有云端写入成功后才更新前端状态；失败时保留当前列表并显示错误。
- 清空前建议使用现有「导出 JSON」保存备份。清空只是把当前账号的仓库数组替换为空数组，不删除 Supabase 表行、planner 数据、公司业务记录、GitHub 真实仓库或备份文件。

### GitHub 全量仓库提取
- 工具栏提供「GitHub 提取提示词」入口，打开 [全量仓库提取提示词](github-repository-export-prompt.md)。
- 提示词要求 AI 使用已授权 GitHub 连接器逐页读取当前账号实际可访问的仓库，涵盖个人/组织/协作者权限下的 Public、Private、Archived 和 Fork 仓库；报告权限盲区，不得声称未读取的仓库已完整提取。
- 输出严格使用现有 `oooo.repository-management` v1 envelope 和 12 个允许字段，可直接通过现有 JSON 导入预览与合并，不改变 Supabase API 或数据库 schema。
- GitHub 元数据、README 摘要、项目用途、技术栈、部署信息等写入 `notes`；技术栈放入 `techStack`。提示词禁止 GitHub 写操作及秘密信息输出。
- 当前导入器单文件最多 1000 条、company-api 单次保存请求最多 1 MiB；超出时提示词要求拆分多个兼容 JSON 文件，逐个导入。
- 应用本身不持有 GitHub Token，也不绕过 GitHub 连接器权限。私有仓库读取取决于用户所选 AI 工具的 GitHub 授权范围。
- 本次没有 Supabase migration 或 company-api 部署要求；复用现有 GET/PUT API。
- 自动化覆盖取消确认不写云端、确认后只提交空仓库数组；生产账号的破坏性清空不作为 E2E 测试步骤，Playwright 使用 mock API 数据。
