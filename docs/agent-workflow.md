# Agent Workflow Guide

This document records the current Agent workflow in this repository: what is implemented, how to start it, how failures are handled, and the intended path toward a Master Agent plus multiple Worker Agents.

## 1. Purpose

The goal is to make small, well-bounded repository tasks executable through an Agent workflow instead of relying on manual copy-and-paste for every step.

The experiment uses the five-step plan in the repository root `PLAN.md`. Each step adds exactly one explanatory HTML comment to `index.html` and changes only that step's target checkbox in `PLAN.md`.

This is a workflow validation exercise, not a product feature change.

## 2. Files and Their Relationships

| File | Role |
|---|---|
| `PLAN.md` (root) | Single source of truth for task definitions, scope, and completion state. Read from GitHub (`git show <ref>:PLAN.md`) on every cycle. |
| `run-plan.ps1` (root) | Orchestrator: sync, select step, start worker, validate, commit, push. Windows PowerShell 5.1 compatible, ASCII only. |
| `tests/agent-workflow/test-run-plan.ps1` | Offline tests for the orchestrator (temporary Git repositories, local bare remote, fake `claude`). No network, no real Claude Code. |
| `CLAUDE.md` (root) | Rules for every Claude Code session in this repository, including the headless worker started by the orchestrator. |
| `docs/agent-workflow.md` | This guide. |
| `.git/run-plan-logs/` | Per-step prompt and worker output logs. Inside `.git`, so never tracked and never seen as an untracked file. |
| `index.html` | The only target file of the current five steps. |

```text
Human owner
    |  starts
    v
run-plan.ps1 --(git fetch / git show origin/<ref>:PLAN.md)--> GitHub
    |  one step section, via stdin
    v
claude -p (headless worker, tools: Read, Edit, Grep, Glob)
    |  edits index.html + PLAN.md checkbox
    v
run-plan.ps1 validation --> git commit --> git push origin feat/agent-plan-steps
                                               |
                                   protected experiment remains isolated; no automatic merge
```

## 3. How to Start

Always start from the repository root:

```powershell
cd <repository-root>   # the directory that contains .git, PLAN.md and run-plan.ps1
```

Use a process-scoped execution-policy bypass. Do not change the machine-wide policy.

```powershell
# 1. Offline tests (safe, no network, no Claude Code)
powershell -ExecutionPolicy Bypass -File .\tests\agent-workflow\test-run-plan.ps1

# 2. Read-only status (git fetch only: no pull, no checkout, no Claude Code, no commit)
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -CheckOnly

# 3. Execute exactly one pending step (default MaxLoops = 1)
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1

# 4. Execute up to N pending steps sequentially
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -MaxLoops 5
```

Alternative for an already open session: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force`, then `.\run-plan.ps1 -CheckOnly`.

Parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `-CheckOnly` | off | Read-only status report |
| `-MaxLoops` | `1` | Maximum steps per run (1-5) |
| `-WorkBranch` | `feat/agent-plan-steps` | Branch that receives the step commits |

Preconditions for execution mode: `origin` points to `https://github.com/ouyangxinwei/daily_weekly_planner.git`, tracked files are clean, `git` and `claude` are on `PATH`. Untracked local helper files are allowed and protected.

## 4. Execution Sequence

1. Verify `git`, `claude`, repository root and `origin` URL.
2. Refuse to start if tracked files have local changes.
3. `git fetch origin`.
4. Choose the PLAN source ref: `origin/feat/agent-plan-steps` if it exists, otherwise `origin/main`.
5. Snapshot untracked files (SHA-256) and stop if any of them collides with a path in the source ref.
6. Switch to the work branch: reuse the local branch (fast-forward only), track the remote branch, or create it from `origin/main`. Stop if the local branch has unpushed commits.
7. For each cycle (up to `-MaxLoops`):
   1. Read `PLAN.md` from the source ref with `git show`; stop if it differs from the local file.
   2. Parse Step 1-5; pick the first step whose bold-label target checkbox is `[ ]`.
   3. Write the worker prompt (step section + strict rules) to `.git/run-plan-logs/step-N-<time>.prompt.txt`.
   4. Run `claude -p --permission-mode dontAsk --allowedTools "Read,Edit,Grep,Glob" --disallowedTools "Bash,Write,NotebookEdit,WebFetch,WebSearch"` with the prompt on stdin; output goes to the matching `.log.txt` and is printed.
   5. Validate (section 5). Any failure stops the run.
   6. `git add -- PLAN.md index.html`, commit `chore(plan): complete step N`, `git push -u origin feat/agent-plan-steps`.
