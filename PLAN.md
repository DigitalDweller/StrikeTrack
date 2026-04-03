# StrikeTrack — Pit Battery Tracker Development Plan

## Project Overview

**StrikeTrack** is a 100% local native iPhone app for FIRST Robotics teams to track pit battery status. Users snap a photo of the Battery Beak screen; the app extracts data via on-device OCR and logs it to the battery record.

---

## 1. Research Summary

### Battery Beak Display Format (from official manual)

The OLED screen displays results in a fixed layout:

| Field | Values | Location |
|-------|--------|----------|
| **Status** | Good, Fair, Bad, Charge Battery | Orange text, top row |
| **Charge** | 0–130% (capped) | Orange text, second row |
| **V0** | Voltage @ no load + amps | Blue text |
| **V1** | Voltage @ load 1 + amps | Blue text |
| **V2** | Voltage @ load 2 + amps (often 18A) | Blue text |
| **Rint** | Internal resistance (e.g., 0.025 Ohms) | Blue text |

**Parsing patterns** (from user image):
- `Status: Good` / `Charge: 130%`
- `V0: 13.682 0 Amps` / `V1: 13.658 0 Amp` / `V2: 13.220 18 Amps`
- `Rint: 0.025 Ohms`

### Vision OCR Best Practices

- **Recognition level**: `.accurate` for better quality
- **Language**: `recognitionLanguages = ["en-US"]`
- **`usesLanguageCorrection`**: Must be `true` for `customWords` to apply
- **`customWords`**: Add domain terms — `["Rint", "Ohms", "Amps", "Good", "Fair", "Bad", "Charge Battery", "Status", "Charge", "V0", "V1", "V2"]`
- **`minimumTextHeight`**: Tune if small OLED text is missed

### Local Storage

- **SwiftData** (iOS 17+): Swift-native, minimal boilerplate, great SwiftUI integration. **Recommended** for this app.
- **Core Data**: Use only if iOS 15/16 support is required.

### Design (HIG + 2024/2025 Trends)

- **Design tokens**: Semantic colors, spacing scale, typography
- **Adaptive**: Light/dark mode via asset catalog
- **Observable**: Use `@Observable` and `@Bindable` (WWDC 2024 patterns)
- **Native components**: List, Form, standard controls — avoid reinventing
- **Accessibility**: Dynamic Type, VoiceOver support

### Photo Capture UX

- **Dual input**: Camera capture **and** Photos library picker
- **Confirmation step**: Show extracted values before saving; allow edit/retake
- **Guidance**: Brief tips (fill frame, reduce glare, hold steady)
- **Fallback**: Manual entry when OCR fails or confidence is low

---

## 2. Data Model

### Battery (SwiftData model)

```
Battery
├── id: UUID (persistent)
├── label: String (e.g., "Battery 1", "A-17")
├── chemistry: Chemistry (enum: leadAcid, nimh)
├── voltage: Int (7, 9, 12)
├── amphour: Int (2, 3, 5, 10, 17)
├── notes: String?
├── readings: [BatteryReading] (relationship)
└── createdAt: Date
```

### BatteryReading (SwiftData model)

```
BatteryReading
├── id: UUID
├── battery: Battery (relationship)
├── status: BatteryStatus (enum: good, fair, bad, chargeBattery)
├── chargePercent: Double (0–130)
├── voltageNoLoad: Double?
├── voltageLoad1: Double?
├── voltageLoad2: Double?
├── currentLoad2: Double? (e.g., 18)
├── internalResistance: Double? (Ohms)
├── rawOcrText: String? (debug/audit)
├── source: ReadingSource (enum: photo, manual)
└── createdAt: Date
```

### Enums

- `BatteryStatus`: good, fair, bad, chargeBattery
- `Chemistry`: leadAcid, nimh
- `ReadingSource`: photo, manual

---

## 3. Feature Scope (Prioritized)

### Phase 1 — MVP (Core Loop)

| Feature | Description |
|---------|-------------|
| Battery list | Add, edit, delete batteries; show latest status at a glance |
| Photo scan | Camera or picker → Vision OCR → parse Battery Beak data |
| Confirmation screen | Review/extract values before saving; fix any OCR errors |
| Manual fallback | Enter readings manually when photo fails |
| Reading history | Per-battery list of past readings with date |

### Phase 2 — Usability

| Feature | Description |
|---------|-------------|
| Quick status view | Dashboard: batteries ready / need charge / replace |
| Search/filter | Find battery by label |
| Charge percentage thresholds | Visual badges (green/yellow/red) by charge % |
| Retake/recrop | Retake photo or crop before OCR |

### Phase 3 — Polish

| Feature | Description |
|---------|-------------|
| Charts | Rint, voltage, charge over time |
| Export | CSV backup |
| Custom thresholds | User-defined Rint/charge limits for alerts |
| Barcode/QR (optional) | Scan battery ID sticker |

---

## 4. Architecture

### App Structure

