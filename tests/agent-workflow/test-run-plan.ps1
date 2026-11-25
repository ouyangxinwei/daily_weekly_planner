<#
.SYNOPSIS
    Offline tests for run-plan.ps1. No network, no real Claude Code, no push
    to GitHub. Uses temporary Git repositories under $env:TEMP.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tests\agent-workflow\test-run-plan.ps1
#>
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ScriptPath = Join-Path $RepoRoot "run-plan.ps1"
$RealPlanPath = Join-Path $RepoRoot "PLAN.md"

# Load functions only; the entry point is skipped when dot-sourced.
. $ScriptPath

$script:Passed = 0
$script:Failed = 0
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Assert-True {
    param([string]$Name, [scriptblock]$Condition)
    try {
        if (& $Condition) { $script:Passed++; Write-Host "PASS  $Name" }
        else { $script:Failed++; Write-Host "FAIL  $Name" -ForegroundColor Red }
    }
    catch {
        $script:Failed++
        Write-Host "FAIL  $Name (exception: $($_.Exception.Message))" -ForegroundColor Red
    }
}

function Assert-Throws {
    param([string]$Name, [scriptblock]$Action, [string]$Like = "*")
    try {
        & $Action | Out-Null
        $script:Failed++
        Write-Host "FAIL  $Name (no exception)" -ForegroundColor Red
    }
    catch {
        if ($_.Exception.Message -like $Like) {
            $script:Passed++
            Write-Host "PASS  $Name"
        }
        else {
            $script:Failed++
            Write-Host "FAIL  $Name (unexpected message: $($_.Exception.Message))" -ForegroundColor Red
        }
    }
}

function Write-Utf8 {
    param([string]$Path, [string]$Text)
    [System.IO.File]::WriteAllText($Path, $Text, $Utf8)
}

