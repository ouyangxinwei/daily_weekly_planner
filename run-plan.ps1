<#
.SYNOPSIS
    Executes PLAN.md steps one at a time with a headless Claude Code worker.

.DESCRIPTION
    Flow per step:
      fetch GitHub -> read PLAN.md from the source ref -> pick the first
      pending step -> run Claude Code (Read/Edit only) -> validate the change
      set -> commit -> push the work branch -> re-read PLAN.md.

    The script never merges, never opens a pull request, never pushes to
    main and never deploys. See docs/agent-workflow.md.

.PARAMETER MaxLoops
    Maximum number of steps to execute in this run. Default: 1.

.PARAMETER CheckOnly
    Read-only status report. Runs "git fetch" only; no pull, no checkout,
    no Claude Code, no commit.

.PARAMETER WorkBranch
    Branch that receives the step commits. Created from origin/main when it
    does not exist yet.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -CheckOnly
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\run-plan.ps1 -MaxLoops 1
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 5)]
    [int]$MaxLoops = 1,

    [switch]$CheckOnly,

    [ValidatePattern('^[A-Za-z0-9._/-]+$')]
    [string]$WorkBranch = "feat/agent-plan-steps"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
$ExpectedRepo = "https://github.com/ouyangxinwei/daily_weekly_planner.git"
$Remote = "origin"
$BaseBranch = "main"
$PlanFile = "PLAN.md"
$TargetFile = "index.html"
$StepCount = 5
$AllowedFiles = @($PlanFile, $TargetFile)
$WorkerAllowedTools = "Read,Edit,Grep,Glob"
$WorkerDisallowedTools = "Bash,Write,NotebookEdit,WebFetch,WebSearch"
$LogDirName = "run-plan-logs"

# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------
# Windows PowerShell 5.1 turns native stderr lines into ErrorRecords when
# output is redirected; with ErrorActionPreference=Stop that would abort on
# harmless Git progress messages. Git helpers therefore run with Continue
# and rely on the exit code only.
function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & git @Arguments 2>&1 | ForEach-Object { Write-Host $_.ToString() }
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previous
    }
    if ($exitCode -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
}

function Get-GitLines {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = @(& git @Arguments 2>$null)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previous
    }
    if ($exitCode -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')"
    }
    return ,$output
}

function Test-GitRef {
    param([Parameter(Mandatory = $true)][string]$Ref)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & git rev-parse --verify --quiet $Ref 2>$null | Out-Null
        return ($LASTEXITCODE -eq 0)
    }
    finally {
        $ErrorActionPreference = $previous
    }
}

function Get-RefFileText {
    param(
        [Parameter(Mandatory = $true)][string]$Ref,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $lines = Get-GitLines @("show", "${Ref}:$Path")
    return ($lines -join "`n")
}

function Get-AheadCount {
    param(
        [Parameter(Mandatory = $true)][string]$From,
        [Parameter(Mandatory = $true)][string]$To
    )

    $lines = Get-GitLines @("rev-list", "--count", "$From..$To")
    return [int]$lines[0]
}

function Get-UntrackedSnapshot {
    $files = Get-GitLines @("ls-files", "--others", "--exclude-standard")

    $snapshot = @{}
    foreach ($file in $files) {
        if (Test-Path -LiteralPath $file -PathType Leaf) {
            $snapshot[$file] = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        }
    }

    return ,$snapshot
}

function Test-UntrackedUnchanged {
    param([Parameter(Mandatory = $true)][hashtable]$Before)

    $after = Get-UntrackedSnapshot

    foreach ($file in $Before.Keys) {
        if (-not $after.ContainsKey($file)) {
            throw "An existing untracked file was removed: $file"
        }
        if ($Before[$file] -ne $after[$file]) {
            throw "An existing untracked file was modified: $file"
        }
    }

    foreach ($file in $after.Keys) {
        if (-not $Before.ContainsKey($file)) {
            throw "A new untracked file was created: $file"
        }
    }
}

function Test-UntrackedConflicts {
    param(
        [Parameter(Mandatory = $true)][hashtable]$Snapshot,
        [Parameter(Mandatory = $true)][string]$Ref
    )

    $remoteFiles = Get-GitLines @("ls-tree", "-r", "--name-only", $Ref)
    $remoteSet = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($remoteFile in $remoteFiles) { [void]$remoteSet.Add($remoteFile) }

    foreach ($localFile in $Snapshot.Keys) {
        if ($remoteSet.Contains($localFile)) {
            throw "An untracked local file conflicts with a path in ${Ref}: $localFile"
        }
        foreach ($remoteFile in $remoteFiles) {
            if ($localFile.StartsWith("$remoteFile/") -or $remoteFile.StartsWith("$localFile/")) {
                throw "An untracked local file conflicts with a path in ${Ref}: $localFile"
            }
        }
    }
}

function Test-CleanWorkingTree {
    $status = Get-GitLines @("status", "--porcelain", "--untracked-files=no")
    if ($status.Count -gt 0) {
        throw "Tracked files contain local changes. Commit, stash or restore them before running this script."
    }
}

# ---------------------------------------------------------------------------
# PLAN.md parsing
# ---------------------------------------------------------------------------
function Normalize-Text {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text)

    return $Text.Replace("`r`n", "`n").Replace("`r", "`n").TrimEnd()
}