8. Print a reminder that nothing was merged or deployed.

The orchestrator never pushes to `main` or `development`, never opens or merges a pull request, and never deploys. `feat/agent-plan-steps` remains an isolated protected experiment. Normal product work takes place on `development`; it reaches `main` only after explicit owner approval.

## 5. Validation Rules (Machine-Checked)

For each step the orchestrator enforces:

- `git diff HEAD --check` passes.
- Exactly two tracked files changed: `PLAN.md` and `index.html`.
- `index.html`: exactly one added line, zero deleted lines.
- The added line is one complete single-line HTML comment, not empty, without `--` or `<!` inside.
- The comment contains no Chinese or Japanese characters.
- The line directly after the comment contains the step's insert-position anchor (the first backtick span of the `**插入位置：**` bullet, with a trailing ` ...` removed), and that is the first occurrence of the anchor in the file.
- `PLAN.md` equals the source plan with only this step's target checkbox changed from `[ ]` to `[x]` (numstat 1/1).
- Untracked files are unchanged: none removed, modified, or newly created.

Completion is judged by the diff, never by the worker's narrative report.

## 6. Safe Check-Only Mode

`-CheckOnly` runs `git fetch` and then reads everything from Git refs. It does not pull, switch branches, start Claude Code, or commit, and it works even with local tracked changes.

Example output for the current plan:

```text
Current branch : main
Work branch    : feat/agent-plan-steps
PLAN source    : origin/main
Tracked changes: none
Local vs source: ahead 0, behind 0

PLAN.md step status (5 steps):
  Step 1: PENDING   anchor hits in index.html: 1  [<script data-workspace-boot>]
  Step 2: PENDING   anchor hits in index.html: 1  [<div class="workspace-switch"]
  Step 3: PENDING   anchor hits in index.html: 1  [<section class="star-summary"]
  Step 4: PENDING   anchor hits in index.html: 1  [<form class="quick-add" id="quick-add-form"]
  Step 5: PENDING   anchor hits in index.html: 1  [<section class="sync-panel" aria-label="云端同步"]

Next step: Step 1
Check-only mode completed. No pull, no checkout, no Claude Code, no commit.
```

Acceptance: five separate step lines, and every anchor hit count is `1` for pending steps.

## 7. Failure, Stop, and Recovery

Every failed command or validation throws, prints `STOPPED: <reason>` plus recovery hints, and exits with code 1. Nothing is rolled back automatically, so the evidence stays in the working tree.

| Situation | What to check | Recovery |
|---|---|---|
| Tracked files dirty at start | `git status` | Commit, stash, or restore your own changes first |
| Untracked file conflicts with a remote path | The path in the message | Move or rename the local file manually |
| Local `PLAN.md` differs from source | `git log`, `git diff origin/<ref> -- PLAN.md` | Bring the work branch in line with its remote |
| Worker exit code not 0 | `.git/run-plan-logs/step-N-*.log.txt` | Fix the cause, discard the partial change, re-run |
| Validation failed | `git diff` | `git restore --source=HEAD --staged --worktree -- PLAN.md index.html`, then re-run |
| Commit succeeded but push failed | `git status` shows "ahead" | `git push -u origin feat/agent-plan-steps`, then `-CheckOnly` |
| Unpushed commits on the work branch | Message names the count | Push them, or inspect and reset manually |
| Ctrl+C during the worker | `git diff` | Same as validation failure |

The recovery command for a failed step only touches the two allowed files. Do not use `git clean` or `git reset --hard` as a shortcut; they would destroy local helper files.

The original experiment notes below describe the workflow as it existed when those runs were performed. Under the current repository policy, `feat/agent-plan-steps` remains isolated and is not routinely proposed for merge. Normal product changes are made on `development`, and the owner must explicitly approve any integration into `main`.

## 8. Implementation Lessons

### 8.1 Parse the plan structure, not a guessed string

Step headings use a full-width colon (`### Step 1：...`). The parser accepts any non-digit after the step number, and finds the single bold-label target checkbox (`- [ ] **目标：** ...`) inside that step's section only. Other checkboxes in the plan (global acceptance, status notes) are never treated as steps.

