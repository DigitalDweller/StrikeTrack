import SwiftUI
import SwiftData

struct ConfirmationPhaseView: View {
    @Query(sort: \Battery.name) private var batteries: [Battery]

    let parsedResult: ParsedBatteryReading
    let rawOcrText: String
    let image: UIImage
    @Binding var selectedBattery: Battery?
    var onRetake: () -> Void
    var onSave: (ParsedBatteryReading) -> Void

    @State private var editedStatus: BatteryStatus
    @State private var editedCharge: Double
    @State private var editedRint: String
    @State private var editedV0: String
    @State private var editedV1: String
    @State private var editedV2: String

    init(
        parsedResult: ParsedBatteryReading,
        rawOcrText: String,
        image: UIImage,
        selectedBattery: Binding<Battery?>,
        onRetake: @escaping () -> Void,
        onSave: @escaping (ParsedBatteryReading) -> Void
    ) {
        self.parsedResult = parsedResult
        self.rawOcrText = rawOcrText
        self.image = image
        self._selectedBattery = selectedBattery
        self.onRetake = onRetake
        self.onSave = onSave

        _editedStatus = State(initialValue: parsedResult.status ?? .good)
        _editedCharge = State(initialValue: parsedResult.chargePercent ?? 0)
        _editedRint = State(initialValue: parsedResult.internalResistance.map { String(format: "%.3f", $0) } ?? "")
        _editedV0 = State(initialValue: parsedResult.voltageNoLoad.map { String(format: "%.3f", $0) } ?? "")
        _editedV1 = State(initialValue: parsedResult.voltageLoad1.map { String(format: "%.3f", $0) } ?? "")
        _editedV2 = State(initialValue: parsedResult.voltageLoad2.map { String(format: "%.3f", $0) } ?? "")
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                Text("Review & edit extracted values")
                    .font(.headline)

                Form {
                    Section("Status") {
                            Picker("Status", selection: $editedStatus) {
                                ForEach(BatteryStatus.allCases, id: \.self) { s in
                                    Text(s.displayName).tag(s)
                                }
                            }
                            .pickerStyle(.menu)

                            HStack {
                                Text("Charge %")
                                TextField("0-130", value: $editedCharge, format: .number)
                                    .keyboardType(.decimalPad)
                                    .multilineTextAlignment(.trailing)
                                Text("%")
                            }
                        }

                        Section("Voltage") {
                            TextField("V0 (no load)", text: $editedV0)
                                .keyboardType(.decimalPad)
                            TextField("V1", text: $editedV1)
                                .keyboardType(.decimalPad)
                            TextField("V2", text: $editedV2)
                                .keyboardType(.decimalPad)
                        }

                        Section("Internal Resistance") {
                            TextField("Ohms", text: $editedRint)
                                .keyboardType(.decimalPad)
                        }

                        if !batteries.isEmpty {
                            Section("Save to Battery") {
                                Picker("Battery", selection: $selectedBattery) {
                                    Text("(Don't assign)").tag(nil as Battery?)
                                    ForEach(batteries) { b in
                                        Text(b.name).tag(b as Battery?)
                                    }
                                }
                            }
                        }
                }

                HStack(spacing: DesignTokens.Spacing.md) {
                    Button("Retake") {
                        onRetake()
                    }
                    .buttonStyle(.bordered)

                    Button("Save Reading") {
                        applyEditsAndSave()
                    }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity)
                }
            }
            .padding()
        }
        .onAppear {
            if selectedBattery == nil, let first = batteries.first {
                selectedBattery = first
            }
        }
    }

    private func applyEditsAndSave() {
        var result = ParsedBatteryReading()
        result.status = editedStatus
        result.chargePercent = min(130, max(0, editedCharge))
        result.voltageNoLoad = Double(editedV0)
        result.voltageLoad1 = Double(editedV1)
        result.voltageLoad2 = Double(editedV2)
        result.internalResistance = Double(editedRint)
        result.currentLoad2 = parsedResult.currentLoad2
        onSave(result)
    }
}
