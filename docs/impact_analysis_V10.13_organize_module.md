# V10.13 整理模块影响分析

## 影响范围
- index.html：新增模块切换、模块状态装载、模块专属列表显示、备份与云端分区合并。
- i18n.js：增加整理模块中文、英文、日文文案。
- sw.js：更新缓存版本。
- README、功能说明、技术手册、部署说明和三语 CHANGELOG：补充 V10.13 记录。

## 本地数据
- 原计划键 personal-planner:v1 不变。
- 新增 personal-organizer:v1。
- 两者仍采用 schemaVersion 1 的兼容状态形状，但各自独立存储。
- 计划旧数据不迁移、不重写；整理首次使用时创建五个默认分类。

## 云端数据
- 复用既有 planner_cloud_data JSONB 单记录及 RPC。
- 保持根级 schemaVersion、plans、categories、completions、trash 结构，新增 organizer 子对象。
- 既有 planner_put_data SQL 校验根级字段，允许额外 JSONB 属性，因此本版本无需 SQL 迁移。
- 上传前先获取当前云端快照，更新当前模块并保留另一模块；避免两套数据互相覆盖。
- 旧快照无 organizer 字段时按“整理尚未上传”处理。

## 风险与控制
1. 并发设备同时上传可能发生最后写入者覆盖：现有系统本来就是手动整份快照同步，本版本在每次上传前先读取并合并，减少模块间覆盖，但不是数据库事务级并发锁。
2. 老版本网页若在 V10.13 之后继续上传计划，会覆盖云端 organizer 字段。建议整理模块启用后，所有设备都刷新至 V10.13 再进行云端上传。
3. 旧版客户端的计划下载忽略 organizer 字段，不会污染本地计划数据。
4. 整理内部 period 固定 daily，只用于兼容现有通用数据校验，界面不暴露周期。
5. 尚未进行真实 Android PWA 与 Supabase 线上 E2E 验证，不能将静态检查描述为端到端通过。

## 数据库
无表结构变更、无 SQL migration。
