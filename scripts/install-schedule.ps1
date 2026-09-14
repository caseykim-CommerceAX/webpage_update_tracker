$ErrorActionPreference = "Stop"
$taskName = "WebpageUpdateTracker-Daily"
$repoPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cmdPath = Join-Path $env:SystemRoot "System32\cmd.exe"
$arguments = "/d /c `"cd /d `"`"$repoPath`"`" && npm.cmd run scan -- --source schedule`""
$action = New-ScheduledTaskAction -Execute $cmdPath -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Webpage Update Tracker daily scan at 09:00 Asia/Seoul" -Force | Out-Null
Write-Host "등록 완료: $taskName (매일 09:00)"
