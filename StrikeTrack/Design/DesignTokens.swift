import SwiftUI

enum DesignTokens {
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }

    enum StatusColor {
        static let good = Color.green
        static let fair = Color.orange
        static let bad = Color.red
        static let chargeBattery = Color.orange
    }

    enum AppColor {
        static let background = Color(uiColor: .systemBackground)
        static let secondaryBackground = Color(uiColor: .secondarySystemBackground)
        static let accent = Color.accentColor
    }
}
