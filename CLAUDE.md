# 项目规定

## 技术栈与运行方式
- 语言与运行时：请根据当前目录实际情况选择最轻量的方式（如 Node.js 或 Python）。
- 所有功能必须附带可自动运行的测试脚本。

## 行为边界（重要）
1. 每次修改代码前，先简述你的计划，等我确认或直接按计划执行小步修改。
2. 严禁修改 `.env`、配置文件或删除现有目录中非本次任务的文件。
3. 完成修改后，必须主动运行测试命令验证结果，并给出真实输出。

## Agent 自动化工作流（PLAN.md 五步）

详细说明：`docs/agent-workflow.md`（唯一权威文档，修改流程时同步更新）。

### 结构
- `PLAN.md`（根目录）：任务定义与完成状态。每个 Step 标题为 `### Step N：...`，唯一目标复选框为 `- [ ] **目标：** ...`，`[x]` 表示完成。
- `run-plan.ps1`（根目录）：PowerShell 编排脚本。负责同步、选步骤、调用 Claude Code、校验 Diff、Commit、Push 到 `feat/agent-plan-steps`。
- `tests/agent-workflow/test-run-plan.ps1`：编排脚本的离线测试。
- Claude Code（`claude -p`）只作为 Worker 修改 `index.html` 和 `PLAN.md` 复选框；Git 操作全部由脚本执行。

### 命令（必须在仓库根目录执行）
```powershell
cd <仓库根目录>   # 包含 .git、PLAN.md、run-plan.ps1 的目录
powershell -ExecutionPolicy Bypass -File .\tests\agent-workflow\test-run-plan.ps1   # 离线测试
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -CheckOnly                  # 只读状态检查
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1                             # 执行 1 个待完成 Step
```

### 交互式会话中的规则
- 不得自行运行 `run-plan.ps1`（不带 `-CheckOnly`），不得自动执行 Step 1～5，除非用户明确要求。
- 不得修改 PLAN.md 中五个 Step 的任务内容。
- 不得自动合并 PR、推送到 `main` 或部署。本工作流中此规则优先于 `docs/ai_collaboration_guide.md` 第 5 节的默认自主模式。
- 不得删除根目录本地辅助文件（`check.py`、`test_check.py`、`interactive_agent.py`、`agent_test/`、`tools/weather-cli/`、`__pycache__/` 等）。
- 代码注释使用英文；`run-plan.ps1` 必须保持纯 ASCII（中文用 `\uXXXX` 转义），兼容 Windows PowerShell 5.1。
- 修改 `run-plan.ps1` 后必须运行离线测试并给出真实输出，再用 `-CheckOnly` 确认五个 Step 分行显示。
- 发现脚本问题时提供完整可替换版本，不只给零散片段。

### Headless Worker 规则（由 run-plan.ps1 启动时适用）
- 当提示词声明 "You are a headless worker agent ... started by run-plan.ps1" 时，提示词中的 STRICT REQUIREMENTS 优先于本文件其他条款：
  - 直接执行，不等待确认（无人应答）。
  - 不创建测试文件（上方"所有功能必须附带测试脚本"不适用于该微任务）。
  - 只修改 `index.html`（新增一行英文 HTML 注释）和 `PLAN.md`（仅当前 Step 的目标复选框）。
  - 不运行 Git 或 Shell 命令。

### 当前进度（2026-11-25）
- 编排脚本已修复并通过 38 项离线测试；`-CheckOnly` 已确认显示五个独立 PENDING Step。
- Step 1～5 均未执行；尚未用真实 Claude Code 完整跑通任何 Step。
- Runner、测试、本文件和文档通过分支 `feat/agent-workflow-runner` 的 PR 提交到 `main`；是否合并由用户决定。
- 下一步：PR 合并后同步本地 `main` → `-CheckOnly` → `run-plan.ps1`（默认只执行 Step 1）→ 检查 `feat/agent-plan-steps` 上的提交后再继续。
- 已知风险见 `docs/agent-workflow.md` 第 14 节。
