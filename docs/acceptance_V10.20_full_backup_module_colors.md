# V10.20 验收记录

## 整体 JSON 导出
- [ ] 新按钮在四模块入口中可见，且不依赖当前模块。
- [ ] 导出 JSON 可解析，顶层包含 app、backupType、backupVersion、appVersion、exportedAt、modules。
- [ ] modules 中包含 plan、work、language、organize 四个模块。
- [ ] 每个模块均包含 moduleType、schemaVersion、categories、plans、completions、trash、appVersion、exportedAt。
- [ ] 各模块的分类、记录、完成状态、归档字段、回收站数据与当前单模块备份支持范围一致。
- [ ] 文件名符合 manman_planner_full_backup_YYYYMMDD_HHmmss.json。
- [ ] 任一模块读取/解析/校验失败时取消整体导出，不产生不完整文件。
- [ ] 导出不会修改 LocalStorage，也不访问 Supabase。
- [ ] 不包含 IndexedDB 运行日志及系统设置。
- [ ] 原有四个模块单独导出、导入功能保持正常。

## 四模块按钮颜色
- [ ] 计划为蓝色系、工作为绿色系、外语学习为紫色系、整理为橙色系。
- [ ] 当前选中状态仍有足够辨识度。
- [ ] 原有按钮文字、尺寸、排列、点击行为不变。
- [ ] 桌面端与移动端显示正常；其他按钮不受影响。

## 回归与发布
- [ ] 四模块切换、读写、统计、归档、回收站正常。
- [ ] 云端单模块/整体同步代码与行为未改变。
- [ ] 中英日翻译正常。
- [ ] Service Worker 使用 V10.20 新缓存名。
- [ ] GitHub Actions 构建、Pages 部署均成功后方可宣布发布。
