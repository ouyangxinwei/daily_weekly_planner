# 外语学习工作区 V2.0.0（应用 V10.35）

## 定位
在慢慢计划内部提供独立的外语学习工作区。参考 TOEIC Study System 的学习内容组织与练习交互，但不复用其源代码、数据库或数据结构。需求、影响分析与验收见 `requirements_V10.35_language_workspace_v2.md`、`impact_analysis_V10.35_language_workspace_v2.md`、`acceptance_V10.35_language_workspace_v2.md`。

## 入口与导航
- 顶部「计划工作区 / 外语学习工作区」切换。外语学习工作区隐藏模块切换栏与计划区域；主题、界面语言、账号与系统工具保持可用。
- 当前工作区保存在 `personal-planner:active-workspace:v1`（`plan` / `language`），刷新后恢复。`index.html` 头部的 `<script data-workspace-boot>` 提前设置 `html[data-workspace]`，避免计划列表闪现。
- 工作区导航：学习首页、学习内容、练习中心、错题管理、学习记录、数据管理；点击卡片「学习」进入内容详情。
- 计划工作区中的「外语任务」模块即原外语学习任务列表（`personal-language:v1`），与本工作区数据完全独立。

## 学习状态
| 内部值 | 显示 | 进入方式 |
|---|---|---|
| not_started | 未学习 | 新建内容 |
| learning | 学习中 | 首次打开（start）、重新学习（relearn） |
| completed | 已完成 | 完成本次学习（complete） |
| review | 需要复习 | 需要复习（review） |
| mastered | 已掌握 | 我已掌握（master） |

状态只能通过学习操作改变，每次操作生成一条学习记录并更新 `lastStudiedAt`；编辑内容不改变状态。练习中心不抽取已掌握内容，需要复习的内容优先；错题管理显示需要复习的内容。

## 数据结构（schemaVersion 2）
存储键 `personal-language-study-workspace:v1`：
- `items`：id、title、language、type、category、unit、level、prompt、answer、options、notes（界面显示为「解析」）、status、lastStudiedAt、createdAt、updatedAt。
- `records`：id、itemId、title、language、type、action、status、at（V1 记录保留原 `result` 字段）。
- `notes`：id、itemId、text（≤ 3000 字）、createdAt、updatedAt。
- `settings.activeTab`。

删除学习内容时，相关学习记录和个人笔记保留在数据中。

## V1 迁移
- 读取到 schemaVersion 1 时自动迁移；迁移前把原始字符串写入 `personal-language-study-workspace:v1:pre-v2-backup`（已存在不覆盖）。
- 状态映射：new→not_started，mistake→review，mastered→mastered；记录 result：mastered→master，mistake→review。
- 数据无法识别或无法写入时以只读方式打开，显示提示，不写回存储；「数据管理」可导出原始数据。

## 导入导出
- 导出 schemaVersion 2，包含 `moduleType: "language-workspace"`。
- 导入支持 V1 与 V2，上限 5 MB，校验后确认；失败时原数据不变。
- 工作区不参与云同步和整体备份，不发起任何网络请求。

## 回滚
V10.34 无法识别 V2 数据，并会在任意操作后以空数据覆盖。回滚前先在 V10.35 导出 JSON；回滚后可从 `...:pre-v2-backup` 或导出文件恢复（V10.34 只能导入 V1 格式）。

## 已知边界
单词与词汇、语法学习、学习统计、学习时长、间隔重复、音频、云同步、三语界面尚未实现（计划于 V10.36 以后）。工作区界面文案以中文为主。

## 测试
- `npm run test:validate:language`：V10.34 / V10.35 静态契约与迁移单元校验。
- `tests/e2e/language-workspace.spec.js`：工作区切换、外语任务、迁移、只读保护、状态、练习、筛选分页、笔记、导入导出。
