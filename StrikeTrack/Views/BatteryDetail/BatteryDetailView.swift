import SwiftUI
import SwiftData

struct BatteryDetailView: View {
    let battery: Battery
    @State private var showingManualEntry = false
    @State private var showingScan = false

    var body: some View {
        List {
            if let latest = battery.latestReading {
                Section("Latest Reading") {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        HStack {
                            StatusBadge(status: latest.statusEnum)
                            Spacer()
                            Text("\(Int(latest.chargePercent))%")
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        if let rint = latest.internalResistance {
                            Text("Rint: \(String(format: "%.3f", rint)) Ω")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Text(latest.createdAt, style: .date)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, DesignTokens.Spacing.xs)
                }
            }

            Section("Reading History") {
                if battery.readings.isEmpty {
                    Text("No readings yet")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(battery.readings.sorted { $0.createdAt > $1.createdAt }) { reading in
                        ReadingRowView(reading: reading)
                    }
                }
            }
        }
        .navigationTitle(battery.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        showingScan = true
                    } label: {
                        Label("Scan Battery Beak", systemImage: "camera.viewfinder")
                    }
                    Button {
                        showingManualEntry = true
                    } label: {
                        Label("Enter Manually", systemImage: "keyboard")
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $showingManualEntry) {
            ManualEntrySheet(battery: battery)
        }
        .sheet(isPresented: $showingScan) {
            ScanFlowView(selectedBattery: battery)
        }
    }
}

struct ReadingRowView: View {
    let reading: BatteryReading

    var body: some View {
        HStack {
            StatusBadge(status: reading.statusEnum)
            Text("\(Int(reading.chargePercent))%")
                .fontWeight(.medium)
            Spacer()
            Text(reading.createdAt, style: .date)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

extension BatteryReading: @retroactive Identifiable { }
