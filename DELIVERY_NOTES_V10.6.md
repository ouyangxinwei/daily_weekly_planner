# V10.6 交付说明

## 本次实现
- 统一候选状态保存入口 `commitState()`。
- 修复计划新建／编辑、完成状态、删除、批量删除、归档、取消归档、恢复、永久删除、批量操作、撤销、JSON 导入、云端下载及自动清理的失败处理。
- 更新用户说明、技术手册、部署说明、需求规格、验收测试、影响分析和迁移说明。
- Service Worker 缓存版本更新为 `daily-weekly-planner-v10-6-transactional-save`。

## 数据兼容
保持 `schemaVersion: 1`，无需数据库迁移。

## 验证状态
已完成 GitHub 源码更新及静态代码路径检查。当前环境未运行真实浏览器，LocalStorage 配额异常注入和 UI 端到端测试尚未执行；请按 `docs/acceptance_V10.6_transactional_save.md` 验收。