```
StrikeTrack/
├── App/
│   └── StrikeTrackApp.swift          # @main, SwiftData container
├── Models/
│   ├── Battery.swift                 # @Model
│   ├── BatteryReading.swift          # @Model
│   └── Enums.swift
├── Services/
│   ├── VisionOCRService.swift        # Vision framework wrapper
│   └── BatteryBeakParser.swift       # Parse OCR text → structured data
├── Views/
│   ├── BatteryList/
│   ├── BatteryDetail/
│   ├── ScanFlow/
│   │   ├── CaptureView.swift         # Camera + picker
│   │   ├── ProcessingView.swift     # Loading state
│   │   └── ConfirmationView.swift   # Review, edit, save
│   └── Components/
│       ├── StatusBadge.swift
│       └── MetricCard.swift
├── Design/
│   ├── DesignTokens.swift           # Colors, spacing, typography
│   └── Theme.swift
└── Resources/
    ├── Assets.xcassets
    └── Info.plist                   # Camera, Photo Library usage
```

### Tech Stack

| Layer | Choice |
|-------|--------|
| UI | SwiftUI |
| Persistence | SwiftData |
| OCR | Vision (`VNRecognizeTextRequest`) |
| Photo | `PhotosPicker` + `UIImagePickerController` (camera) or `ImagePicker` wrapper |
| Min iOS | 17.0 (SwiftData, PhotosPicker improvements) |

---

## 5. OCR Parsing Strategy

### Regex Patterns (ordered application)

```
Status:     (Good|Fair|Bad|Charge Battery)
Charge:     (\d{1,3})%?
V0:         (\d+\.?\d*)\s*(\d+)\s*Amps?
V1:         (\d+\.?\d*)\s*(\d+)\s*Amps?
V2:         (\d+\.?\d*)\s*(\d+)\s*Amps?
Rint:       (\d+\.?\d*)\s*Ohms?
```

### Fallbacks

- If "Status" label missed: Look for standalone `Good`, `Fair`, `Bad`, `Charge Battery`
- If "Charge" missed: Look for `\d{1,3}%` (e.g., `130%`)
- If "Rint" missed: Look for decimal + "Ohms" (e.g., `0.025 Ohms`)
- Normalize OCR quirks: "0" vs "O", "1" vs "l"

### Validation

- Charge: 0–130
- Voltage: 0–15 (Battery Beak max)
- Rint: 0.001–1.0 Ohms (typical range)
- Reject readings that fail sanity checks; prompt manual entry

---

## 6. User Flows

### Primary: Scan Battery Beak

1. Tap **Scan** (FAB or tab)
2. Choose **Camera** or **Photo Library**
3. Take/select photo of Battery Beak screen
4. App shows processing indicator
5. **Confirmation screen**: Extracted fields displayed; user can edit or retake
6. Select which battery (or create new)
7. Tap **Save** → Reading appended to battery

### Secondary: Manual Entry

1. Open battery detail
2. Tap **Add Reading**
3. Tap **Enter Manually**
4. Fill form → Save

### Browse: Check Status

1. Open app → Battery list with latest status per battery
2. Tap battery → Full history + metrics
3. Filter/sort by status if implemented

---

## 7. Design Direction

### Visual Identity

- **Theme**: Clean, tool-like; suitable for a pit environment
- **Color**: Semantic greens (good), yellows (fair), reds (bad); support light/dark
- **Typography**: SF Pro, Dynamic Type
- **Spacing**: 8pt grid (8, 16, 24, 32)

### Key Screens (Wireframe Notes)

| Screen | Layout |
|--------|--------|
| **Battery List** | List of cards; each shows label, status badge, charge %, last reading date |
| **Battery Detail** | Header with label; latest reading summary; list of past readings |
| **Scan Capture** | Full-screen camera or picker; overlay with tips |
| **Confirmation** | Form-style layout; each field editable; Retake / Save actions |

---

## 8. Implementation Order

1. **Project setup** — Xcode project, SwiftData container, design tokens
2. **Models** — Battery, BatteryReading, enums
3. **Battery list + detail** — CRUD, basic navigation
4. **VisionOCRService** — VNRecognizeTextRequest + customWords
5. **BatteryBeakParser** — Regex-based parsing + validation
6. **Scan flow** — Capture → Process → Confirmation → Save
7. **Manual entry** — Form for readings
8. **Polish** — Status badges, quick view, accessibility pass

---

## 9. Info.plist / Permissions

- `NSCameraUsageDescription`: "StrikeTrack needs camera access to scan Battery Beak readings."
- `NSPhotoLibraryUsageDescription`: "StrikeTrack needs photo library access to import Battery Beak screenshots."

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OCR fails on glare/small OLED text | customWords, retake flow, manual fallback |
| Parsing misreads values | Validation ranges, confirmation step, audit log (rawOcrText) |
| SwiftData schema changes | Versioned migrations if model evolves |
| FIRST teams on older iOS | Consider iOS 16 + Core Data if needed |

---

## Appendix: Battery Beak Reference

- **Status**: Good, Fair, Bad, Charge Battery (from Rint vs. predefined ranges)
- **Charge**: SOC % (0–130); "Charge Battery" overrides status when ≤10%
- **Competition-ready**: Lead acid ≥110%, NiMH ≥90%
- **Fair**: Use only for practice/non-critical; **Bad**: Take out of service

---

*Plan version 1.0 — Ready for execution*
