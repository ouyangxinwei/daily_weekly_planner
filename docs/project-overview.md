# 项目总览

## 项目定位

慢慢计划是一个以个人计划和工作管理为核心的静态 Web/PWA 应用。项目从周期计划逐步扩展为多个彼此隔离的数据工作区，并增加个人公司业务管理能力。

- 仓库：`ouyangxinwei/daily_weekly_planner`
- 当前仓库版本：`10.42.0`（以根目录 `VERSION` 为准）
- GitHub Pages 入口：https://ouyangxinwei.github.io/daily_weekly_planner/
- 主分支：`main`
- 前端：原生 HTML、CSS、JavaScript；无需独立前端构建产物即可运行。
- 托管：GitHub Pages；Service Worker 提供 PWA 静态资源缓存。

## 产品工作区

1. **计划工作区**：周期计划、工作事项、外语任务、整理资料，以及相关搜索、筛选、排序、分页、归档、回收站、撤销和备份。
2. **外语学习工作区**：独立学习内容、练习、错题、学习记录和数据管理。
3. **成绩与未来入口**：个人成果和未来规划相关页面。
4. **个人公司网站**：客户、项目和业务跟进管理。
5. **首页天气看板**：东京与横滨天气信息。
6. **系统工具**：账号与同步、主题/语言设置、运行日志和系统健康检查等。

当前功能详情见 [功能与系统说明](feature_and_system_guide.md)。

## 核心架构与数据隔离

### 前端与发布
- 应用以静态资源方式部署在 GitHub Pages。
- `index.html` 是入口；页面模块按需加载对应 JS/CSS。
- `sw.js` 管理 Service Worker 缓存。前端资源变更时需同步更新缓存版本。
- 仓库的正式变更通过临时分支和 PR 合并至 `main`。

### 计划数据
- 计划、工作、外语任务和整理分别使用独立本地存储分区。
- JSON 导入/导出按模块校验；支持四模块整体导出。
- Supabase 用于既有账号校验与模块云端快照；各模块快照相互隔离，上传/下载按应用确认流程执行。

### 外语学习工作区
- 使用独立本地数据结构和存储键。
- 支持 JSON 导入/导出与版本兼容迁移。
- 不与计划模块外语任务混用，也不纳入四模块整体备份和 Supabase 快照同步。

### 个人公司网站
- 前端客户、项目和跟进界面通过 `company-api` Supabase Edge Function 访问后端。
- 业务记录存放于 Supabase `company_records`，以 `record_type` 区分不同业务对象。
- API 通过现有账号会话校验身份；前端不保存 service-role 密钥。
- 公司业务记录与计划模块的本地数据和云端快照隔离。

### 天气与日志
- 天气缓存单独存储，不进入业务同步。
- 运行日志保存在独立 IndexedDB，仅供当前设备诊断，不上传云端。

## 外部服务

- **GitHub Pages / GitHub Actions**：代码托管、自动化检查和静态站点发布。
- **Supabase**：计划模块认证与云端快照，以及公司网站业务记录和 Edge Function。
- **Open-Meteo**：首页天气数据接口。

## 重要边界

- 不要把 Supabase `service_role` 密钥、真实密码或 Token 写入仓库。
- 不要把公司业务记录写入计划模块快照。
- 不要把运行日志、天气缓存或独立外语学习工作区数据误认为四模块云端快照的一部分。
- GitHub Pages 的仓库提交不等于已部署；部署结论必须以对应 Actions / Pages deployment 成功记录为准。

## 主要文档

- [功能与系统说明](feature_and_system_guide.md)
- [技术手册](technical_manual.md)
- [部署与故障排查](deployment_and_troubleshooting.md)
- [数据库认证设计](database_auth_design_document.md)
- [公司网站阶段文档](company-website/README.md)
- [运行日志专项设计](runtime-logging.md)
- [开发历史与历史交付档案](development-history.md)
- [Git 分支工作流](git-branching-workflow.md)
