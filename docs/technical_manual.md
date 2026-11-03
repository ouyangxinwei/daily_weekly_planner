# V10.13 整理模块技术实现

- 模块标识：`activeModule`，取值 `plan` 或 `organize`；两个模块共用页面和渲染／编辑／分类／归档／回收站引擎。
- 本地存储：计划使用 `personal-planner:v1`，整理使用 `personal-organizer:v1`。切换模块时加载对应状态；`save()` 按当前模块写入独立键。整理默认分类为书籍、电子产品、软件/APP、网站、其他，项目周期固定为 `daily` 以复用既有状态校验，但 UI 隐藏周期选择并将列表作为整体显示。
- JSON：导出增加 `moduleType`（`plan`／`organize`）。整理导入要求 `moduleType: organize`；计划拒绝整理备份，旧版无 moduleType 的计划备份仍可导入。
- Supabase：沿用 `planner_get_data`／`planner_put_data` RPC。云端根对象继续保存原计划 schema（`schemaVersion`、`plans`、`categories`、`completions`、`trash`），另加 `organizer` 对象保存整理完整状态。上传前先读取远端快照，只替换当前模块并保留另一个分区；下载只解析当前模块。旧版无 `organizer` 字段时视为尚无整理云端备份。
- SQL `planner_put_data` 仅校验根对象的 schemaVersion、plans 和 completions，允许额外 JSON 字段，因此无需 SQL 迁移；计划 schemaVersion 保持 1。
- Service Worker cache 更新至 `daily-weekly-planner-v10-13-organize-module`。

# V10.12 分类管理实现

- 业务状态新增 categories 数组，默认保留原有七项；计划 category 字段不变，schemaVersion: 1 不变。
- normalizeCategories() 和 safeState() 兼容旧状态／旧备份缺少 categories 的情况，并兼顾回收站计划引用。
- 分类增删改通过 commitState() 事务保存。改名同步 plans 与 trash[].plan；删除使用中的分类时先迁移两处引用，再移除分类。撤销快照包含完整状态。
- renderCategoryOptions() 统一刷新新建／编辑下拉框和筛选器。新建及快速添加均使用 state.categories[0]。
- JSON 备份与 Supabase 整份快照均包含 categories；旧快照自动回退原有分类。无需 SQL 迁移。
- i18n 增加中英日静态文案，并跳过用户自定义分类名称。

## V10.10 首页星级统计与定位实现

- 版本标识：APP_VERSION 为 V10.10_star_dashboard_jump；Service Worker cache 为 daily-weekly-planner-v10-10-star-dashboard-jump。
- renderStarSummary() 遍历 state.plans，只纳入 daily、weekly、monthly、yearly，排除 archivedAt 非空及 state.completions[completionKey(plan)] === true 的计划；优先级经 validPriority() 归一为 1–5。
- 统计使用 completionKey(plan)，因此每日／每周／每月／每年的完成状态均按当前周期计算；随机周期不计入。
- 点击星级时按 daily → weekly → monthly → yearly 顺序查找最大计数；使用严格大于比较保留首次命中的周期作为并列规则。
- 跳转时清空搜索和分类筛选，更新周期标签并调用统一 render()；排序偏好不变。列表行写入 data-priority，再查找首个匹配的 .task，平滑滚动并添加短时高亮 class。
- 统计按钮由 DOM API 创建，标签使用 textContent；零计数按钮 disabled。功能不调用 commitState()，不修改 state、不新增存储键、不改变 schema 或 Supabase 接口。
- 首页摘要在 render() 中同步刷新，因此完成状态、计划新增／编辑／归档／恢复、导入及云端下载等现有重绘操作都会更新计数。

## V10.9 优先级默认排序实现

