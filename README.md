# StrikeTrack

A 100% local native iPhone app for FIRST Robotics teams to track pit battery status using the Battery Beak tester. Snap a photo of the display and the app extracts readings via on-device OCR.

## Requirements

- **macOS** with Xcode 15+
- **iOS 17.0+** (SwiftData, Vision)
- **iPhone** (camera for scanning)

## Setup

Open `StrikeTrack.xcodeproj` on a Mac — the project is ready to build.

**Or** use [XcodeGen](https://github.com/yonaskolb/XcodeGen) to regenerate:
1. Run `brew install xcodegen`
2. Run `xcodegen generate` in this folder
3. Open the generated `StrikeTrack.xcodeproj`


## Features

- **Main screen**: View all batteries, add/remove, assign custom names
- **Photo scan**: Snap the Battery Beak screen → OCR extracts Status, Charge %, Rint, voltages
- **Manual entry**: Enter readings by hand when needed
- **Per-battery history**: See all readings and trends over time
- **100% local**: No cloud, no account, works offline

## Project structure

```
StrikeTrack/
├── StrikeTrackApp.swift      # App entry, SwiftData container
├── Models/                   # Battery, BatteryReading, Enums
├── Services/                 # VisionOCRService, BatteryBeakParser
├── Views/
│   ├── BatteryList/         # Main list, add/edit, row
│   ├── BatteryDetail/       # Detail, history, manual entry
│   ├── ScanFlow/            # Capture → Process → Confirm
│   └── Components/          # StatusBadge, MetricCard
├── Design/                   # DesignTokens
├── Info.plist
└── Assets.xcassets
```

## Building

1. Select an iPhone simulator or device.
2. Build and run (⌘R).

Camera and photo library access will be requested when you first use those features.
