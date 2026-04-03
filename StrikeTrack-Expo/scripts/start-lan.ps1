# Start Expo with correct LAN hostname on Windows
# Use when phone can't connect via QR code (wrong IP binding)
# 10.229.x.x / 10.x.x.x often = VPN/virtual adapters. Prefer 192.168.x.x (home Wi-Fi).
# Run: .\scripts\start-lan.ps1

$addrs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notmatch '^127\.' -and
  $_.InterfaceAlias -notmatch 'Loopback|VirtualBox|VPN|Bluetooth|Hyper-V|Docker|WSL'
}

# Prefer 192.168.x.x (home Wi-Fi) over 10.x.x.x (often VPN/virtual)
$ip = ($addrs | Where-Object { $_.IPAddress -match '^192\.168\.' } | Select-Object -First 1).IPAddress
if (-not $ip) {
  $ip = ($addrs | Where-Object { $_.IPAddress -match '^10\.' } | Select-Object -First 1).IPAddress
}
if (-not $ip) {
  $ip = ($addrs | Select-Object -First 1).IPAddress
}

if ($ip) {
  Write-Host "Using hostname: $ip (verify this is your phone's Wi-Fi network)" -ForegroundColor Green
  Write-Host "If phone still can't connect: Run scripts\add-firewall-rules.ps1 as Administrator" -ForegroundColor DarkGray
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
  npx expo start --lan
} else {
  Write-Host "Could not detect Wi-Fi IP." -ForegroundColor Yellow
  Write-Host "Try: ipconfig to find your Wi-Fi IPv4, then:" -ForegroundColor Yellow
  Write-Host '  $env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.x.x"; npx expo start --lan' -ForegroundColor Cyan
  npx expo start --lan
}