function Get-StepAnchor {
    param([Parameter(Mandatory = $true)][AllowEmptyCollection()][AllowEmptyString()][string[]]$Lines)

    # Matches the "insert position" bullet; the label is written with
    # Unicode escapes so this file stays ASCII for Windows PowerShell 5.1.
    $pattern = '^\s*-\s*\*\*\u63D2\u5165\u4F4D\u7F6E[:\uFF1A]?\*\*.*?`(?<anchor>[^`]+)`'
    foreach ($line in $Lines) {
        $match = [regex]::Match($line, $pattern)
        if ($match.Success) {
            $anchor = $match.Groups["anchor"].Value
            $anchor = ($anchor -replace '\s*\.\.\..*$', '').Trim()
            return $anchor
        }
    }
    return $null
}

function Get-PlanSteps {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Plan)

    $lines = $Plan -split '\r?\n'
    $sections = @{}
    $currentStep = $null
    $sectionLines = New-Object 'System.Collections.Generic.List[string]'

    foreach ($line in $lines) {
        if ($line -match '^###\s+Step\s+(\d+)(?=\D|$)') {
            if ($null -ne $currentStep) {
                $sections[[int]$currentStep] = @($sectionLines.ToArray())
            }
            $currentStep = [int]$Matches[1]
            $sectionLines = New-Object 'System.Collections.Generic.List[string]'
            [void]$sectionLines.Add($line)
            continue
        }

        if ($null -ne $currentStep) {
            # Any heading of level 1-3 ends the current step section.
            if ($line -match '^#{1,3}\s') {
                $sections[[int]$currentStep] = @($sectionLines.ToArray())
                $currentStep = $null
                $sectionLines = New-Object 'System.Collections.Generic.List[string]'
            }
            else {
                [void]$sectionLines.Add($line)
            }
        }
    }

    if ($null -ne $currentStep) {
        $sections[[int]$currentStep] = @($sectionLines.ToArray())
    }

    $steps = @()
    for ($number = 1; $number -le $StepCount; $number++) {
        if (-not $sections.ContainsKey($number)) {
            throw "PLAN.md is missing Step $number."
        }

        $targetLines = @(
            $sections[$number] | Where-Object {
                $_ -match '^\s*-\s*\[[ xX]\]\s*\*\*[^*]+\*\*'
            }
        )

        if ($targetLines.Count -ne 1) {
            throw "Step $number must contain exactly one bold-label target checkbox. Found: $($targetLines.Count)"
        }

        $null = ([string]$targetLines[0]) -match '^\s*-\s*\[(?<state>[ xX])\]'
        $state = $Matches["state"]

        $body = @($sections[$number])
        while ($body.Count -gt 0 -and [string]::IsNullOrWhiteSpace($body[-1])) {
            $body = @($body[0..($body.Count - 2)])
        }

        $steps += [pscustomobject]@{
            Number  = $number
            State   = $state
            Anchor  = (Get-StepAnchor -Lines $body)
            Content = ($body -join "`n")
        }
    }

    return $steps
}

function Get-PendingStep {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Plan)

    foreach ($step in @(Get-PlanSteps -Plan $Plan)) {
        if ($step.State -eq " ") {
            return $step
        }
    }
    return $null
}

