# 慢慢计划 V10.8 交付说明

## 新增功能
首页顶部新增「版本与更新记录」按钮。打开后显示：
- 当前运行版本；
- GitHub main 分支 CHANGELOG 的完整历史版本；
- GitHub Pages 部署状态；
- 对应 main 提交短 SHA、更新时间及 Actions 运行记录链接；
- 手动刷新部署状态。

## 部署状态含义
系统从公开 GitHub API 读取 main 最新 commit，并与 Pages build and deployment workflow 的 head_sha 比对。仅当对应当前 main SHA 的工作流成功完成时显示「部署成功」。未匹配时显示等待记录，运行中或失败则分别显示对应状态。网络或 API 限流时显示检查失败。

注意：GitHub Actions 成功表示 Pages 构建部署工作流成功，不保证所有浏览器或 PWA 缓存已经更新。

## 修改文件
- index.html
- sw.js
- README.md
- CHANGELOG.md
- docs/feature_and_system_guide.md
- docs/technical_manual.md
- docs/deployment_and_troubleshooting.md
- docs/requirements_V10.8_release_history.md
- docs/acceptance_V10.8_release_history.md

## 数据与兼容
不修改计划 schema、LocalStorage 业务数据、Supabase 表或 RPC，无数据库迁移。V10.6 事务保存机制不变。

## 验证
静态语法检查和部署状态分支逻辑模拟待执行；真实浏览器／手机 PWA 验收待用户设备执行。