- 版本标识：APP_VERSION 为 V10.9_priority_sorting；Service Worker cache 为 daily-weekly-planner-v10-9-priority-sorting。
- 排序偏好使用独立键 personal-planner:sort-mode:v1 保存，不写入 personal-planner:v1 业务状态、JSON 备份或 Supabase 快照。
- loadSortMode() 只接受白名单模式；首次使用、存储缺失或读取失败时默认为 priority-desc。
- render() 先应用周期、归档、搜索与分类过滤，再排序。优先级模式使用完成状态（未完成 0、已完成 1）、有效星级降序、筛选后原始索引作为三级排序键。
- 同星级排序通过筛选结果的原始索引稳定打破平局；不依赖创建时间，不改变 state.plans 的原始顺序。
- 保留 default（原始顺序）、title、created-desc、created-asc 现有模式。排序模式切换只写独立偏好键并重绘，不调用 commitState()。
- 所有周期标签共用 render()，普通与随机临时视图均使用相同规则。完成状态、星级编辑、导入、恢复等现有操作重绘后自动重新排序。
- 不修改计划 schema、完成记录、撤销逻辑或云端同步接口；无 SQL 迁移。

## V10.8 版本履历与部署状态

- 入口：`#open-release`；弹窗：`#release-dialog`。
- 当前运行版本来自 `APP_VERSION`，只显示语义版本前缀（例如 V10.8）。
- 履历：`loadReleaseHistory()` 请求 `raw.githubusercontent.com/.../main/CHANGELOG.md`，`renderReleaseHistory()` 将 Markdown 标题和列表项通过 DOM `textContent` 构建，避免将远程内容作为 HTML 执行。
- 部署状态：`refreshReleaseStatus()` 并行请求 GitHub REST `commits/main` 与 `actions/runs?branch=main&per_page=20`，匹配 Pages build and deployment workflow 的 `head_sha` 与 main 当前 SHA。按 workflow 状态显示 success / in progress / failure / no matching run；GitHub API 网络或限流错误显示检查失败并可手动刷新。
- 不使用认证 token；依赖公开仓库 GitHub API 的匿名访问额度。更新履历读取失败时提供 CHANGELOG 页面链接。
- Service Worker 缓存名升级至 V10.8；业务数据 schema 与 `commitState()` 不变。

## V10.7 快速添加计划实现

- UI：`#quick-add-form`、`#quick-add-title` 与 `#quick-add-error` 位于当前计划卡片的进度条下方，桌面端横向排列，窄屏自动适配。
- 交互：表单 submit 同时支持 Enter 和按钮点击；输入仅做 trim，空字符串不提交。输入变更时清除错误状态。
- 数据：创建普通 `daily` 计划，字段沿用现有结构：`title`、空 `note`／`referenceUrl`／`dueAt`、`category: '未分类'`、`priority: 1`、空提醒标记及时间戳；不增加 schema 字段。
- 事务：`quickAddPlan()` 使用 `commitState()` 写入候选状态。只有成功后才切换每日标签、清理搜索／分类过滤、重绘、清空输入并提示成功；失败保留输入框内容。
- 快速添加不替代 `openDialog()` 完整表单。无 SQL 或数据迁移。

## V10.6 事务式保存机制

- `save(nextState = state)` 将指定候选状态序列化并写入浏览器存储，返回布尔结果；失败时不修改正式状态。
- `cloneState(source)` 生成独立状态副本；`commitState(mutator, options)` 在副本上执行修改，写入成功后才赋值 `state = next`。
- 只有持久化成功后才更新撤销快照、刷新界面、执行后续 UI 回调及显示成功消息。
- 失败路径不替换 `state`；表单不关闭，完成复选框恢复原值。
- 撤销先保存快照，再提交到内存；撤销保存失败时保留当前状态和撤销能力。
- JSON 导入、云端下载与自动清理同样使用候选状态；提醒标记先保存，再发送系统通知。
- 数据结构及 `schemaVersion: 1` 不变，不需要数据库迁移。

### 失败路径测试建议

通过浏览器开发者工具临时模拟存储写入异常，分别测试新建、编辑、完成切换、删除、归档、恢复、永久删除、导入和撤销；确认旧数据保持一致、无成功提示、表单仍可继续编辑。测试结束后恢复原生存储方法。

## V10.5 五级优先级实现