function Get-ExpectedCompletedPlan {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Plan,
        [Parameter(Mandatory = $true)][int]$Step
    )

    $lines = $Plan -split '\r?\n'
    $currentStep = $null
    $changed = 0

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^###\s+Step\s+(\d+)(?=\D|$)') {
            $currentStep = [int]$Matches[1]
            continue
        }
        if ($lines[$i] -match '^#{1,3}\s') {
            $currentStep = $null
            continue
        }

        if ($currentStep -eq $Step -and $lines[$i] -match '^\s*-\s*\[ \]\s*\*\*[^*]+\*\*') {
            $lines[$i] = ([regex]'\[ \]').Replace($lines[$i], '[x]', 1)
            $changed++
        }
    }

    if ($changed -ne 1) {
        throw "Expected exactly one pending target checkbox in Step $Step. Found: $changed"
    }

    return ($lines -join "`n")
}

# ---------------------------------------------------------------------------
# Validation of one worker change set
# ---------------------------------------------------------------------------
function Get-NumStat {
    param([Parameter(Mandatory = $true)][string]$Path)

    $stats = Get-GitLines @("diff", "HEAD", "--numstat", "--", $Path)
    if ($stats.Count -ne 1) {
        throw "Unexpected diff statistics for $Path."
    }
    $parts = $stats[0] -split "`t"
    return [pscustomobject]@{ Added = $parts[0]; Deleted = $parts[1] }
}

function Assert-StepChange {
    param(
        [Parameter(Mandatory = $true)][int]$Step,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$BasePlan,
        [AllowNull()][AllowEmptyString()][string]$Anchor
    )

    & git diff HEAD --check
    if ($LASTEXITCODE -ne 0) {
        throw "Git whitespace validation failed."
    }

    $changedFiles = Get-GitLines @("diff", "HEAD", "--name-only")
    if ($changedFiles.Count -ne 2) {
        throw "Expected exactly two changed tracked files. Found: $($changedFiles.Count) ($($changedFiles -join ', '))"
    }
    foreach ($file in $changedFiles) {
        if ($file -notin $AllowedFiles) {
            throw "Unexpected tracked file modification: $file"
        }
    }
    if ($PlanFile -notin $changedFiles -or $TargetFile -notin $changedFiles) {
        throw "Both $PlanFile and $TargetFile must be modified."
    }

    # Target file: exactly one added line, zero deletions.
    $targetStat = Get-NumStat -Path $TargetFile
    if ($targetStat.Added -ne "1" -or $targetStat.Deleted -ne "0") {
        throw "$TargetFile must have exactly one addition and zero deletions. Found: +$($targetStat.Added) -$($targetStat.Deleted)"
    }

    $diffLines = Get-GitLines @("diff", "HEAD", "--unified=0", "--", $TargetFile)
    $added = @($diffLines | Where-Object { $_ -match '^\+' -and $_ -notmatch '^\+\+\+' })
    if ($added.Count -ne 1) {
        throw "$TargetFile must contain exactly one added line. Found: $($added.Count)"
    }

    $commentMatch = [regex]::Match($added[0], '^\+\s*<!--(?<body>.*)-->\s*$')
    if (-not $commentMatch.Success) {
        throw "The added $TargetFile line must be one complete HTML comment."
    }
    $commentBody = $commentMatch.Groups["body"].Value
    if ($commentBody.Contains("--") -or $commentBody.Contains("<!") -or [string]::IsNullOrWhiteSpace($commentBody)) {
        throw "The HTML comment body is empty or contains forbidden sequences."
    }
    if ($commentBody -match '[\u3000-\u303F\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]') {
        throw "The HTML comment must not contain Chinese or Japanese characters."
    }

    # Position: the line right after the comment must hold the step anchor,
    # and that must be the first occurrence of the anchor in the file.
    if ([string]::IsNullOrWhiteSpace($Anchor)) {
        Write-Warning "Step $Step has no insert-position anchor in PLAN.md; position check skipped."
    }
    else {
        $hunk = @($diffLines | Where-Object { $_ -match '^@@ ' })
        $hunkMatch = [regex]::Match([string]$hunk[0], '^@@ -\d+(?:,\d+)? \+(?<line>\d+)')
        if (-not $hunkMatch.Success) {
            throw "Unable to read the diff hunk position for $TargetFile."
        }
        $commentLine = [int]$hunkMatch.Groups["line"].Value

        $fullPath = Join-Path (Get-Location).Path $TargetFile
        $fileLines = [System.IO.File]::ReadAllLines($fullPath, [System.Text.Encoding]::UTF8)
        if ($commentLine -ge $fileLines.Count) {
            throw "The HTML comment was added at the end of $TargetFile instead of before the anchor."
        }

        $nextLine = $fileLines[$commentLine]
        if (-not $nextLine.Contains($Anchor)) {
            throw "The HTML comment is not directly before the Step $Step anchor: $Anchor"
        }
        for ($i = 0; $i -lt $commentLine; $i++) {
            if ($fileLines[$i].Contains($Anchor)) {
                throw "The HTML comment is not before the first occurrence of the anchor: $Anchor"
            }
        }
    }

    # PLAN.md: only the target checkbox of this step may change.
    $expectedPlan = Get-ExpectedCompletedPlan -Plan $BasePlan -Step $Step
    $planPath = Join-Path (Get-Location).Path $PlanFile
    $updatedPlan = [System.IO.File]::ReadAllText($planPath, [System.Text.Encoding]::UTF8)
    if ((Normalize-Text $expectedPlan) -ne (Normalize-Text $updatedPlan)) {
        throw "$PlanFile contains changes beyond the expected Step $Step checkbox update."
    }

    $planStat = Get-NumStat -Path $PlanFile
    if ($planStat.Added -ne "1" -or $planStat.Deleted -ne "1") {
        throw "$PlanFile must contain exactly one checkbox replacement."
    }
}

