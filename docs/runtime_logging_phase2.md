# V10.17 运行日志查看页面（Phase 2）

## 页面入口
主界面顶部「运行日志」按钮打开独立日志窗口。该页面读取 `window.AppLogger.list()`，不读取或修改四个模块业务数据。

## 功能
- 总览：日志总数、ERROR、WARN、最近错误时间、日志存储状态。
- 筛选：ERROR/WARN/INFO/DEBUG、模块、开始日期、结束日期。
- 搜索：功能名、函数名、模块、日志消息和脱敏详情。
- 列表：按时间倒序显示等级、时间、函数、模块、阶段、结果和消息。
- 详情：显示时间、等级、模块、函数、阶段、结果、耗时、版本、Execution ID、Span ID、Parent Span ID、消息、错误详情及脱敏数据。
- 执行链路：根据 Execution ID 重新查询全部相关记录，按时间排序显示，不受当前列表筛选结果限制。
- 导出：导出当前筛选结果为 JSON 或 UTF-8 CSV。
- 管理：手动刷新、DEBUG 开关、清空全部日志（二次确认）。
- 响应式：窄屏改为单列过滤与详情布局。

## 数据与安全
- 日志数据库仍为 `manman-planner-runtime-logs`，由 `logger.js` 管理。
- 只保存当前设备；不发起日志云端上传。
- 30 天保留策略与约 10,000 条容量保护沿用 Phase 1。
- JSON/CSV 只导出 Logger 已脱敏的记录。
- 所有日志文本通过 DOM `textContent` 创建，不把日志内容作为 HTML 执行。
- 清空日志不会触碰业务 LocalStorage、Supabase 或备份数据。

## 验收边界
Phase 2 提供查看和管理界面；四模块业务函数的完整 START/END 覆盖属于 Phase 3，数据/云端专项追踪与健康检查属于 Phase 4。
