# V10.13 整理模块交付说明

## 版本
V10.13 · organize_module

## 主要交付
- 首页新增计划／整理模块切换。
- 整理初始分类：书籍、电子产品、软件/APP、网站、其他。
- 复用计划现有列表、编辑、快速添加、分类管理、归档、回收站、撤销和 PDF 导出能力。
- 整理数据独立保存在 personal-organizer:v1。
- JSON 备份通过 moduleType 分离。
- Supabase 快照增加 organizer 分区；上传先读远端并合并当前模块，下载仅恢复当前模块。
- 沿用现有 Supabase RPC，无 SQL 迁移。
- 更新中英日界面、PWA 缓存及完整文档和版本履历。

## 数据安全
- 计划原存储键 personal-planner:v1 不变。
- 整理使用 personal-organizer:v1。
- 计划与整理本地数据、分类、回收站和归档互相隔离。
- 上传整理时保留云端计划；上传计划时保留云端整理。
- 旧版云端计划快照兼容。

## 测试记录
本次代码完成后应记录：
- JavaScript 语法检查；
- 模块数据隔离模拟；
- JSON 备份模块类型检查；
- 云端快照合并模拟；
- GitHub Pages workflow 对应 SHA 的 build/deploy 状态。

真实浏览器、Android PWA、Supabase 线上端到端测试若未实际执行，必须明确标注未执行，不得宣称通过。
