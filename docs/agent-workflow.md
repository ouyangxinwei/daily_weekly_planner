# Agent Workflow Guide

This document records the current Agent workflow experiment in this repository, the implementation that has actually been exercised, the lessons learned, and the intended path toward a Master Agent plus multiple worker Agents.

## 1. Purpose

The goal is to make small, well-bounded repository tasks executable through an Agent workflow instead of relying on manual copy-and-paste for every step.

The experiment uses the five-step plan in the repository root `PLAN.md`. Each step adds exactly one explanatory HTML comment to `index.html` and changes only that step's target checkbox in `PLAN.md`.

This is a workflow validation exercise, not a product feature change.

## 2. Current Repository Workflow

The current proof of concept is a PowerShell orchestrator that runs locally in the repository root and invokes Claude Code CLI.

The responsibilities are separated as follows:

| Component | Responsibility |
|---|---|
| GitHub `PLAN.md` | Single source of truth for task definitions, scope, and completion state |
| PowerShell orchestrator (`run-plan.ps1`) | Synchronizes the repository, finds the next pending step, invokes Claude Code, validates changes, and performs Git commit/push |
| Claude Code | Implements one assigned step using only the explicitly allowed file tools |
| Git | Records and pushes each completed step as an independent commit |
| Human owner | Defines the task, controls when the workflow is started, and handles decisions that require human judgment |

### 2.1 Execution sequence

1. Start the script from the repository root on the expected branch.
2. Check that the repository remote and branch match the configured values.
3. Check tracked files for local modifications. Existing untracked local helper files are snapshotted and protected rather than automatically deleted.
4. Fetch and fast-forward the local branch from GitHub.
5. Read the latest root `PLAN.md` directly from GitHub.
6. Compare the remote plan with the local copy. Stop if they differ.
7. Parse Step 1 through Step 5 and select the first pending target checkbox.
8. Send only that step's section to Claude Code.
9. Claude Code edits the requested files but does not run Git, commit, push, merge, or deploy.
10. The orchestrator validates the resulting diff and rejects unexpected files or changes.
11. If validation passes, the orchestrator stages only `PLAN.md` and `index.html`, creates a step-specific commit, and pushes it to the configured branch.
12. On the next loop, the orchestrator reads GitHub's latest plan again. It continues only while the loop limit permits and a pending step exists.
13. Any failed command or failed validation stops the run. The script does not silently skip a failed step.

### 2.2 Current validation rules

For each step, the orchestrator is intended to enforce these boundaries:

- Only `index.html` and `PLAN.md` may be modified.
- `index.html` must receive exactly one added line, and that line must be a complete HTML comment.
- No existing line in `index.html` may be deleted or rewritten.
- `PLAN.md` may change only the target checkbox belonging to the current step, from `[ ]` to `[x]`.
- The target checkbox must be unique within that step.
- Existing untracked helper files must not be modified, deleted, or replaced by new untracked files during Agent execution.
- Git whitespace validation must pass.
- Each successful step receives its own commit and push.

The workflow intentionally does not run a full browser regression suite for these comment-only tasks. It must not claim that browser or device behavior was tested when it was not.

## 3. Safe Check-Only Mode

The script provides a `-CheckOnly` mode to verify repository synchronization and plan parsing without starting Claude Code.

Expected output for the current five-step plan:

```text
PLAN.md step status:
Step 1: PENDING
Step 2: PENDING
Step 3: PENDING
Step 4: PENDING
Step 5: PENDING

Check-only mode completed. Claude Code was not started.
```

Use check-only mode after changing the script's parsing or validation logic. Start the execution mode only after the displayed statuses match GitHub's actual checkboxes.

## 4. Implementation Lessons

The experiment exposed several practical issues that should be treated as workflow requirements:

### 4.1 Parse the plan structure, not a guessed string

The step headings use a Chinese full-width colon, for example:

```markdown
### Step 1：标注启动阶段的工作区恢复
```

The parser must accept both ordinary whitespace and punctuation after the step number. It must also identify the target checkbox inside the corresponding step section, rather than searching for any unchecked checkbox in the entire document.

The plan contains other checkboxes for global acceptance and status notes. Those are not worker tasks and must not be interpreted as pending steps.

### 4.2 PowerShell array output must be handled deliberately

PowerShell automatically enumerates arrays returned from functions. Returning an array with a leading comma can wrap it as a single nested array. This can produce output such as `Step System.Object[]: PENDING` instead of five individual step records.

The current implementation uses:

```powershell
return $steps
```

The check-only output is the acceptance check for this behavior: it must display five separate step lines.

### 4.3 Keep the execution policy change temporary

On Windows systems that block unsigned local scripts, a process-scoped bypass can be used for the current PowerShell session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

This is temporary for that PowerShell process. Do not change the machine-wide execution policy merely to run this project helper script.

### 4.4 Separate implementation from Git operations

Claude Code is instructed not to run Git commands. The orchestrator owns staging, commit, and push so that the commit boundary and allowed file list remain centralized and auditable.

### 4.5 Fail closed

If the plan cannot be parsed, the local plan differs from GitHub, the Agent changes an unexpected file, or validation fails, the workflow must stop. It must not mark a step complete based only on the Agent's narrative report.

## 5. Current Scope Versus the Multi-Agent Target

