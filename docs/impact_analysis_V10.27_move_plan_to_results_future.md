# V10.27 影响分析：扩展计划移动目标

本次修改只扩展计划编辑窗口中的目标选项和移动函数允许列表。目标模块仍通过现有 MODULE_KEYS、MODULE_CATEGORIES、moduleCache、safeState、commitState 流程独立读写。原有目标、移动确认、目标写入失败保护、原计划删除及回滚逻辑保持不变。不修改模块 schema、LocalStorage 键、JSON 备份结构或 Supabase 同步协议。
