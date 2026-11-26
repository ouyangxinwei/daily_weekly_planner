# 学习会议 — V10.71

记录想参加的学习会议、讲座、研讨会和展会，支持手动录入、AI 解析助手批量导入，以及导出 `.ics` 加入 Google 日历等。独立模块，不与计划模块、备份或云端快照打通。

> **当前状态（V10.71 修订）：本地手动维护。** 云端部署后 company-api 仍返回 `NOT_FOUND`（原因待查），因此前端暂时绕过 company-api：数据保存在当前浏览器，换设备用 JSON 导出/导入。第 3 节的云端方案保留在仓库中，暂不使用。

## 1. 入口与功能

- 顶部「学习会议」按钮打开对话框（个人用户 / 管理员两种界面模式都显示）。需要先登录。
- 列表：按开始时间排序，分「即将举行」「已结束」（按结束日或开始日与今天的日本日期比较，状态不存储）。
- 新增 / 编辑 / 删除（无需联网）；每条可单独导出 `.ics`，「导出全部 .ics」导出即将举行的会议（没有时导出全部）。
- AI 解析助手：页面显示提示词（一键复制），用户连同活动信息发给 Claude 等 AI，把返回的 JSON 数组粘贴回来 → 预览 → 导入。缺少名称或开始日期、或与已有会议同名同日的条目会被跳过。

## 2. 数据

**保存位置（当前）：** 浏览器 localStorage，键名 `planner:learning_meetings`，值为会议对象的 JSON 数组。只在当前浏览器、当前设备有效，不随账号切换；清除浏览器数据会丢失。

**手动维护方法：**
- 「导出 JSON 备份」：下载 `learning-meetings-<日期>.json`（会议数组）。建议定期导出，换设备或清理浏览器前必须导出。
- 「导入 JSON 文件」：选择上述文件（或任何符合下表字段的 JSON 数组），进入预览后导入；与已有会议同名同日的条目跳过，所以重复导入是安全的。
- 也可以把 JSON 直接粘贴到 AI 解析助手里导入。

字段（云端方案中为每人一行 JSON 快照，字段相同）：

| 字段 | 说明 |
|---|---|
| `id` | `lm-…` 唯一 ID |
| `title` | 名称（必填，≤300） |
| `startDate` | 开始日期 `YYYY-MM-DD`（必填，日本日期） |
| `startTime` | `HH:MM`，空字符串 = 全天活动 |
| `endDate` | 结束日期，空 = 当天结束；不能早于开始日期 |
| `endTime` | `HH:MM`，有结束时间时必须有开始时间 |
| `location` / `cost` / `description` / `url` | 地点、费用、简介、网址（http/https） |
| `region` | `tokyo` / `yokohama` / `online` / `other` |
| `format` | `offline`（线下）/ `live`（线上直播）/ `recorded`（录播）/ `hybrid`（线上线下） |
| `reminderMinutes` | 提前提醒分钟数，0–10080，默认 15 |
| `createdAt` / `updatedAt` | ISO 时间 |

AI 返回的 snake_case 字段（`start_date` 等）和原方案的中文分类（`线下-东京`、`线上直播` 等）在导入时自动换算。

## 3. 云端后端（保留，暂不使用）

| 内容 | 文件 |
|---|---|
| 表 `learning_meetings_data`（按用户名一行，RLS 开启，禁止 anon/authenticated 直接访问，最多 1000 条）与函数 `learning_meetings_get_data` / `learning_meetings_put_data`（再次校验现有账号密码，只授权 service_role） | `supabase/migrations/20261127090000_learning_meetings_cloud.sql` |
| `GET /learning-meetings`、`PUT /learning-meetings`（请求体 `{ "meetings": [...] }`，服务端逐字段校验） | `supabase/functions/company-api/index.ts` |

**上线步骤（由负责部署的人执行）：**
1. 在生产 Supabase 执行上述 migration。
2. 重新部署 `company-api` Edge Function。
3. 实际情况（2026-11-27）：执行上述步骤后仍返回 `NOT_FOUND`，说明线上 company-api 不含 `/learning-meetings` 路由。**未完成**，原因待查，建议检查：部署的函数名是否为 `company-api`、项目是否为 `kopvznygsqsheibsjjvv`、部署的是否为 main 最新的 `index.ts`（Dashboard 的函数代码中应能搜到 `/learning-meetings`）。
4. 恢复云端：确认路由可用后，把 `learning-meetings.js` 的「local storage」段换回提交 `7d91d81` 中的 `cloudRequest` / `load` / `persist`，并先用「导出 JSON 备份」把本地数据导入云端。

## 4. `.ics` 导出规则

- 有开始时间：按日本时间换算成 UTC（`DTSTART:20261214T010000Z`），所有日历软件都能正确识别；没有结束时间时默认 1 小时，跨多天时在简介中注明「至 结束日」。
- 全天活动：`DTSTART;VALUE=DATE`，`DTEND` 为最后一天的**下一天**（规范规定结束日不计入）；起止同一天也会自动变成长度一天。
- 包含 `DTSTAMP`、稳定的 `UID`（`<id>@daily-weekly-planner`）、文本转义、按 75 字节折行（不拆分多字节字符）。
- 提醒：写入 `VALARM`。**Google 日历导入 `.ics` 时会忽略提醒**，页面上有提示；Apple 日历等会保留。
- 文件名：单条 `meeting-<名称>-<日期>.ics`，全部 `learning-meetings-<日期>.ics`。

## 5. 待测试清单（本版未执行）

本版按「优先开发、不做测试」要求，只做了语法检查、CI 静态校验和一次 `.ics` 输出的人工核对。以下内容待测试：

1. 打开「学习会议」→ 显示空列表，无报错。
2. 新增 / 编辑 / 删除，刷新重新登录后数据仍在。
2a. 导出 JSON 备份 → 在另一浏览器导入 JSON 文件 → 预览数量正确、导入后内容一致；再次导入全部跳过。
3. 表单校验：缺名称、缺开始日期、结束日期早于开始日期、只填结束时间。
4. AI 解析助手：复制提示词；粘贴示例 JSON（含 ```json 包裹、snake_case、中文分类）→ 预览数量正确 → 导入；重复导入被跳过。
5. 导出 `.ics`：在 Google 日历导入，确认时间（日本时间）、全天活动、跨多天展会、同日活动、长标题、日文地点显示正确；再用 Apple 日历确认提醒。
6. 退出登录再登录后本地数据仍在（本地模式不随账号区分）。
7. 中英日界面切换、深色 / 浅色主题、手机宽度。
8. 退出登录后对话框关闭。
9. 离线（PWA）时可以正常打开和编辑。

建议补充的自动化测试：`.ics` 生成与导入换算的单元测试、company-api 校验函数测试、对话框的 Playwright 用例。
