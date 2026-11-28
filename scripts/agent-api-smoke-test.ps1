param(
  [string]$BaseUrl = "https://kopvznygsqsheibsjjvv.supabase.co/functions/v1/agent-api",
  [string]$Username = "oooo",
  [string]$TargetRepository = "octocat/Hello-World",
  [string]$StandardRepository = "ouyangxinwei/oooo_Dev_Standard"
)

$ErrorActionPreference = "Stop"

$securePassword = Read-Host "Enter the existing planner password (input is hidden)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

$pair = "{0}:{1}" -f $Username, $password
$authorization = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pair))
$headers = @{ Authorization = "Basic $authorization" }

function Invoke-AgentApi {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [ValidateSet("GET","POST")][string]$Method = "GET",
    [object]$Body = $null
  )
  $params = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    Headers = $headers
    TimeoutSec = 35
  }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
  }
  return Invoke-RestMethod @params
}

try {
  Write-Host "[1/7] Create Task..."
  $taskResponse = Invoke-AgentApi -Path "/agent/tasks" -Method POST -Body @{
    title = "Agent smoke test - $TargetRepository - $(Get-Date -Format 'yyyyMMdd-HHmmss')"
    description = "End-to-end smoke test of Task, Run, Worker, pause/resume and report."
    task_type = "repository_audit"
    target_repository = $TargetRepository
    scope = @{
      standard_repository = $StandardRepository
      checks = @("documentation", "code")
    }
  }
  $taskId = $taskResponse.data.id
  if (-not $taskId) { throw "Task creation did not return an id." }
  Write-Host "  Task: $taskId"

  Write-Host "[2/7] Create Run..."
  $runResponse = Invoke-AgentApi -Path "/agent/tasks/$taskId/runs" -Method POST -Body @{ reason = "manual" }
  $runId = $runResponse.data.id
  if (-not $runId) { throw "Run creation did not return an id." }
  Write-Host "  Run: $runId"
  Write-Host "  Steps created: $($runResponse.data.steps.Count)"

  Write-Host "[3/7] Execute first Step..."
  $firstStep = Invoke-AgentApi -Path "/agent/runs/$runId/execute" -Method POST -Body @{}
  Write-Host "  Step: $($firstStep.data.step_key), status: $($firstStep.data.step_status)"
  if ($firstStep.data.step_status -ne "completed") {
    throw "First Worker step did not complete. Response: $($firstStep | ConvertTo-Json -Depth 12 -Compress)"
  }

  Write-Host "[4/7] Pause Run..."
  $null = Invoke-AgentApi -Path "/agent/runs/$runId/pause" -Method POST -Body @{}
  $paused = Invoke-AgentApi -Path "/agent/runs/$runId"
  if ($paused.data.status -ne "paused") { throw "Run did not enter paused state." }
  Write-Host "  Confirmed: paused"

  Write-Host "[5/7] Resume Run..."
  $null = Invoke-AgentApi -Path "/agent/runs/$runId/resume" -Method POST -Body @{}
  $resumed = Invoke-AgentApi -Path "/agent/runs/$runId"
  if ($resumed.data.status -ne "queued") { throw "Run did not return to queued state." }
  Write-Host "  Confirmed: queued"

  Write-Host "[6/7] Execute remaining Steps..."
  $iteration = 0
  do {
    $iteration++
    if ($iteration -gt 10) { throw "Safety stop: more than 10 Worker calls." }
    $stepResponse = Invoke-AgentApi -Path "/agent/runs/$runId/execute" -Method POST -Body @{}
    Write-Host "  $($stepResponse.data.step_key): $($stepResponse.data.step_status)"
    if ($stepResponse.data.error_code) {
      throw "Worker step error: $($stepResponse.data.error_code)"
    }
    $continue = [bool]$stepResponse.data.next_step_available
  } while ($continue)

  Write-Host "[7/7] Verify persisted Run and report..."
  $final = Invoke-AgentApi -Path "/agent/runs/$runId"
  $taskFinal = Invoke-AgentApi -Path "/agent/tasks/$taskId"
  if ($final.data.status -ne "completed") { throw "Run final status is not completed: $($final.data.status)" }
  $summary = $final.data.steps | Where-Object { $_.step_key -eq "summarize" } | Select-Object -First 1
  $markdown = $summary.result.report_markdown
  if (-not $markdown) { throw "Final report_markdown was not saved." }
  if ($taskFinal.data.status -ne "completed") { throw "Task final status is not completed: $($taskFinal.data.status)" }

  [PSCustomObject]@{
    success = $true
    task_id = $taskId
    task_status = $taskFinal.data.status
    run_id = $runId
    run_status = $final.data.status
    steps = @($final.data.steps | ForEach-Object {
      [PSCustomObject]@{ key = $_.step_key; status = $_.status }
    })
    report = $markdown
  } | ConvertTo-Json -Depth 20
}
finally {
  $password = $null
  $pair = $null
  $authorization = $null
  $headers = $null
  $securePassword.Dispose()
}
