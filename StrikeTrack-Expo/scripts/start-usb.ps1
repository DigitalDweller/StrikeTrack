# Start Expo with USB connection (Android physical device)
# Requires: Android device with USB debugging enabled, ADB in PATH
# Run: .\scripts\start-usb.ps1

Write-Host "Setting up ADB reverse for USB connection..." -ForegroundColor Cyan
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
if ($LASTEXITCODE -ne 0) {
  Write-Host "ADB failed. Is your Android device connected with USB debugging enabled?" -ForegroundColor Red
  exit 1
}
Write-Host "Starting Expo (localhost mode)..." -ForegroundColor Green
Write-Host "Open Expo Go on your phone and connect to the URL shown below" -ForegroundColor Yellow
npx expo start --localhost --android
