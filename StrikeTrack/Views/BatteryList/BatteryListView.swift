import SwiftUI
import SwiftData

struct BatteryListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Battery.name) private var batteries: [Battery]
    @State private var showingAddBattery = false
    @State private var batteryToEdit: Battery?
    @State private var showingScan = false

    var body: some View {
        NavigationStack {
            Group {
                if batteries.isEmpty {
                    emptyState
                } else {
                    batteryList
                }
            }
            .navigationTitle("Batteries")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            showingAddBattery = true
                        } label: {
                            Label("Add Battery", systemImage: "plus.circle")
                        }
                        Button {
                            showingScan = true
                        } label: {
                            Label("Scan Battery Beak", systemImage: "camera.viewfinder")
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showingAddBattery) {
                AddBatterySheet()
            }
            .sheet(item: $batteryToEdit) { battery in
                EditBatterySheet(battery: battery)
            }
            .sheet(isPresented: $showingScan) {
                ScanFlowView()
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Batteries", systemImage: "battery.0")
        } description: {
            Text("Add batteries to start tracking. Name each one for easy identification.")
        } actions: {
            Button("Add Battery") {
                showingAddBattery = true
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var batteryList: some View {
        List {
            ForEach(batteries) { battery in
                NavigationLink(value: battery) {
                    BatteryRowView(battery: battery)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    Button(role: .destructive) {
                        deleteBattery(battery)
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
                .contextMenu {
                    Button {
                        batteryToEdit = battery
                    } label: {
                        Label("Edit Name", systemImage: "pencil")
                    }
                    Button {
                        showingScan = true
                    } label: {
                        Label("Scan Reading", systemImage: "camera")
                    }
                    Button(role: .destructive) {
                        deleteBattery(battery)
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: Battery.self) { battery in
            BatteryDetailView(battery: battery)
        }
    }

    private func deleteBattery(_ battery: Battery) {
        modelContext.delete(battery)
    }
}

extension Battery: @retroactive Identifiable { }