function Read-Utf8 {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Invoke-Quiet {
    param([string[]]$Arguments)
    $null = & git @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed" }
}

$RealPlan = Read-Utf8 $RealPlanPath

# Synthetic target file that contains every anchor from the real PLAN.md.
$IndexLines = @(
    '<!doctype html>',
    '<html>',
    '<head>',
    '  <script data-workspace-boot>',
    '    var a = 1;',
    '  </script>',
    '</head>',
    '<body>',
    '  <div class="workspace-switch" role="tablist">',
    '  </div>',
    '  <section class="star-summary" aria-label="stars">',
    '  </section>',
    '  <form class="quick-add" id="quick-add-form" novalidate>',
    '  </form>',
    ('  <section class="sync-panel" aria-label="' + [string][char]0x4E91 + [char]0x7AEF + [char]0x540C + [char]0x6B65 + '">'),
    '  </section>',
    '</body>',
    '</html>'
)
$IndexText = ($IndexLines -join "`n") + "`n"

function New-TestRepo {
    $dir = Join-Path $env:TEMP ("run-plan-test-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $dir | Out-Null
    Push-Location $dir
    Invoke-Quiet @("init", "-q", "-b", "main")
    Invoke-Quiet @("config", "core.autocrlf", "false")
    Invoke-Quiet @("config", "user.name", "run-plan-test")
    Invoke-Quiet @("config", "user.email", "run-plan-test@example.invalid")
    Write-Utf8 (Join-Path $dir "PLAN.md") $RealPlan
    Write-Utf8 (Join-Path $dir "index.html") $IndexText
    Write-Utf8 (Join-Path $dir "other.js") "var x = 1;`n"
    Invoke-Quiet @("add", "-A")
    Invoke-Quiet @("commit", "-q", "-m", "base")
    return $dir
}

function Remove-TestRepo {
    param([string]$Dir)
    Pop-Location
    Remove-Item -LiteralPath $Dir -Recurse -Force
}

function Set-IndexWithInsert {
    param([string]$Dir, [int]$BeforeIndex, [string]$Line)
    $list = New-Object 'System.Collections.Generic.List[string]'
    $list.AddRange([string[]]$IndexLines)
    $list.Insert($BeforeIndex, $Line)
    Write-Utf8 (Join-Path $Dir "index.html") (($list.ToArray() -join "`n") + "`n")
}

function Set-PlanChecked {
    param([string]$Dir, [int]$Step)
    Write-Utf8 (Join-Path $Dir "PLAN.md") (Get-ExpectedCompletedPlan -Plan $RealPlan -Step $Step)
}

# ---------------------------------------------------------------------------
Write-Host "== PLAN.md parsing =="

$steps = @(Get-PlanSteps -Plan $RealPlan)
Assert-True "real PLAN.md yields five steps" { $steps.Count -eq 5 }
Assert-True "step numbers are 1..5" { ($steps.Number -join ",") -eq "1,2,3,4,5" }
Assert-True "every step has an anchor" { @($steps | Where-Object { -not $_.Anchor }).Count -eq 0 }
Assert-True "step 1 anchor" { $steps[0].Anchor -eq '<script data-workspace-boot>' }
Assert-True "step 2 anchor drops the ellipsis" { $steps[1].Anchor -eq '<div class="workspace-switch"' }
Assert-True "step 5 section stops before the next level-2 heading" {
    ($steps[4].Content -split "`n").Count -lt 15 -and $steps[4].Content -notmatch '(?m)^## '
}
Assert-True "pending step is the first unchecked one" { (Get-PendingStep -Plan $RealPlan).Number -eq 1 }

$plan13 = Get-ExpectedCompletedPlan -Plan (Get-ExpectedCompletedPlan -Plan $RealPlan -Step 1) -Step 3
Assert-True "pending step skips completed steps" { (Get-PendingStep -Plan $plan13).Number -eq 2 }

$allDone = $RealPlan
for ($i = 1; $i -le 5; $i++) { $allDone = Get-ExpectedCompletedPlan -Plan $allDone -Step $i }
Assert-True "no pending step when all are checked" { $null -eq (Get-PendingStep -Plan $allDone) }

$diffCount = @(Compare-Object ($RealPlan -split '\r?\n') ((Get-ExpectedCompletedPlan -Plan $RealPlan -Step 4) -split '\r?\n')).Count
Assert-True "checkbox update changes exactly one line" { $diffCount -eq 2 }

Assert-Throws "completing an already completed step throws" { Get-ExpectedCompletedPlan -Plan $allDone -Step 2 } "*Found: 0*"
Assert-Throws "missing step throws" { Get-PlanSteps -Plan ($RealPlan -replace '### Step 4', '### Stage 4') } "*missing Step 4*"
Assert-Throws "duplicate target checkbox throws" {
    Get-PlanSteps -Plan ($RealPlan -replace '(### Step 3[^\n]*\n)', "`$1`n- [ ] **Extra:** x`n")
} "*exactly one*"

# ---------------------------------------------------------------------------
Write-Host "== Change validation (temporary repository) =="

$goodComment = '  <!-- Workspace switch: plan, language and company workspaces. -->'

$dir = New-TestRepo
try {
    Set-IndexWithInsert $dir 8 $goodComment
    Set-PlanChecked $dir 2
    Assert-True "valid step 2 change passes" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor; $true }

    Set-IndexWithInsert $dir 14 '  <!-- Sync panel: module sync and full sync entry points. -->'
    Set-PlanChecked $dir 5
    Assert-True "valid step 5 change passes (non-ASCII anchor)" { Assert-StepChange -Step 5 -BasePlan $RealPlan -Anchor $steps[4].Anchor; $true }

    Set-IndexWithInsert $dir 8 ('  <!-- ' + [char]0x5DE5 + [char]0x4F5C + ' -->')
    Set-PlanChecked $dir 2
    Assert-Throws "Chinese comment is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*Chinese*"

    Set-IndexWithInsert $dir 10 $goodComment
    Set-PlanChecked $dir 2
    Assert-Throws "comment at wrong position is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*not directly before*"

    Set-IndexWithInsert $dir 8 '  <div class="new"></div>'
    Set-PlanChecked $dir 2
    Assert-Throws "non-comment line is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*complete HTML comment*"

    Set-IndexWithInsert $dir 8 '  <!-- a -- b -->'
    Set-PlanChecked $dir 2
    Assert-Throws "double hyphen inside comment is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*forbidden*"

    Set-IndexWithInsert $dir 8 $goodComment
    Set-PlanChecked $dir 3
    Assert-Throws "wrong PLAN.md checkbox is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*beyond the expected*"

    Set-IndexWithInsert $dir 8 $goodComment
    Write-Utf8 (Join-Path $dir "PLAN.md") $RealPlan
    Assert-Throws "unchanged PLAN.md is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*exactly two*"

    Set-IndexWithInsert $dir 8 $goodComment
    Set-PlanChecked $dir 2
    Write-Utf8 (Join-Path $dir "other.js") "var x = 2;`n"
    Assert-Throws "extra tracked file is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*exactly two*"
    Invoke-Quiet @("checkout", "--", "other.js")

    $changed = ($IndexLines -join "`n").Replace('var a = 1;', 'var a = 2;')
    $list = New-Object 'System.Collections.Generic.List[string]'
    $list.AddRange([string[]]($changed -split "`n"))
    $list.Insert(8, $goodComment)
    Write-Utf8 (Join-Path $dir "index.html") (($list.ToArray() -join "`n") + "`n")
    Set-PlanChecked $dir 2
    Assert-Throws "edited existing line is rejected" { Assert-StepChange -Step 2 -BasePlan $RealPlan -Anchor $steps[1].Anchor } "*zero deletions*"

    Invoke-Quiet @("checkout", "--", "index.html", "PLAN.md")
    $snap = Get-UntrackedSnapshot
    Write-Utf8 (Join-Path $dir "new-file.txt") "x"
    Assert-Throws "new untracked file is detected" { Test-UntrackedUnchanged -Before $snap } "*new untracked*"
}
finally {
    Remove-TestRepo $dir
}

# ---------------------------------------------------------------------------
Write-Host "== Branch handling and check-only (local bare remote) =="

$dir = New-TestRepo
$bare = "$dir-remote.git"
try {
    Invoke-Quiet @("init", "-q", "--bare", $bare)
    Invoke-Quiet @("remote", "add", "origin", $bare)
    Invoke-Quiet @("push", "-q", "origin", "main")
    Invoke-Quiet @("fetch", "-q", "origin")

    Assert-True "PLAN source is origin/main before the work branch exists" { (Get-PlanSourceRef) -eq "origin/main" }

    Initialize-WorkBranch *> $null
    Assert-True "work branch is created from origin/main" {
        ((& git branch --show-current) -eq $WorkBranch) -and ((& git rev-parse HEAD) -eq (& git rev-parse origin/main))
    }

    Set-IndexWithInsert $dir 8 $goodComment
    Set-PlanChecked $dir 2
    Invoke-Quiet @("commit", "-q", "-am", "local only")
    Assert-Throws "unpushed work-branch commits stop the run" { Initialize-WorkBranch *> $null } "*not on origin/main*"

    Invoke-Quiet @("push", "-q", "-u", "origin", $WorkBranch)
    Assert-True "PLAN source switches to the remote work branch" { (Get-PlanSourceRef) -eq "origin/$WorkBranch" }
    Assert-True "pending step is read from the work branch" {
        (Get-PendingStep -Plan (Get-RefFileText -Ref (Get-PlanSourceRef) -Path "PLAN.md")).Number -eq 1
    }

    $output = Invoke-CheckOnly *>&1 | Out-String
    Assert-True "check-only lists five steps" { $output -match 'PLAN.md step status \(5 steps\)' }
    Assert-True "check-only reports step 2 completed" { $output -match 'Step 2: COMPLETED' }
    Assert-True "check-only reports next step 1" { $output -match 'Next step: Step 1' }

    Write-Utf8 (Join-Path $dir "untracked.txt") "x"
    Invoke-Quiet @("switch", "-q", "main")
    $snap = Get-UntrackedSnapshot
    Assert-True "untracked file without remote conflict passes" { Test-UntrackedConflicts -Snapshot $snap -Ref "origin/main"; $true }
    Assert-Throws "untracked file that exists remotely is a conflict" {
        Test-UntrackedConflicts -Snapshot @{ "other.js" = "x" } -Ref "origin/main"
    } "*conflicts*"
    Remove-Item -LiteralPath (Join-Path $dir "untracked.txt")
}
finally {
    Remove-TestRepo $dir
    Remove-Item -LiteralPath $bare -Recurse -Force
}

# ---------------------------------------------------------------------------
Write-Host "== Worker prompt delivery (fake claude on PATH) =="

$fakeDir = Join-Path $env:TEMP ("run-plan-fake-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $fakeDir | Out-Null
$oldPath = $env:PATH
try {
    Write-Utf8 (Join-Path $fakeDir "claude.cmd") "@findstr `"^`"`r`n"
    $env:PATH = "$fakeDir;$oldPath"

    $prompt = Get-WorkerPrompt -Step $steps[1]
    $promptPath = Join-Path $fakeDir "prompt.txt"
    $logPath = Join-Path $fakeDir "log.txt"
    $code = Invoke-ClaudeWorker -Prompt $prompt -PromptPath $promptPath -LogPath $logPath 6>$null
    $echoed = Read-Utf8 $logPath

    Assert-True "worker exit code is returned" { $code -eq 0 }
    Assert-True "worker prompt keeps double quotes" { $echoed.Contains('<div class="workspace-switch"') }
    Assert-True "worker prompt keeps Chinese text" { $echoed.Contains([string][char]0x76EE + [char]0x6807) }
    Assert-True "worker prompt is delivered unchanged" { (Normalize-Text $echoed) -eq (Normalize-Text $prompt) }
}
finally {
    $env:PATH = $oldPath
    Remove-Item -LiteralPath $fakeDir -Recurse -Force
}

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Passed: $script:Passed  Failed: $script:Failed"
if ($script:Failed -gt 0) { exit 1 }
exit 0
