import Foundation

enum BatteryStatus: String, Codable, CaseIterable {
    case good = "Good"
    case fair = "Fair"
    case bad = "Bad"
    case chargeBattery = "Charge Battery"

    var displayName: String { rawValue }
}

enum Chemistry: String, Codable, CaseIterable {
    case leadAcid = "Lead Acid"
    case nimh = "NiMH"

    var displayName: String { rawValue }
}

enum ReadingSource: String, Codable, CaseIterable {
    case photo = "Photo"
    case manual = "Manual"

    var displayName: String { rawValue }
}