A step section ends at the next heading of level 1-3. The earlier version only stopped at `###`, so Step 5 absorbed sections 5-8 of the plan and its prompt contained unrelated checklists.

### 8.2 PowerShell array output

PowerShell enumerates arrays returned from functions. `Get-PlanSteps` uses `return $steps` and callers wrap the result in `@(...)`. The check-only output is the acceptance check: five separate step lines.

### 8.3 Never pass the prompt as a command-line argument in Windows PowerShell 5.1

`claude` is a native executable. Windows PowerShell 5.1 drops embedded double quotes from native arguments, so `<div class="workspace-switch"` reached the worker as `<div class=workspace-switch`. The prompt is now written to a UTF-8 file (no BOM) and redirected to `claude -p` through `cmd.exe`. Piping a string directly also works for quotes but adds a BOM.

### 8.4 Native stderr with ErrorActionPreference = Stop

Git writes progress messages such as "Switched to a new branch" to stderr. When output is redirected in Windows PowerShell 5.1 these become ErrorRecords and abort the script. The Git helpers run with `Continue` and judge success by exit code only.

### 8.5 Read the plan from Git, not from raw.githubusercontent.com

The raw URL is served through a CDN cache and could return a stale plan right after a push. `git fetch` plus `git show <ref>:PLAN.md` is exact. The console output encoding is set to UTF-8 for the run so Chinese text from Git is decoded correctly.

### 8.6 Keep the script ASCII

Windows PowerShell 5.1 reads BOM-less scripts in the system code page. Chinese labels used in regular expressions are written as `\uXXXX` escapes.

### 8.7 Least privilege for the worker

The worker has `Read`, `Edit`, `Grep`, `Glob` only, in `dontAsk` mode so anything else is denied instead of waiting for a prompt. `Write` is excluded so the worker cannot replace the whole `index.html`.

### 8.8 Separate implementation from Git operations

The worker never runs Git. The orchestrator owns staging, commit, and push so the commit boundary and allowed file list are centralized and auditable.

### 8.9 Fail closed

If the plan cannot be parsed, the local plan differs from the source, the worker changes an unexpected file, or validation fails, the workflow stops. It never marks a step complete based on the worker's report.

## 9. Current Scope Versus the Multi-Agent Target

**Implemented:** one PowerShell orchestrator invokes one headless Claude Code worker for one pending step at a time, validates the result, then commits and pushes it to a work branch. The loop can process multiple steps sequentially.

**Not yet implemented:** a Master Agent that launches independent worker Agents, manages their separate contexts, collects their patches, resolves conflicts, and performs a consolidated review.

The five tasks are logically independent, but they all modify `index.html`. Logical independence does not make concurrent writes safe.

## 10. Intended Master Agent and Worker Agent Architecture

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
    +--> Worker Agent 1 .. Worker Agent N
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
       Commit / Push work branch / PR
       (merge and deploy stay human decisions)
