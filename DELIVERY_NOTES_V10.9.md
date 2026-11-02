# 慢慢计划 V10.9 交付说明

## 新增与调整
- 默认排序改为「优先级（未完成优先）」。
- 未完成任务优先于已完成任务；各自分组内部按五星至一星排列。
- 同星级保持筛选后原列表顺序。
- 保留原始顺序、名称 A–Z、最近添加、最早添加。
- 排序模式单独保存并在刷新后恢复。
- 普通周期及随机临时计划视图统一使用规则。

## 影响范围
只改变显示顺序及独立排序偏好，不修改计划业务数据、完成记录、撤销机制、JSON schema、Supabase 快照或数据库结构。无 SQL 迁移。

## 修改文件
- index.html
- sw.js
- README.md
- CHANGELOG.md
- docs/feature_and_system_guide.md
- docs/technical_manual.md
- docs/deployment_and_troubleshooting.md
- docs/requirements_V10.9_priority_sorting.md
- docs/acceptance_V10.9_priority_sorting.md
- docs/impact_analysis_V10.9_priority_sorting.md
- DELIVERY_NOTES_V10.9.md

## 验证
- JavaScript 语法检查：通过。
- 五星优先、完成状态置底、同星稳定顺序模拟：通过。
- 筛选后排序、偏好恢复、现有排序模式模拟：通过。
- 真实浏览器／手机 PWA 端到端测试：尚待用户设备验收。

GitHub Pages 部署成功与否以本次提交 SHA 对应的 pages build and deployment workflow 为准。
