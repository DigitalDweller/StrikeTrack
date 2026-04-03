import SwiftUI
import SwiftData
import PhotosUI

struct ScanFlowView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    var selectedBattery: Battery? = nil

    @State private var phase: ScanPhase = .capture
    @State private var capturedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var parsedResult: ParsedBatteryReading?
    @State private var rawOcrText: String = ""
    @State private var isProcessing = false
    @State private var processingError: String?
    @State private var batteryToSaveTo: Battery?

    enum ScanPhase {
        case capture
        case processing
        case confirmation
    }

    var body: some View {
        NavigationStack {
            Group {
                switch phase {
                case .capture:
                    CapturePhaseView(
                        selectedPhotoItem: $selectedPhotoItem,
                        capturedImage: $capturedImage,
                        onImageReady: startProcessing
                    )
                case .processing:
                    ProcessingPhaseView()
                case .confirmation:
                    if let result = parsedResult, let image = capturedImage {
                        ConfirmationPhaseView(
                            parsedResult: result,
                            rawOcrText: rawOcrText,
                            image: image,
                            selectedBattery: $batteryToSaveTo,
                            onRetake: retake,
                            onSave: saveReading
                        )
                        .environment(\.modelContext, modelContext)
                    }
                }
            }
            .navigationTitle("Scan Battery Beak")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onChange(of: selectedPhotoItem) { _, newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let img = UIImage(data: data) {
                        capturedImage = img
                        startProcessing()
                    }
                }
            }
        }
        .onAppear {
            batteryToSaveTo = selectedBattery
        }
    }

    private func startProcessing() {
        guard let image = capturedImage else { return }
        phase = .processing
        Task {
            await processImage(image)
        }
    }

    private func processImage(_ image: UIImage) async {
        let service = VisionOCRService()
        do {
            let text = try await service.recognizeText(from: image)
            rawOcrText = text
            parsedResult = BatteryBeakParser.parse(text)
            await MainActor.run {
                phase = .confirmation
            }
        } catch {
            await MainActor.run {
                processingError = error.localizedDescription
                parsedResult = ParsedBatteryReading()
                phase = .confirmation
            }
        }
    }

    private func retake() {
        phase = .capture
        capturedImage = nil
        selectedPhotoItem = nil
        parsedResult = nil
        rawOcrText = ""
        processingError = nil
    }

    private func saveReading(_ result: ParsedBatteryReading) {
        let status = result.status ?? .good
        let charge = result.chargePercent ?? 0

        let reading = BatteryReading(
            status: status,
            chargePercent: charge,
            voltageNoLoad: result.voltageNoLoad,
            voltageLoad1: result.voltageLoad1,
            voltageLoad2: result.voltageLoad2,
            currentLoad2: result.currentLoad2,
            internalResistance: result.internalResistance,
            rawOcrText: rawOcrText.isEmpty ? nil : rawOcrText,
            source: .photo
        )

        if let battery = batteryToSaveTo {
            reading.battery = battery
            battery.readings.append(reading)
        }
        modelContext.insert(reading)
        dismiss()
    }
}
