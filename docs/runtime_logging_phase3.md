# V10.18 四模块重要操作追踪（Phase 3）

## 接入方式
在主应用内通过函数包装器为现有业务函数添加追踪。包装器仅负责建立 Logger span、调用原函数并记录终态；不替换业务算法，不改变原函数返回值和异常传播行为。Logger 不可用时直接调用原函数。

## 覆盖清单
- 四模块：统一使用当前 activeModule 标记 plan / work / language / organize。
- 模块与本地数据：load、loadModuleState、save、switchModule。
- CRUD 与状态：quickAddPlan、openDialog、closeDialog、commitState、deletePlan、archivePlan、removePlans、clearCurrentTab、clearCompletedInCurrentTab。
- 回收站与撤销：trashPlans、restoreTrashItem、cleanExpiredTrash、undoLastAction。
- 分类：confirmDeleteCategory、requestDeleteCategory。
- 备份：exportBackup、validateBackup。
- 其他重要入口：migrateLegacyPlanWorkCategory、requestNotificationPermission。

## 日志关联
- 每次包装函数调用写入 START。
- 正常返回写入 END / SUCCESS；返回 false 写入 END / NO_CHANGE。
- 抛出异常或 Promise rejection 写入 END / FAILED，并保留原异常传播行为。
- 嵌套同步调用通过父级 trace 共享 Execution ID，生成独立 Span ID 和 Parent Span ID。
- 统一记录耗时；不记录函数参数、完整任务对象或业务内容。

## 操作细节
统一数据提交函数使用既有 undoLabel 作为功能名称，因此勾选完成、工作状态变化、编辑、批量恢复等统一数据提交可按具体动作区分。用户取消确认而没有发生写入的路径不会伪造成功的业务写入记录；入口函数仍可留下操作执行记录。

## 数据与兼容性
- 日志继续存储于独立 IndexedDB；30 天清理、约 10,000 条容量保护沿用 Phase 1。
- 不上传日志，不改四模块 LocalStorage key/schema、JSON 备份结构、Supabase RPC 或数据库结构。
- 不包装 render / 高频 DOM 更新，避免日志噪声。
- 云端同步请求与整体覆盖的专项追踪、健康检查留在 Phase 4。

