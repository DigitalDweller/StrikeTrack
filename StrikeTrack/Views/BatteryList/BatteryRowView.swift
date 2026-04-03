import SwiftUI
import SwiftData

struct BatteryRowView: View {
    let battery: Battery

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(battery.name)
                    .font(.headline)
                    .fontWeight(.semibold)

                if let reading = battery.latestReading {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        StatusBadge(status: reading.statusEnum)
                        Text("\(Int(reading.chargePercent))%")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(reading.createdAt, style: .date)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                } else {
                    Text("No readings yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, DesignTokens.Spacing.xs)
    }
}
