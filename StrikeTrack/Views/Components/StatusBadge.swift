import SwiftUI

struct StatusBadge: View {
    let status: BatteryStatus

    private var backgroundColor: Color {
        switch status {
        case .good: return DesignTokens.StatusColor.good.opacity(0.2)
        case .fair: return DesignTokens.StatusColor.fair.opacity(0.2)
        case .bad: return DesignTokens.StatusColor.bad.opacity(0.2)
        case .chargeBattery: return DesignTokens.StatusColor.chargeBattery.opacity(0.2)
        }
    }

    private var foregroundColor: Color {
        switch status {
        case .good: return DesignTokens.StatusColor.good
        case .fair: return DesignTokens.StatusColor.fair
        case .bad: return DesignTokens.StatusColor.bad
        case .chargeBattery: return DesignTokens.StatusColor.chargeBattery
        }
    }

    var body: some View {
        Text(status.displayName)
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(foregroundColor)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(backgroundColor)
            .clipShape(Capsule())
    }
}
