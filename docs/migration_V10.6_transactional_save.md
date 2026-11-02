# V10.6 数据迁移说明

本版本不改变任何持久化字段，不改变 JSON 备份结构，不改变 Supabase JSONB 数据结构，`schemaVersion` 仍为 1。

无需执行 SQL、数据转换或旧备份升级。部署时更新 `index.html`、`sw.js` 及文档即可。浏览器会按新的 Service Worker 缓存名下载 V10.6 资源。