- `validPriority(value)` 接受 1–5 的整数；其他值（含缺失、非整数、0 或大于 5）回退为 1。
- 计划对象字段名仍为 `priority`，JSON 与 Supabase 快照结构不变；`schemaVersion` 继续为 1。
- UI 提供五个星级按钮；列表按 `validPriority(plan.priority)` 绘制相应数量的 SVG 星形。高优先级排序沿用数值降序。
- PDF 从 `.priority-display` 的无障碍标签读取优先级，因此输出 1–5 星。
- 旧数据中的 1/2/3 不变；旧备份缺少该字段仍按 1 星处理。无需 SQL 迁移。

# 技术手册

## V9 数据库认证接口

登录页调用 `planner_login` RPC；同步分别调用 `planner_put_data`、`planner_get_data`。数据库以 pgcrypto bcrypt 摘要验证密码，客户端不读取账号或密码摘要表。各 RPC 对账号密码重新验证。V10.2 起不再启用登录失败次数统计或临时锁定。`planner_credentials` 仅允许 `oooo` 一个用户名。初始账号由项目管理员通过 SQL Editor 单独插入；切勿将带有密码的初始化语句提交至公开仓库。


## 1. 技术构成

- `index.html`：页面、样式和交互逻辑，原生 HTML/CSS/JavaScript，无第三方依赖和构建步骤。
- `manifest.webmanifest`：PWA 名称、图标、启动路径和显示模式。
- `sw.js`：静态资源缓存及离线入口回退。
- `icon.svg`：应用图标。
- JSON 备份：由页面 Blob 下载生成；恢复时解析并验证 JSON，再写入现有本地存储键。

## 2. 本地数据结构

存储键：`personal-planner:v1`。

```json
{
  "schemaVersion": 1,
  "plans": [{
    "id": "uuid",
    "title": "读书 20 分钟",
    "note": "睡前阅读",
    "period": "daily",
    "category": "学习",
    "priority": 3,
    "dueAt": "2026-10-28T18:30",
    "notifiedFor": "",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }],
  "completions": {
    "uuid|daily|2026-10-28": true
  }
}
```

周期值包括 `daily`、`weekly`、`monthly`、`yearly`，以及临时的 `daily_random`、`weekly_random`、`monthly_random`。随机临时计划还保存创建时的 `cycleId`。计划分类允许 `未分类`、`工作`、`学习`、`生活`、`健康`、`财务`、`兴趣`。优先级是 1–5 的整数。提醒时间 `dueAt` 为本地 `YYYY-MM-DDTHH:mm` 字符串，`notifiedFor` 记录已发送提醒对应的时间；旧数据缺少这些字段时视为未设置提醒。读取时会检查 schema 版本、字段类型和周期枚举；旧数据缺少 category 时映射为“未分类”，缺少 priority 时映射为 1。列表文本通过 `textContent` 显示，不作为 HTML 执行。

### JSON 备份格式与校验

导出文件保留 schemaVersion 1 的数据结构，并增加 `appVersion` 与 `exportedAt` 元信息；提醒时间和已提醒标记随计划导出。导入上限为 2 MB、5000 条计划和 100000 条完成记录；验证 ID 唯一、标题和周期有效，仅接受属于导入计划的完成记录。确认导入后整体覆盖当前存储。用户取消确认时不写入。解析或结构错误不会覆盖现有数据。

## 2.2 分类、筛选与排序

计划 `category` 是本地受控枚举，`priority` 范围 1–5；旧版本数据和备份按默认值“未分类”和 1 星兼容。列表先按当前周期筛选，再按分类和标题／备注关键词筛选，最后按添加顺序、优先级、标题 localeCompare 或 ISO 创建时间排序。进度统计基于筛选后的可见计划。星形使用内嵌 SVG symbol，无外部图片资源。

## 临时计划过期规则

`RANDOM_BASE` 将三个随机周期映射至 daily／weekly／monthly 的周期标识。创建临时计划时保存 `cycleId`；载入状态及每分钟刷新时，对照当前周期标识清理过期计划与完成记录。周周期从周一开始。导入备份时保留周期标识；旧备份没有随机周期记录。若新格式随机计划缺少 `cycleId`，导入时按当前周期初始化。

## 批量清理范围

