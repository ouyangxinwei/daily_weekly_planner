# V10.35 影响分析：外语学习工作区 V2

对应需求：`requirements_V10.35_language_workspace_v2.md`（已确认）。

## 1. 现状（V10.34）
- `language-workspace.js` 在捕获阶段监听 `#module-language` 点击；进入时给 `#app-shell` 加 `language-workspace-active`，CSS 隐藏 `.top` 之后除工作区根节点外的全部内容。
- 由于工作区接管了「外语学习」模块按钮，旧任务模块（`LANGUAGE_KEY='personal-language:v1'`）仍由主程序加载、搜索、同步，但界面上没有入口。
- 工作区数据：`personal-language-study-workspace:v1`，schemaVersion 1，字段 `items / records / settings`；状态只有 `new / mistake / mastered`。

## 2. 修改范围

| 文件 | 修改内容 | 风险 |
|---|---|---|
| `index.html` | 顶部工具栏增加工作区切换控件；「外语学习」模块按钮文案改为「外语任务」；脚本版本号；应用版本 10.35.0 | 中：主页面结构 |
| `language-workspace.js` | 去掉对 `#module-language` 的点击劫持，改由工作区切换控件激活；状态模型、单元/难度字段、分页、详情页、笔记、schema 2 迁移、导入兼容 | 高：数据迁移 |
| `language-workspace.css` | 工作区切换控件、详情页、分页、笔记样式；隐藏规则改为同时隐藏模块切换栏 | 低 |
| `i18n.js` | 新增「计划工作区 / 外语学习工作区 / 外语任务」三语文案 | 低 |
| `sw.js` | 缓存版本号 | 低 |
| `VERSION` `package.json` `CHANGELOG*.md` | 版本与更新记录 | 低 |
| `docs/language-learning-workspace*.md` | 更新为 V2 说明 | 低 |
| `tests/e2e/helpers.js` | `language` 模块条目改回旧任务键 `personal-language:v1`，工作区单独处理 | 中：影响既有隔离测试 |
| `tests/e2e/language-workspace.spec.js` | 进入方式改为工作区切换；增加状态、分页、笔记、迁移用例 | 中 |
| `scripts/validate-v10.34.mjs` | 「必须存在 `#module-language`」等断言保持；若断言依赖点击劫持需调整 | 低 |
| `scripts/validate-v10.35.mjs`（新增） | 静态校验 schema 2、迁移备份键、工作区键、无 Supabase 访问 | 低 |

## 3. 不修改的内容
- 七个模块的存储键、`schemaVersion: 1`、JSON 备份格式、`MODULE_KEYS`、`CLOUD_PARTITIONS`。
- 「外语任务」模块的分类、星级统计、分页、计划移动目标、全局搜索、单模块/整体云同步——仅改显示名称。
- Supabase 表结构、RPC 及参数；不需要 SQL 迁移。
- 外语学习工作区仍不参与云同步、整体备份。

## 4. 关键风险与对策

### 4.1 V1 → V2 数据迁移
- 风险：迁移出错导致学习内容丢失。
- 对策：迁移前把原始字符串写入 `personal-language-study-workspace:v1:pre-v2-backup`（已存在不覆盖）；迁移为纯函数，先在内存生成并校验 items/records 数量一致后再写回；失败时只读打开并提示导出。

### 4.2 工作区切换与主程序状态
- 风险：切换工作区触发 `switchModule` 或重新 `load()`，导致计划模块搜索、分页、撤销状态丢失。
- 对策：工作区切换只改 `#app-shell` 的类名和 `personal-planner:active-workspace:v1`，不调用主程序任何模块函数；返回计划工作区时不重新渲染列表以外的状态。E2E 覆盖「切换前后搜索词与页码不变」。

### 4.3 旧任务入口恢复
- 风险：V10.34 期间用户看不到旧任务，恢复后可能误以为是新增数据。
- 对策：更新记录中说明「外语任务」即原外语学习任务列表，数据未变化。

### 4.4 启动顺序
- 风险：`language-workspace.js` 作为 module 脚本晚于主程序执行，刷新恢复外语学习工作区时出现计划列表闪现。
- 对策：在 `index.html` 头部用极小的同步脚本读取工作区键，提前给 `<html>` 加 `data-workspace="language"`，CSS 据此先隐藏计划区域。

### 4.5 既有测试
- `helpers.js` 当前把 `language` 模块指向工作区键，V10.35 需改回旧任务键，否则模块隔离测试会误判。

## 5. 回滚
- 代码回滚到 V10.34 后，V1 的 `load()` 读到 schemaVersion 2 会静默以空数据打开；之后任何操作（包括切换导航页）都会调用 `save()`，**用空数据覆盖 V2 数据**。
- 对策：
  - 回滚前先在 V10.35 中导出 JSON 备份；回滚后从 `personal-language-study-workspace:v1:pre-v2-backup` 或导出的备份恢复。
  - V10.35 发布前确认可用后再推送到 `main`（GitHub Pages 自动部署），避免需要线上回滚。
  - 回滚步骤写入维护文档。
