param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ruleName = "WebpageUpdateTracker-Team-$Port"
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdministrator) {
    throw "Run npm.cmd run network:remove from an Administrator PowerShell."
}

$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "No team-access firewall rule was found."
    exit 0
}

$existing | Remove-NetFirewallRule
Write-Host "Firewall rule removed: $ruleName"