清理操作以 `activePeriod` 作为唯一范围，不读取搜索关键词或分类筛选器。清空全部时选中该周期全部计划；清空已完成时仅选择 `completionKey(plan)` 在当前周期为 `true` 的计划。确认后统一删除计划和相关完成记录，再持久化并重绘界面。确认提示列明标签和数量。

## 2.3 提醒机制

提醒由页面打开期间的定时检查触发，使用浏览器 Notification API。首次保存提醒计划时请求通知权限；每 15 秒检查一次，计划未完成且提醒时间已到时发送一次，并保存 `notifiedFor` 防止重复。更改提醒时间会重置该字段。提醒时间按设备本地时区解释。页面关闭时无后台触发能力；推送或系统级定时提醒需要服务端推送或平台支持。

## 3. 周期标识

每日为 `YYYY-MM-DD`；每周为包含该日的一周周一日期；每月为 `YYYY-MM`；每年为 `YYYY`。日期按设备本地时区计算，周一为周起始日。

## 4. 修改约定

- 修改产品行为时同步更新本手册、玩法说明和更新记录。
- 更新 Service Worker 覆盖的静态资源后，应递增 `sw.js` 中的缓存名。
- 数据结构改变时递增存储 schema，并设计旧数据迁移或清晰的错误反馈。
- 不要在 `innerHTML` 中拼接用户输入；保留对存储数据的类型校验。
- 生产部署需经 HTTPS，以启用 Service Worker 和 PWA 安装能力。

## 5. 已知限制

没有服务器、账号或同步机制。浏览器存储可能被用户清理或受浏览器隐私策略限制。本版本没有历史周期选择、提醒和自动化测试。
## 参考网站字段（V10.3）
计划对象增加可选 `referenceUrl` 字符串。旧数据缺少该字段时按空字符串处理。有效 HTTP/HTTPS 链接在计划列表备注上方显示，点击在新标签页打开；网址格式无效时不显示可点击链接、不弹提示。字段自动随 JSON 备份和 Supabase JSONB 快照同步，无需 SQL 迁移。



## PDF 导出（V10.4）

顶部“导出 PDF”按钮从当前渲染后的 `#task-list .task` DOM 读取记录，因此导出范围与屏幕当前可见结果一致：当前周期、搜索关键词、分类筛选和排序均生效。回收站、归档管理窗口以及被筛选隐藏的计划不会被导出。导出器将当前可见记录转为独立打印页，采用内联 CSS 和系统中文字体回退，不依赖第三方库或在线 CDN。浏览器打印对话框中选择“另存为 PDF”即可保存。

每条计划使用 `.plan-record { break-inside: avoid; page-break-inside: avoid; }`，长备注保留换行并允许断词，长 URL 可折行；打印使用 A4 页面、适合打印的页边距和页码。该 CSS 可避免一般长度的计划记录被拆开，但 CSS 分页规则不能保证将超过整页可打印高度的单条记录缩放到一页；此类极端长内容仍可能由浏览器分页引擎拆开。导出只读取 DOM，不修改本地计划或云端快照，不需要数据库迁移。


## V10.11 多语言模块设计

`i18n.js` 在应用脚本之前加载，提供 `window.PlannerI18n` 的 `getLanguage()`、`setLanguage(lang)`、`locale()` 和 `t(text)` 接口。翻译字典以现有中文系统文案为键，支持 zh（默认）、en、ja。语言偏好保存在独立 LocalStorage 键 `personal-planner:language:v1`，不写入业务状态对象。模块扫描系统界面文本及 placeholder、aria-label、title 等显示属性，并监听后续动态 DOM 更新；计划标题、备注、参考链接等用户内容节点被排除。日期格式通过当前语言 locale 输出。版本履历按语言加载 `CHANGELOG.md`、`CHANGELOG.en.md` 或 `CHANGELOG.ja.md`。PDF 导出使用当前语言的系统标签。

语言功能不得改变 `schemaVersion: 1`、计划字段、分类枚举、周期枚举、完成记录、JSON 备份、Supabase RPC 或事务式保存机制。新增语言仅扩展字典和对应版本履历。
