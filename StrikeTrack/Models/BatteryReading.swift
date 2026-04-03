import Foundation
import SwiftData

@Model
final class BatteryReading {
    var id: UUID
    var status: String
    var chargePercent: Double
    var voltageNoLoad: Double?
    var voltageLoad1: Double?
    var voltageLoad2: Double?
    var currentLoad2: Double?
    var internalResistance: Double?
    var rawOcrText: String?
    var source: String
    var createdAt: Date

    var battery: Battery?

    init(
        id: UUID = UUID(),
        status: BatteryStatus,
        chargePercent: Double,
        voltageNoLoad: Double? = nil,
        voltageLoad1: Double? = nil,
        voltageLoad2: Double? = nil,
        currentLoad2: Double? = nil,
        internalResistance: Double? = nil,
        rawOcrText: String? = nil,
        source: ReadingSource,
        createdAt: Date = Date(),
        battery: Battery? = nil
    ) {
        self.id = id
        self.status = status.rawValue
        self.chargePercent = chargePercent
        self.voltageNoLoad = voltageNoLoad
        self.voltageLoad1 = voltageLoad1
        self.voltageLoad2 = voltageLoad2
        self.currentLoad2 = currentLoad2
        self.internalResistance = internalResistance
        self.rawOcrText = rawOcrText
        self.source = source.rawValue
        self.createdAt = createdAt
        self.battery = battery
    }

    var statusEnum: BatteryStatus {
        BatteryStatus(rawValue: status) ?? .good
    }
}
