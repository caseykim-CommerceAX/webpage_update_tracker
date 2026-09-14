$ErrorActionPreference = "Stop"
$taskName = "WebpageUpdateTracker-Daily"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -eq $task) {
  Write-Host "등록된 작업이 없습니다: $taskName"
  exit 0
}
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "삭제 완료: $taskName"
