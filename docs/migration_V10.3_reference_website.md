# V10.3 数据库迁移说明

**无需执行 Supabase SQL 迁移。**

原因：当前系统把全部计划对象作为 JSONB 数据快照传入现有 `planner_put_data` RPC；下载时通过 `planner_get_data` 取回。`referenceUrl` 是计划 JSON 对象中的可选字符串，不需要新增数据库列、表或 RPC。部署 V10.3 时更新项目文件即可。旧计划没有该字段时，前端会自动按空值兼容。
