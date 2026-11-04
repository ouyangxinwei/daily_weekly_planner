# V10.14 影响分析

## 高影响区域
- index.html：四模块切换、状态管理、列表渲染、JSON 导入导出、Supabase 分区和分类迁移。
- i18n.js：新增工作、外语学习和分类／状态文案。
- sw.js：缓存名更新。
- README、CHANGELOG、技术手册及验收文档：同步版本信息。

## 数据兼容
- Plan 原键 personal-planner:v1 不变；只迁移 category=工作 的记录到未分类。
- Work/Language 新增独立键；Organize 继续使用 personal-organizer:v1。
- schemaVersion 仍为 1；计划旧备份兼容。
- Supabase 继续使用现有 planner_get_data / planner_put_data；保留旧 organizer 云端分区并新增 work 和 language 分区。

## 风险与控制
- 分类迁移采用候选状态保存成功后才替换内存状态；失败保留旧数据并显示错误。
- 云端上传前读取远端快照，仅替换当前分区。
- Work 状态采用稳定模块 completion key，避免日期变化导致完成状态重置。
- JSON 导入先校验 moduleType 和结构；失败不覆盖当前数据。
- 不执行 SQL 迁移，不改登录认证，不重构现有引擎。

## 测试边界
自动化静态检查不代表真实浏览器、Supabase 线上端到端或 Android PWA 安装已通过；未执行项必须标记未执行。