```

### 10.1 Master Agent responsibilities

- Read the repository instructions, branch state, and task plan.
- Confirm each task has an input, output, allowed-file list, and acceptance criteria.
- Identify shared files and dependencies before dispatching workers.
- Give each worker only the context and permissions it needs.
- Collect worker summaries and the actual diffs or patch files.
- Review actual changes rather than trusting completion messages.
- Reject duplicated, conflicting, out-of-scope, or unverified changes.
- Apply accepted patches sequentially and run final validation.
- Own the final report and state accurately what was and was not tested.

### 10.2 Worker Agent responsibilities

Each worker receives one bounded assignment: task ID and objective, plan section and code location, allowed files and prohibited actions, acceptance criteria, and the required output (a patch plus a short summary). A worker must not expand scope, edit shared files outside its assignment, or perform repository delivery operations.

### 10.3 Prevent concurrent write conflicts

1. **Shared files (preferred):** workers produce patches without writing to the integration copy; the Master applies them one at a time.
2. **Larger tasks:** each worker gets its own Git worktree or branch; the Master inspects and integrates.
3. **Truly independent files:** parallel execution after confirming no shared generated files or state.

### 10.4 How this runner maps onto that design

The current `run-plan.ps1` already contains the pieces a Master needs; the planned extension reuses them:

| Current function | Future role |
|---|---|
| `Get-PlanSteps`, `Get-PendingStep` | Master: split plan into assignments |
| `Get-WorkerPrompt` | Master: build each worker brief |
| `Invoke-ClaudeWorker` | Dispatch one worker; run N of them in separate `git worktree` directories for parallel patch preparation |
| `Assert-StepChange` | Master review: validate each patch against its step |
| Commit / push block | Controlled integration: apply accepted patches in order on the work branch, then one consolidated check |

Suggested extension path: (1) add a `-PatchOnly` mode where each worker runs in its own worktree and the orchestrator saves `git diff` as `step-N.patch` without committing; (2) validate each patch with `Assert-StepChange` inside its worktree; (3) apply patches sequentially with `git apply --3way` on the work branch, re-running the validation for each; (4) optionally hand the review to a Master Claude session that reads the patches and the plan and returns accept/reject.

## 11. Delivery and Safety Rules

- The plan in GitHub is the authoritative task source. Re-read it before each step and after each push.
- Each step needs explicit, machine-checkable acceptance criteria.
- Use the smallest practical tool permissions for each worker.
- Keep implementation, validation, and Git delivery responsibilities distinct.
- Do not delete or overwrite local helper files as a cleanup shortcut.
- Do not run destructive Git commands automatically to recover from a failed run.
- Inspect local and remote state before retrying a failed push or commit.
- The orchestrator pushes only to its work branch; merge and deploy require a human-reviewed PR.
- Report commit, push, PR, merge, and deployment as separate states.
- Record failed, skipped, and unexecuted checks honestly.
- Never delete the protected test branch `feat/agent-plan-steps` without explicit owner confirmation (section 17).

## 12. Suggested Next Development Stages

| Stage | Goal | Completion evidence |
|---|---|---|
| A. Stable single-worker runner | Reliable parsing, check-only, validation, per-step delivery | Five separate statuses; one controlled step completes and pushes |
| B. Patch-based workers | Multiple workers prepare isolated patches | Each worker returns a patch and a report |
| C. Master review | Validate all patches against plan scope | Review report with rejected-change handling |
| D. Controlled integration | Apply accepted patches sequentially | Consolidated diff passes scope checks |
| E. End-to-end orchestration | Planning, dispatch, review, integration, delivery | Reproducible run record with truthful test/deploy status |

Do not skip Stage A.

## 13. Current Status (2026-11-25)

- [x] Five independent low-risk tasks are described in root `PLAN.md`.
- [x] `run-plan.ps1` implements sync, plan parsing, single-worker execution, validation, commit, and push to `feat/agent-plan-steps`.
- [x] Fixed: Step 5 section boundary, prompt quote loss, Git stderr abort, raw URL cache, check-only now read-only.
- [x] Added: anchor position check, English-only comment check, Edit-only worker tools, per-step logs, recovery hints.
- [x] `tests/agent-workflow/test-run-plan.ps1`: 38 offline checks pass.
- [x] `-CheckOnly` against GitHub shows five separate pending steps, each anchor found exactly once.
- [x] `run-plan.ps1`, the test, `CLAUDE.md`, and this guide are submitted through a PR from `feat/agent-workflow-runner` to `main`. Merging is a human decision.
- [x] Stage A proven: Step 1-5 were executed by the real headless Claude Code worker, one step per run, all validations passed (section 15).
- [x] The final result was verified independently of the runner (section 16).
- [ ] The five step commits live on `feat/agent-plan-steps` only. Whether they are merged into `main` or discarded is the owner's decision. Until they are merged, `PLAN.md` on `main` still shows all five steps as `[ ]`.
- [ ] Browser/PWA behavior was not checked (comment-only change; section 16 proves no other byte changed).
- [ ] Master Agent and parallel worker stages (B-E) are not implemented.

**Next action:** continue with Stage B. `feat/agent-plan-steps` is kept as the test record (see section 17); merging it into `main` is optional and is the owner's decision.

## 14. Known Risks and Limitations

| Risk | Impact | Mitigation / follow-up |
|---|---|---|
| Only one real run exists (five comment-only steps, Claude Code 2.1.332) | Larger or different tasks may fail in ways not yet seen | Keep `-MaxLoops 1` for new plans and read `.git/run-plan-logs/` after each step |
| Change detection covers tracked and non-ignored untracked files only | Edits to git-ignored files (for example `node_modules/`) or files outside the repository would not be detected | `Edit` is not path-restricted yet; follow-up: add a path-scoped permission rule such as `Edit(index.html)` after verifying the syntax, or hash ignored files too |
| The worker inherits the user's Claude Code settings, hooks, and MCP servers | A user-level hook or MCP tool could act outside the stated tool list | Review user settings before a real run; consider `--strict-mcp-config` / a dedicated settings file |
| `dontAsk` and `--allowedTools` behavior depends on the installed Claude Code version | A CLI upgrade could change flags | Re-run `claude --help` and the first step alone after upgrades |
| Concurrent runs are not locked | Two runners could race on the same work branch | Run one instance at a time |
| Step count (5), target file, and allowed files are hard-coded | New plans need script changes | Planned for the Master Agent stage |
| Commits on `feat/agent-plan-steps` are pushed without review | Bad commits reach GitHub (not `main`) | Nothing reaches `main` without a reviewed PR |

## 15. Execution Record (2026-11-25)

First real end-to-end run of the runner with the headless Claude Code worker.

- Base: `origin/main` = `968dcbd`. Work branch `feat/agent-plan-steps` was created by the runner from `origin/main`.
- Runner version: `run-plan.ps1` from PR #91 (`feat/agent-workflow-runner`, commit `beb8045`). Because PR #91 was not merged yet, the file was copied to a temporary directory (`git show origin/feat/agent-workflow-runner:run-plan.ps1`) and started with the repository root as the current directory. The script depends only on the current directory, not on its own location.
- Worker: `claude -p`, Claude Code 2.1.332, tools `Read,Edit,Grep,Glob`, `--permission-mode dontAsk`.

| Order | Command | Result |
|---|---|---|
| 0 | `run-plan.ps1 -CheckOnly` | 5 x PENDING, every anchor found once |
| 1 | `run-plan.ps1 -MaxLoops 1` | Step 1 -> `9295d0b`, all checks passed, pushed |
| 2 | same | Step 2 -> `626935c` |
| 3 | same | Step 3 -> `6e9936d` |
| 4 | same | Step 4 -> `b330bb0` |
| 5 | same | Step 5 -> `54c058c` |
| 6 | independent verification (section 16) | all checks matched |
| 7 | `run-plan.ps1 -CheckOnly` | PLAN source `origin/feat/agent-plan-steps`, 5 x COMPLETED, "Next step: none" |

Each step was inspected (`git show --stat HEAD`) before the next one was started. Prompts and worker outputs are in `.git/run-plan-logs/step-N-<time>.*.txt` on the machine that ran them (not versioned).

Comments added to `index.html` (one per step, each directly above its anchor):

| Step | Anchor | Comment (start) |
|---|---|---|
| 1 | `<script data-workspace-boot>` | `<!-- Restore the last selected workspace before the main UI initializes, ...` |
| 2 | `<div class="workspace-switch"` | `<!-- Workspace switch: toggles between the plan, standalone language learning, ...` |
| 3 | `<section class="star-summary"` | `<!-- Star summary: shows the priority distribution of unfinished tasks ...` |
| 4 | `<form class="quick-add" id="quick-add-form"` | `<!-- Quick add form: creates a plan for today from a title only, ...` |
| 5 | `<section class="sync-panel" aria-label="云端同步"` | `<!-- Cloud sync: entry points for syncing the current module only and for syncing all modules ...` |

Observation: the worker printed "Denying Bash also turns off the PowerShell tool" once. This is expected with `--disallowedTools Bash` and harmless.

## 16. How to Verify That All Steps Are Correct

Principle: **judge by the actual diff, never by the worker's report.** Three layers.

### 16.1 Per step (automatic, inside the runner)

Section 5 rules run before every commit; any failure stops the run before anything is committed.

### 16.2 After all steps (independent, run by a human or reviewer)

Run in Git Bash from the repository root. `M` is the base commit, `B` the work branch.

```bash
git fetch origin
M=968dcbd; B=origin/feat/agent-plan-steps

