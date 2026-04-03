import SwiftUI
import SwiftData

struct AddBatterySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var chemistry: Chemistry = .leadAcid
    @State private var voltage = 12
    @State private var amphour = 17

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Battery Name") {
                    TextField("e.g., Battery 1, A-17, Pit Alpha", text: $name)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                }

                Section("Specifications") {
                    Picker("Chemistry", selection: $chemistry) {
                        ForEach(Chemistry.allCases, id: \.self) { chem in
                            Text(chem.displayName).tag(chem)
                        }
                    }

                    Picker("Voltage", selection: $voltage) {
                        ForEach([7, 9, 12], id: \.self) { v in
                            Text("\(v)V").tag(v)
                        }
                    }

                    Picker("Amp Hour", selection: $amphour) {
                        ForEach([2, 3, 5, 10, 17], id: \.self) { ah in
                            Text("\(ah) Ah").tag(ah)
                        }
                    }
                }
            }
            .navigationTitle("Add Battery")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addBattery()
                    }
                    .disabled(!canSave)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func addBattery() {
        let battery = Battery(
            name: name.trimmingCharacters(in: .whitespaces),
            chemistry: chemistry,
            voltage: voltage,
            amphour: amphour
        )
        modelContext.insert(battery)
        dismiss()
    }
}