# ---------------------------------------------------------------------------
# Worker invocation
# ---------------------------------------------------------------------------
function Get-WorkerPrompt {
    param([Parameter(Mandatory = $true)][pscustomobject]$Step)

    $n = $Step.Number
    return @"
You are a headless worker agent in the daily_weekly_planner repository.
You were started by run-plan.ps1. Nobody will answer questions: do not ask
for confirmation, execute directly.

Execute Step $n only.

PLAN SECTION:
$($Step.Content)

STRICT REQUIREMENTS:
1. Follow the supplied PLAN section exactly.
2. Execute Step $n only. Do not start another step.
3. Modify only $TargetFile and $PlanFile. Do not create, modify or delete any other file.
4. In $TargetFile add exactly one new line: a single-line HTML comment placed directly
   above the first line that contains the insert-position anchor. Keep the indentation
   of the anchor line. Do not change any existing line.
5. Write the comment text in English only. No Chinese or Japanese characters.
   Do not use "--" inside the comment.
6. In $PlanFile change only the target checkbox of Step $n from "- [ ]" to "- [x]".
7. Do not create test files. Do not run Git or shell commands.
8. Do not commit, push, merge, or deploy.
9. Report the exact line you added when finished.
"@
}

function Invoke-ClaudeWorker {
    param(
        [Parameter(Mandatory = $true)][string]$Prompt,
        [Parameter(Mandatory = $true)][string]$PromptPath,
        [Parameter(Mandatory = $true)][string]$LogPath
    )

    # The prompt is passed through a UTF-8 file on stdin. Passing it as a
    # command-line argument loses double quotes in Windows PowerShell 5.1.
    [System.IO.File]::WriteAllText($PromptPath, $Prompt, (New-Object System.Text.UTF8Encoding($false)))

    $command = 'claude -p --permission-mode dontAsk --allowedTools "{0}" --disallowedTools "{1}" < "{2}" > "{3}" 2>&1' -f `
        $WorkerAllowedTools, $WorkerDisallowedTools, $PromptPath, $LogPath

    & cmd.exe /d /c $command
    $exitCode = $LASTEXITCODE

    if (Test-Path -LiteralPath $LogPath) {
        Write-Host ([System.IO.File]::ReadAllText($LogPath, [System.Text.Encoding]::UTF8))
    }
    return $exitCode
}

# ---------------------------------------------------------------------------
# Branch handling
# ---------------------------------------------------------------------------
function Get-PlanSourceRef {
    $remoteWork = "refs/remotes/$Remote/$WorkBranch"
    if (Test-GitRef $remoteWork) {
        return "$Remote/$WorkBranch"
    }
    return "$Remote/$BaseBranch"
}

function Initialize-WorkBranch {
    $snapshot = Get-UntrackedSnapshot
    $sourceRef = Get-PlanSourceRef
    Test-UntrackedConflicts -Snapshot $snapshot -Ref $sourceRef

    $current = (Get-GitLines @("branch", "--show-current"))[0]
    $localWork = Test-GitRef "refs/heads/$WorkBranch"
    $remoteWork = Test-GitRef "refs/remotes/$Remote/$WorkBranch"

    if ($localWork) {
        if ($current -ne $WorkBranch) {
            Invoke-Git @("switch", $WorkBranch)
        }
        if ($remoteWork) {
            Invoke-Git @("merge", "--ff-only", "$Remote/$WorkBranch")
        }
    }
    elseif ($remoteWork) {
        Invoke-Git @("switch", "--track", "-c", $WorkBranch, "$Remote/$WorkBranch")
    }
    else {
        Invoke-Git @("switch", "-c", $WorkBranch, "$Remote/$BaseBranch")
    }

    Test-UntrackedUnchanged -Before $snapshot

    $ahead = Get-AheadCount -From $sourceRef -To "HEAD"
    if ($ahead -gt 0) {
        throw "Local $WorkBranch has $ahead commit(s) that are not on $sourceRef. Push them first: git push -u $Remote $WorkBranch"
    }
}

function Write-RecoveryHint {
    Write-Host ""
    Write-Host "Recovery options (nothing was rolled back automatically):"
    Write-Host "  git status"
    Write-Host "  git diff"
    Write-Host "  Discard the worker change of the failed step:"
    Write-Host "    git restore --source=HEAD --staged --worktree -- $PlanFile $TargetFile"
    Write-Host "  If only the push failed:"
    Write-Host "    git push -u $Remote $WorkBranch"
    Write-Host "  Then re-run: .\run-plan.ps1 -CheckOnly"
}

# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------
function Invoke-CheckOnly {
    Write-Host "Fetching GitHub (read-only status check)..."
    Invoke-Git @("fetch", $Remote)

    $sourceRef = Get-PlanSourceRef
    $current = (Get-GitLines @("branch", "--show-current"))[0]
    $dirty = (Get-GitLines @("status", "--porcelain", "--untracked-files=no")).Count -gt 0

    Write-Host ""
    Write-Host "Current branch : $current"
    Write-Host "Work branch    : $WorkBranch"
    Write-Host "PLAN source    : $sourceRef"
    Write-Host ("Tracked changes: {0}" -f $(if ($dirty) { "YES (run will refuse to start)" } else { "none" }))

    if ($current -eq $WorkBranch -or $current -eq $BaseBranch) {
        $ahead = Get-AheadCount -From $sourceRef -To "HEAD"
        $behind = Get-AheadCount -From "HEAD" -To $sourceRef
        Write-Host "Local vs source: ahead $ahead, behind $behind"
    }

    $plan = Get-RefFileText -Ref $sourceRef -Path $PlanFile
    $target = Get-RefFileText -Ref $sourceRef -Path $TargetFile
    $steps = @(Get-PlanSteps -Plan $plan)

    Write-Host ""
    Write-Host "PLAN.md step status ($($steps.Count) steps):"
    foreach ($step in $steps) {
        $status = if ($step.State -eq " ") { "PENDING  " } else { "COMPLETED" }
        $anchorCount = 0
        if ($step.Anchor) {
            $anchorCount = ([regex]::Matches($target, [regex]::Escape($step.Anchor))).Count
        }
        Write-Host ("  Step {0}: {1} anchor hits in {2}: {3}  [{4}]" -f $step.Number, $status, $TargetFile, $anchorCount, $step.Anchor)
    }

    $pending = Get-PendingStep -Plan $plan
    Write-Host ""
    if ($null -eq $pending) {
        Write-Host "Next step: none. All steps are completed."
    }
    else {
        Write-Host "Next step: Step $($pending.Number)"
    }
    Write-Host "Check-only mode completed. No pull, no checkout, no Claude Code, no commit."
}

function Invoke-Steps {
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        throw "Claude Code is not installed or is not available in PATH."
    }

    Write-Host ""
    Write-Host "========================================"
    Write-Host "Repository synchronization"
    Write-Host "========================================"

    Test-CleanWorkingTree
    Invoke-Git @("fetch", $Remote)
    Initialize-WorkBranch
    Write-Host "Working on branch $WorkBranch."

    $logDir = Join-Path (Get-GitLines @("rev-parse", "--absolute-git-dir"))[0] $LogDirName
    if (-not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Path $logDir | Out-Null
    }

    for ($cycle = 1; $cycle -le $MaxLoops; $cycle++) {
        Write-Host ""
        Write-Host "========================================"
        Write-Host "Execution cycle $cycle / $MaxLoops"
        Write-Host "========================================"

        Test-CleanWorkingTree

        $sourceRef = Get-PlanSourceRef
        $basePlan = Get-RefFileText -Ref $sourceRef -Path $PlanFile
        $localPlan = [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $PlanFile), [System.Text.Encoding]::UTF8)
        if ((Normalize-Text $basePlan) -ne (Normalize-Text $localPlan)) {
            throw "The local $PlanFile does not match $sourceRef."
        }

        $pending = Get-PendingStep -Plan $basePlan
        if ($null -eq $pending) {
            Write-Host "All $StepCount steps are marked as completed."
            break
        }

        $step = [int]$pending.Number
        Write-Host "Starting Step $step (anchor: $($pending.Anchor))"
        Write-Host $pending.Content

        $beforeSnapshot = Get-UntrackedSnapshot
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $promptPath = Join-Path $logDir "step-$step-$stamp.prompt.txt"
        $logPath = Join-Path $logDir "step-$step-$stamp.log.txt"

        Write-Host ""
        Write-Host "Running Claude Code worker (log: $logPath)..."
        $exitCode = Invoke-ClaudeWorker -Prompt (Get-WorkerPrompt -Step $pending) -PromptPath $promptPath -LogPath $logPath
        if ($exitCode -ne 0) {
            throw "Claude Code exited with code $exitCode at Step $step."
        }

        Write-Host ""
        Write-Host "Validating modifications..."
        Test-UntrackedUnchanged -Before $beforeSnapshot
        Assert-StepChange -Step $step -BasePlan $basePlan -Anchor $pending.Anchor
        Write-Host "All validation checks passed."

        Invoke-Git @("add", "--", $PlanFile, $TargetFile)
        Invoke-Git @("commit", "-m", "chore(plan): complete step $step")
        Invoke-Git @("push", "-u", $Remote, $WorkBranch)

        Write-Host ""
        Write-Host "Step $step was committed and pushed to $Remote/$WorkBranch."
    }

    Write-Host ""
    Write-Host "========================================"
    Write-Host "Run finished. Nothing was merged or deployed."
    Write-Host "Open a pull request from $WorkBranch to $BaseBranch manually when ready."
    Write-Host "========================================"
}

function Invoke-RunPlan {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git is not installed or is not available in PATH."
    }
    if (-not (Test-Path -LiteralPath ".git")) {
        throw "Run this script from the repository root."
    }

    $actualRepo = (Get-GitLines @("remote", "get-url", $Remote))[0].Trim()
    if ($actualRepo -ne $ExpectedRepo) {
        throw "The $Remote remote does not match the expected repository: $ExpectedRepo"
    }

    if ($CheckOnly) {
        Invoke-CheckOnly
    }
    else {
        Invoke-Steps
    }
}

# ---------------------------------------------------------------------------
# Entry point (skipped when the file is dot-sourced by tests)
# ---------------------------------------------------------------------------
if ($MyInvocation.InvocationName -ne '.') {
    $previousEncoding = [Console]::OutputEncoding
    $exitCode = 0
    try {
        [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
        Invoke-RunPlan
    }
    catch {
        Write-Host ""
        Write-Host "STOPPED: $($_.Exception.Message)" -ForegroundColor Red
        if (-not $CheckOnly) {
            Write-RecoveryHint
        }
        $exitCode = 1
    }
    finally {
        [Console]::OutputEncoding = $previousEncoding
    }
    exit $exitCode
}
