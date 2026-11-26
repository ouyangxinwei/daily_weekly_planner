# GitHub 仓库管理模块

## 1. 目标与范围

独立维护个人 GitHub 仓库目录，记录仓库用途、进度、优先级、技术栈、特殊标记和备注。模块不创建、修改或删除 GitHub 上的真实仓库。

## 2. 当前状态

- 版本：V10.68.0。
- 开发分支：development。
- V10.67 本地管理 UI 已有；V10.68 已增加私有云端数据层、认证 API 和前端接入代码。
- **当前仅提交 development：SQL migration 未应用，company-api Edge Function 未部署，Pages 未部署；线上云端功能尚不可用。**
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
- 本阶段未应用 migration、未部署 Edge Function、未合并 main、未部署 Pages。
- 后续需在用户明确授权后应用 migration、部署 company-api，再进行登录、导入 16 条、刷新读取、CRUD、重复导入、取消导入、导出和未登录拒绝访问测试。
