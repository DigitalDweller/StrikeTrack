# Expo Go Connection Troubleshooting

If Expo Go won't connect to your dev server, try these steps in order.

---

## When LAN and tunnel both fail — use these

### Option A: Test in web browser (no phone needed)

```bash
npm run web
```

Opens the app in your browser. Camera and some native features won't work, but you can verify the UI and navigation.

### Option B: Android phone via USB (bypasses Wi‑Fi entirely)

1. Enable **USB debugging** on your Android phone (Settings → Developer options).
2. Connect the phone to your PC with a USB cable.
3. Run:

```bash
npm run start:usb
```

This sets up `adb reverse` so the phone talks to your PC over USB. No Wi‑Fi required.

**Requirements:** Android SDK platform-tools (ADB). Install via [Android Studio](https://developer.android.com/studio) or standalone: `winget install Google.PlatformTools`.

### Option C: Android emulator

If you have Android Studio installed:

```bash
npm run start
```

Then press `a` in the terminal to open on the Android emulator. The emulator connects to localhost automatically.

### Option D: iOS Simulator (Mac only)

```bash
npm run start
```

Then press `i` to open in the iOS Simulator.

---

## Quick Fixes (when you want Wi‑Fi to work)

### 1. Use tunnel mode (bypasses network issues)

```bash
npm run start:tunnel
```

Slower but works when LAN fails. Uses ngrok to tunnel to your dev server.

### 2. Clear cache and restart

```bash
npm run start:clear
```

### 3. Fix package compatibility

```bash
npm run fix
npm run doctor
```

Fix any issues `expo-doctor` reports.

---

## Windows-Specific

### Wrong IP binding (Metro on wrong interface)

If your phone shows "could not connect to 10.229.x.x" — Metro bound to a VPN/virtual adapter. Your Wi-Fi is usually 192.168.x.x.

**Option A – PowerShell script (prefers 192.168.x.x):**

```bash
npm run start:lan:win
```

**Option B – Manual:**

1. Run `ipconfig`
2. Find your **Wi-Fi** adapter’s IPv4 address (e.g. `192.168.1.x`)
3. Run:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.x"
npx expo start --lan
```

### Firewall blocking (most common cause on Windows)

Windows Firewall often blocks incoming connections from your phone. Add rules for Expo's ports:

**Run as Administrator** (right-click PowerShell → Run as administrator):

```powershell
cd C:\Users\Chris\OneDrive\Desktop\StrikeTrack\StrikeTrack-Expo
.\scripts\add-firewall-rules.ps1
```

Or: `npm run firewall` (must be run from an elevated/admin terminal).

This adds inbound rules for ports 8081, 19000, 19001, 19002.

---

## OneDrive path issues

Projects in OneDrive (`...\OneDrive\Desktop\...`) can cause path resolution issues with Node/Metro on Windows.

**Fix:** Move the project to a local path, e.g. `C:\Dev\StrikeTrack`, and run from there.

---

## Same network checklist

- [ ] Phone and PC on the same Wi-Fi (same SSID)
- [ ] Same band (2.4 vs 5 GHz; some routers isolate bands)
- [ ] Expo Go app updated to match SDK 52
- [ ] Try tunnel: `npm run start:tunnel`

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Default start |
| `npm run web` | **Run in browser** — works when nothing else does |
| `npm run start:usb` | **Android via USB** — no Wi‑Fi needed |
| `npm run start:tunnel` | Tunnel mode |
| `npm run start:lan` | LAN mode |
| `npm run start:lan:win` | LAN with Wi‑Fi IP (Windows) |
| `npm run start:localhost` | Localhost only (for emulator or USB) |
| `npm run start:clear` | Clear cache and start |
| `npm run doctor` | Check compatibility |
| `npm run fix` | Fix package versions |
| `npm run firewall` | Add Windows Firewall rules (run as Admin) |
