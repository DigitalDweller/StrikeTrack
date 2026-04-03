import SwiftUI
import SwiftData

struct EditBatterySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var battery: Battery
    @State private var editedName: String = ""
    @State private var editedChemistry: Chemistry = .leadAcid
    @State private var editedVoltage: Int = 12
    @State private var editedAmphour: Int = 17
    @State private var editedNotes: String = ""

    private var canSave: Bool {
        !editedName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Battery Name") {
                    TextField("Name", text: $editedName)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                }

                Section("Specifications") {
                    Picker("Chemistry", selection: $editedChemistry) {
                        ForEach(Chemistry.allCases, id: \.self) { chem in
                            Text(chem.displayName).tag(chem)
                        }
                    }

                    Picker("Voltage", selection: $editedVoltage) {
                        ForEach([7, 9, 12], id: \.self) { v in
                            Text("\(v)V").tag(v)
                        }
                    }

                    Picker("Amp Hour", selection: $editedAmphour) {
                        ForEach([2, 3, 5, 10, 17], id: \.self) { ah in
                            Text("\(ah) Ah").tag(ah)
                        }
                    }
                }

                Section("Notes") {
                    TextField("Optional notes", text: $editedNotes, axis: .vertical)
                        .lineLimit(3...6)
                }

                if !battery.readings.isEmpty {
                    Section {
                        NavigationLink {
                            BatteryDetailView(battery: battery)
                        } label: {
                            Label("View History", systemImage: "clock.arrow.circlepath")
                        }
                    }
                }
            }
            .navigationTitle("Edit Battery")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                loadFromBattery()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveToBattery()
                    }
                    .disabled(!canSave)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func loadFromBattery() {
        editedName = battery.name
        editedChemistry = Chemistry(rawValue: battery.chemistry) ?? .leadAcid
        editedVoltage = battery.voltage
        editedAmphour = battery.amphour
        editedNotes = battery.notes ?? ""
    }

    private func saveToBattery() {
        battery.name = editedName.trimmingCharacters(in: .whitespaces)
        battery.chemistry = editedChemistry.rawValue
        battery.voltage = editedVoltage
        battery.amphour = editedAmphour
        battery.notes = editedNotes.isEmpty ? nil : editedNotes
        dismiss()
    }
}
