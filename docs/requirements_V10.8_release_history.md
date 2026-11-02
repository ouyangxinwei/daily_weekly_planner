# V10.8 版本记录与部署状态需求

## 目标
让用户从首页直接查看当前运行版本、完整更新履历，并确认 GitHub Pages 对 main 最新提交的构建部署状态。

## 功能
- 首页顶部增加「版本与更新记录」入口。
- 弹窗显示 APP_VERSION 的版本号。
- 从 GitHub main 的 CHANGELOG.md 加载 V0 至最新版本履历。
- 加载失败时提供 CHANGELOG GitHub 页面链接。
- 查询 main 最新 commit SHA 与 GitHub Actions workflow runs。
- 只匹配 Pages build and deployment 工作流，并要求 run.head_sha 与 main 当前 SHA 一致。
- 显示部署成功、正在部署、失败、等待记录或检查失败。
- 显示短 SHA、更新时间及 Actions 运行链接；支持手动刷新。

## 限制
- 使用公开 GitHub API，不在前端存放 token；匿名 API 额度或网络策略可能导致检查失败。
- 工作流成功不代表每个浏览器或 PWA 缓存均已更新。
- 不修改计划数据结构、保存机制或 Supabase 数据库。
