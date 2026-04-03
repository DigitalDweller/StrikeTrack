import Foundation

struct ParsedBatteryReading {
    var status: BatteryStatus?
    var chargePercent: Double?
    var voltageNoLoad: Double?
    var voltageLoad1: Double?
    var voltageLoad2: Double?
    var currentLoad2: Double?
    var internalResistance: Double?
}

struct BatteryBeakParser {
    static func parse(_ ocrText: String) -> ParsedBatteryReading {
        var result = ParsedBatteryReading()
        let text = ocrText
            .replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "  ", with: " ")
            .trimmingCharacters(in: .whitespaces)

        result.status = parseStatus(from: text)
        result.chargePercent = parseCharge(from: text)
        let (v0, _) = parseVoltageLine(from: text, prefix: "V0")
        let (v1, _) = parseVoltageLine(from: text, prefix: "V1")
        let (v2, amps2) = parseVoltageLine(from: text, prefix: "V2")
        result.voltageNoLoad = v0
        result.voltageLoad1 = v1
        result.voltageLoad2 = v2
        result.currentLoad2 = amps2
        result.internalResistance = parseRint(from: text)

        return result
    }

    private static func parseStatus(from text: String) -> BatteryStatus? {
        if let match = text.range(of: #"Status:\s*(Good|Fair|Bad|Charge Battery)"#, options: .regularExpression) {
            let substr = String(text[match])
            if let statusStr = substr.split(separator: ":").last?.trimmingCharacters(in: .whitespaces),
               let status = BatteryStatus(rawValue: statusStr) {
                return status
            }
        }
        for status in BatteryStatus.allCases {
            if text.contains(status.rawValue) {
                return status
            }
        }
        return nil
    }

    private static func parseCharge(from text: String) -> Double? {
        if let match = text.range(of: #"Charge:\s*(\d{1,3})%?"#, options: .regularExpression) {
            let substr = String(text[match])
            if let numMatch = substr.range(of: #"\d{1,3}"#, options: .regularExpression),
               let val = Double(String(text[numMatch])) {
                return min(130, max(0, val))
            }
        }
        if let match = text.range(of: #"\d{1,3}%"#, options: .regularExpression) {
            let substr = String(text[match])
            let num = substr.replacingOccurrences(of: "%", with: "")
            if let val = Double(num) {
                return min(130, max(0, val))
            }
        }
        return nil
    }

    private static func parseVoltageLine(from text: String, prefix: String) -> (Double?, Double?) {
        let pattern = "\(prefix):\\s*([0-9.]+)\\s*([0-9]+)\\s*Amps?"
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return (nil, nil) }
        let nsText = text as NSString
        guard let m = regex.firstMatch(in: text, range: NSRange(location: 0, length: nsText.length)),
              m.numberOfRanges >= 2 else { return (nil, nil) }
        let vRange = m.range(at: 1)
        guard vRange.location != NSNotFound,
              let voltage = Double(nsText.substring(with: vRange)) else { return (nil, nil) }
        var amps: Double? = nil
        if m.numberOfRanges >= 3 {
            let aRange = m.range(at: 2)
            if aRange.location != NSNotFound {
                amps = Double(nsText.substring(with: aRange))
            }
        }
        return (voltage, amps)
    }

    private static func parseRint(from text: String) -> Double? {
        if let match = text.range(of: #"Rint:\s*([\d.]+)\s*Ohms?"#, options: .regularExpression) {
            let substr = String(text[match])
            let nums = substr.components(separatedBy: CharacterSet.decimalDigits.union(CharacterSet(charactersIn: ".")).inverted)
                .filter { !$0.isEmpty }
                .compactMap { Double($0) }
            if let first = nums.first {
                return first
            }
        }
        if let match = text.range(of: #"[\d.]++\s*Ohms?"#, options: .regularExpression) {
            let substr = String(text[match])
            let numStr = substr.components(separatedBy: CharacterSet.decimalDigits.union(CharacterSet(charactersIn: ".")).inverted)
                .joined()
            if let val = Double(numStr) {
                return val
            }
        }
        return nil
    }
}
