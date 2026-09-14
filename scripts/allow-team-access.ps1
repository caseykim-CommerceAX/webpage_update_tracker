param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ruleName = "WebpageUpdateTracker-Team-$Port"
$displayName = "Webpage Update Tracker Team Access"
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdministrator) {
    throw "Run npm.cmd run network:allow from an Administrator PowerShell."
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Remove-NetFirewallRule
}

New-NetFirewallRule `
    -Name $ruleName `
    -DisplayName $displayName `
    -Description "Allow the Webpage Update Tracker on TCP $Port from the local subnet only." `
    -Direction Inbound `
    -Action Allow `
    -Enabled True `
    -Profile Domain,Private `
    -RemoteAddress LocalSubnet `
    -Protocol TCP `
    -LocalPort $Port `
    -Program $nodePath | Out-Null

Write-Host "Firewall rule ready: TCP $Port / Domain+Private / LocalSubnet / $nodePath"

$publicProfiles = @(Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -ne "Disconnected" -and $_.NetworkCategory -eq "Public" })
if ($publicProfiles.Count -gt 0) {
    Write-Warning "An active network uses the Public profile. This rule intentionally does not allow Public networks. Use a Domain or Private profile according to your company policy."
}

$addresses = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.AddressState -eq "Preferred" -and
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*"
} | Select-Object -ExpandProperty IPAddress -Unique)

if ($addresses.Count -gt 0) {
    Write-Host "Team access URLs:"
    foreach ($address in $addresses) {
        Write-Host "  http://$($address):$Port"
    }
} else {
    Write-Host "Find the IPv4 address with ipconfig, then open http://<IPv4>:$Port."
}