# 1. Exactly five commits, Step 1..5 in order
git log --oneline $M..$B

# 2. Every commit touches only PLAN.md and index.html
for c in $(git rev-list --reverse $M..$B); do
  echo "$(git log -1 --format=%s $c): $(git diff-tree --no-commit-id --name-only -r $c | tr '\n' ' ')"
done

# 3. Totals: index.html +5/-0, PLAN.md +5/-5
git diff --numstat $M $B

# 4. No whitespace errors
git diff --check $M $B && echo OK

# 5. Each added comment and the line right after it (must be the anchor)
git diff -U0 $M $B -- index.html | grep '^@@' | sed -E 's/^@@ -[0-9,]+ \+([0-9]+).*/\1/' |
  while read n; do git show $B:index.html | sed -n "${n}p;$((n+1))p" | cut -c1-110; echo; done

# 6. Reverse check: remove the added lines -> must hash identical to the original
git show $M:index.html | sha256sum
git show $B:index.html | grep -vxF -f <(git diff -U0 $M $B -- index.html | grep '^+[^+]' | sed 's/^+//') | sha256sum

# 7. Same for PLAN.md: turn the five target checkboxes back to [ ]
git show $M:PLAN.md | sha256sum
git show $B:PLAN.md | sed -E 's/^- \[x\] \*\*目标：\*\*/- [ ] **目标：**/' | sha256sum

