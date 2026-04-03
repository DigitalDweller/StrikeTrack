import Foundation
import SwiftData

@Model
final class Battery: Hashable {
    static func == (lhs: Battery, rhs: Battery) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    @Attribute(.unique) var id: UUID
    var name: String
    var chemistry: String
    var voltage: Int
    var amphour: Int
    var notes: String?
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \BatteryReading.battery)
    var readings: [BatteryReading] = []

    init(
        id: UUID = UUID(),
        name: String,
        chemistry: Chemistry = .leadAcid,
        voltage: Int = 12,
        amphour: Int = 17,
        notes: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.chemistry = chemistry.rawValue
        self.voltage = voltage
        self.amphour = amphour
        self.notes = notes
        self.createdAt = createdAt
    }

    var latestReading: BatteryReading? {
        readings.sorted { $0.createdAt > $1.createdAt }.first
    }
}
