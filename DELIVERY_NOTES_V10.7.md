# 慢慢计划 V10.7 交付说明

## 本次内容

新增「快速添加计划」：
- 计划列表进度条下方新增常驻输入框。
- 支持 Enter 和点击按钮提交。
- 默认加入每日计划，未完成、未分类、1 星，不设置提醒。
- 保存成功后切换至每日视图，清除搜索词与分类筛选，清空输入框并保持焦点，支持连续录入。
- 空名称不提交。
- 事务保存失败时保留输入内容，不显示成功提示。

## 技术影响

- 复用 V10.6 `commitState()`。
- 不修改计划数据结构及 `schemaVersion: 1`。
- 无需 Supabase SQL 或数据迁移。
- Service Worker 缓存名更新为 `daily-weekly-planner-v10-7-quick-add`。

## 修改文件

- `index.html`
- `sw.js`
- `README.md`
- `CHANGELOG.md`
- `docs/feature_and_system_guide.md`
- `docs/technical_manual.md`
- `docs/deployment_and_troubleshooting.md`
- 新增 `docs/requirements_V10.7_quick_add.md`
- 新增 `docs/acceptance_V10.7_quick_add.md`

## 验证说明

需区分静态代码检查与真实浏览器验收。交付前应验证 Enter、按钮、连续添加、空输入、保存失败、刷新持久化、移动端布局及原有完整表单。未实际运行的浏览器测试不得标记为通过。

## 部署

上传完整仓库文件。已部署的 GitHub Pages 等待发布完成后刷新；已安装 PWA 建议完全关闭后重新打开。无需数据库迁移。
