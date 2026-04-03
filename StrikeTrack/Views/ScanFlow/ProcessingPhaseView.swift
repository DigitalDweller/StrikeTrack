import SwiftUI

struct ProcessingPhaseView: View {
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
            Text("Reading Battery Beak display…")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
