import SwiftUI
import SwiftData

struct ManualEntrySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    let battery: Battery

    @State private var status: BatteryStatus = .good
    @State private var chargePercent: Double = 100
    @State private var voltageNoLoad: String = ""
    @State private var voltageLoad1: String = ""
    @State private var voltageLoad2: String = ""
    @State private var internalResistance: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Status") {
                    Picker("Status", selection: $status) {
                        ForEach(BatteryStatus.allCases, id: \.self) { s in
                            Text(s.displayName).tag(s)
                        }
                    }
                    .pickerStyle(.menu)

                    HStack {
                        Text("Charge %")
                        Spacer()
                        TextField("0-130", value: $chargePercent, format: .number)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                        Text("%")
                    }
                }

                Section("Voltage (optional)") {
                    TextField("V0 (no load)", text: $voltageNoLoad)
                        .keyboardType(.decimalPad)
                    TextField("V1 (load 1)", text: $voltageLoad1)
                        .keyboardType(.decimalPad)
                    TextField("V2 (load 2)", text: $voltageLoad2)
                        .keyboardType(.decimalPad)
                }

                Section("Internal Resistance") {
                    TextField("Ohms (e.g., 0.025)", text: $internalResistance)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle("Manual Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveReading()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func saveReading() {
        let reading = BatteryReading(
            status: status,
            chargePercent: min(130, max(0, chargePercent)),
            voltageNoLoad: Double(voltageNoLoad),
            voltageLoad1: Double(voltageLoad1),
            voltageLoad2: Double(voltageLoad2),
            internalResistance: Double(internalResistance),
            source: .manual
        )
        reading.battery = battery
        battery.readings.append(reading)
        modelContext.insert(reading)
        dismiss()
    }
}
