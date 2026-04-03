# StrikeTrack (Expo)

Track pit batteries for FIRST Robotics. Add batteries with custom names, take photos of the Battery Beak display for reference, enter readings, and view history. **Runs in Expo Go — no build, no cost.**

## Run on your phone (free)

1. **Install the Expo Go app** on your iPhone or Android from the App Store / Play Store.

2. **Install dependencies and start:**
   ```bash
   cd StrikeTrack-Expo
   npm install
   npx expo start
   ```

3. **Connect your phone:**
   - Make sure your phone and computer are on the same Wi‑Fi
   - Scan the QR code with your camera (iPhone) or the Expo Go app (Android)
   - The app opens in Expo Go

That’s it. No build, no Apple Developer account, no cost.

## Scan flow

- Tap **Scan** and take a photo (or pick from library) of the Battery Beak screen  
- The photo appears as a reference while you enter Status, Charge %, voltages, and Rint  
- Save to the chosen battery — works fully in Expo Go  

## Features

- **Battery list** — Add, remove, edit batteries with custom names  
- **Photo + manual entry** — Take a photo for reference, then type in the values  
- **Manual entry** — Enter readings directly from a battery’s detail screen  
- **History** — View all readings per battery  
- **Local storage** — SQLite, works offline  

## Optional: add OCR later

The app is set up to work in Expo Go without OCR. To add automatic text recognition later:

1. Install `expo-text-extractor`
2. Update `lib/ocr.ts` to call it and parse the result
3. Build with EAS (requires Apple Developer for iOS distribution)

## Project structure

```
StrikeTrack-Expo/
├── app/                 # Screens
├── components/
├── lib/                 # Database, parser, OCR placeholder
└── assets/
```
