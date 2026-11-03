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

## 当前检查记录
- 静态代码检查：已核对计划／整理独立 LocalStorage 键、模块切换、五项默认分类、整理平铺列表、周期 UI 隐藏、moduleType 备份隔离、云端快照分区合并、旧计划根结构保留及中英日翻译键。
- Service Worker：已确认缓存版本升级为 `daily-weekly-planner-v10-13-organize-module`。
- 自动化检查：新增 `.github/workflows/validate-v10.13.yml`，由 GitHub Actions 执行 `node --check` 与模块隔离静态断言；本次尚未取得该工作流运行结果，因此不标记为通过。
- GitHub Pages：代码已提交到 main；当前无法从可用的 Actions 查询结果中核验与最新 main SHA 匹配的 Pages build/deploy 成功记录，因此部署状态标记为待核验。
- 真实浏览器、Android PWA、Supabase 线上端到端测试：尚未执行。

以上区分静态检查、自动化工作流和真实端到端测试；未实际执行的测试不宣称通过。
