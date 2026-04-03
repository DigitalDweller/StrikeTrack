# Add Windows Firewall rules for Expo Go (run as Administrator)
# Right-click PowerShell -> Run as Administrator, then:
#   cd StrikeTrack-Expo
#   .\scripts\add-firewall-rules.ps1

$ports = @(8081, 19000, 19001, 19002)
$ruleName = "Expo Metro Dev Server"

foreach ($port in $ports) {
  $existing = Get-NetFirewallRule -DisplayName "$ruleName - Port $port" -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule for port $port already exists." -ForegroundColor Yellow
  } else {
    New-NetFirewallRule -DisplayName "$ruleName - Port $port" `
      -Direction Inbound `
      -LocalPort $port `
      -Protocol TCP `
      -Action Allow `
      -Profile Private,Public
    Write-Host "Added firewall rule for port $port" -ForegroundColor Green
  }
}

Write-Host "`nDone. Try connecting with your phone again." -ForegroundColor Green
Write-Host "If it still fails, ensure phone and PC are on the same Wi-Fi." -ForegroundColor Cyan