It is important not to overstate what has been implemented.

**Implemented proof of concept:** one PowerShell orchestrator invokes Claude Code for one pending step at a time, validates the result, then commits and pushes it. The loop can process multiple steps sequentially.

**Not yet implemented:** a Master Agent that actually launches five independent worker Agents, manages their separate contexts, collects their patches, resolves conflicts, and performs a final consolidated review.

The five tasks in the current plan are logically independent, but they all modify the same `index.html` file. Logical independence does not make concurrent writes safe.

## 6. Intended Master Agent and Worker Agent Architecture

The target architecture is:

```text
Human Owner
    |
    v
Master Agent
    |
    +-- Read repository rules and latest PLAN.md
    +-- Validate task boundaries and dependencies
    +-- Split the plan into isolated worker assignments
    |
    +--> Worker Agent 1
    +--> Worker Agent 2
    +--> Worker Agent 3
    +--> Worker Agent 4
    +--> Worker Agent 5
              |
              v
       Independent patches
              |
              v
       Master Agent review
              |
              +-- Check scope and acceptance criteria
              +-- Reject unexpected changes
              +-- Apply patches in a controlled order
              +-- Re-run consolidated validation
              |
              v
       Commit / Push / PR / Merge / Deploy
       according to repository policy
```

### 6.1 Master Agent responsibilities

- Read the repository instructions, current branch state, and task plan.
- Confirm that each task has a clear input, output, allowed-file list, and acceptance criteria.
- Identify shared files and dependencies before dispatching workers.
- Give each worker only the context and permissions needed for its task.
- Collect worker summaries and actual diffs or patch files.
- Review the actual changes rather than trusting completion messages.
- Reject duplicated, conflicting, out-of-scope, or unverified changes.
- Apply accepted patches in a controlled sequence and run final validation.
- Own the final delivery report and accurately state what was and was not tested.

### 6.2 Worker Agent responsibilities

Each worker should receive one bounded assignment containing:

- Task ID and objective.
- Relevant plan section and code location.
- Allowed files and prohibited actions.
- Exact acceptance criteria.
- Required output format, preferably a patch/diff plus a concise summary.

A worker must not silently expand scope, edit shared files outside its assignment, or perform repository-level delivery operations unless explicitly delegated.

### 6.3 Prevent concurrent write conflicts

For tasks that touch the same file, do not allow multiple workers to write directly to the same working tree at the same time.

Use one of these approaches:

1. **Preferred for shared files:** workers produce independent patches without directly modifying the shared integration copy; the Master Agent reviews and applies them sequentially.
2. **For larger tasks:** give workers separate Git worktrees or branches, then have the Master Agent inspect and integrate their commits.
3. **For genuinely independent files:** parallel execution may be allowed after confirming there are no shared generated files, shared state, or overlapping dependencies.

Parallelize analysis and patch preparation where safe; serialize integration when workers touch the same file.

## 7. Delivery and Safety Rules

- The plan in GitHub is the authoritative task source. Re-read it before each step and after each push.
- Each step should have explicit, machine-checkable acceptance criteria.
- Use the smallest practical tool permissions for each worker.
- Keep implementation, validation, and Git delivery responsibilities distinct.
- Do not delete or overwrite local helper files as a cleanup shortcut.
- Do not run destructive Git commands automatically to recover from a failed run.
- A failed push or interrupted commit requires inspecting the actual local and remote state before retrying.
- Do not merge or deploy unless the task's delivery instructions and repository workflow authorize it.
- Report commit, push, PR, merge, and deployment as separate states.
- Record failed, skipped, and unexecuted checks honestly.

## 8. Suggested Next Development Stages

| Stage | Goal | Completion evidence |
|---|---|---|
| A. Stable single-worker runner | Make plan parsing, check-only mode, validation, and per-step delivery reliable | Five separate statuses; one controlled step can complete and push |
| B. Patch-based workers | Let multiple workers prepare isolated patches without shared working-tree writes | Each worker returns a patch and a task-specific report |
| C. Master review | Validate all worker patches against plan scope and acceptance criteria | Master review report and rejected-change handling |
| D. Controlled integration | Apply accepted patches sequentially or integrate isolated branches/worktrees | Consolidated diff passes scope checks |
| E. End-to-end orchestration | Connect planning, dispatch, review, integration, and repository delivery | Reproducible run record with commits and truthful test/deployment status |

Do not skip Stage A. A reliable single-worker runner is the foundation for safe multi-Agent orchestration.

## 9. Current Experiment Status

- [x] Five independent low-risk tasks have been described in the root `PLAN.md`.
- [x] A local PowerShell-to-Claude-Code orchestration approach has been prepared.
- [x] Repository synchronization, plan retrieval, constrained Agent execution, validation, and per-step Git delivery have been designed into the runner.
- [x] Check-only mode has been added to validate plan parsing without invoking Claude Code.
- [x] The PowerShell array-return issue was identified; the local script was manually adjusted to use `return $steps`.
- [ ] The corrected check-only run has not yet been confirmed to display all five individual pending steps.
- [ ] The five comment tasks have not been confirmed as executed by this experiment.
- [ ] Five independently launched worker Agents and a Master Agent review/integration stage have not yet been implemented.

This status describes the workflow experiment only. It does not claim that the five planned source-code comment changes have been completed.