# 8. Comment markers balanced (0 -> 5 for both)
for p in '<!--' '-->'; do echo "$p: $(git show $M:index.html | grep -o -- "$p" | wc -l) -> $(git show $B:index.html | grep -o -- "$p" | wc -l)"; done

# 9. No non-ASCII characters in the added lines (expect 0)
git diff -U0 $M $B -- index.html | grep '^+[^+]' | LC_ALL=C grep -c '[^ -~]'
```

Result of the 2026-11-25 run:

| # | Check | Result |
|---|---|---|
| 1 | 5 commits, Step 1..5 | OK |
| 2 | each commit: `PLAN.md index.html` only | OK |
| 3 | `index.html` 5/0, `PLAN.md` 5/5 | OK |
| 4 | `git diff --check` | OK |
| 5 | every comment directly above its anchor | OK |
| 6 | `index.html` without the 5 lines == original (`161f4e4b...`) | identical |
| 7 | `PLAN.md` with boxes reverted == original (`5282dccb...`) | identical |
| 8 | `<!--` and `-->`: 0 -> 5 | OK |
| 9 | non-ASCII in added lines | 0 |

Check 6 is the strongest one: if the file minus the five added lines is byte-identical to the original, then no existing JavaScript, CSS, attribute, or text can have changed. Reading a diff by eye can miss things; an identical hash cannot.

### 16.3 Plan state

`run-plan.ps1 -CheckOnly` reads `PLAN.md` from the work branch on GitHub and must report all five steps as COMPLETED with "Next step: none". This shows the recorded plan state matches the verified code change.

## 17. Protected Test Branch `feat/agent-plan-steps`

`feat/agent-plan-steps` holds the result of the first real run (section 15) and is the reference for the verification in section 16. The repository owner has asked for it to be kept.

- Do not delete it, locally or on GitHub, unless there is a specific need. It is excluded from the usual "delete after merge" cleanup in [Git branching workflow](git-branching-workflow.md), even if it is merged.
- Deleting it requires explicit confirmation from the repository owner. AI assistants must not delete it on their own.
- All five steps on this branch are completed. Because the runner reads `PLAN.md` from `origin/<WorkBranch>` when that branch exists, a run with the default `-WorkBranch` will only report "All 5 steps are marked as completed". For a new plan, start from an updated `main` and pass a new branch name, for example:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -CheckOnly -WorkBranch feat/agent-plan-v2
powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -WorkBranch feat/agent-plan-v2
```


## 18. Current repository branch policy (2026-11-26)

The historical execution records above are preserved as evidence and may refer to the former PR-to-main workflow. The current repository-wide policy is defined in [Git 分支工作流](git-branching-workflow.md):

- \`development\` is the only routine product-development branch.
- \`main\` is the stable deployment branch. Integrating \`development\` into \`main\` requires explicit approval from the repository owner for that specific integration.
- \`feat/agent-plan-steps\` is a separately protected Agent experiment branch. It is not a routine development branch and is not automatically merged or deleted.
- No additional feature branch is created for ordinary tasks. If a special isolated branch is technically necessary, explain why and obtain approval first.
