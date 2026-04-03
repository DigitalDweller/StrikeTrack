import SwiftUI
import PhotosUI

struct CapturePhaseView: View {
    @Binding var selectedPhotoItem: PhotosPickerItem?
    @Binding var capturedImage: UIImage?
    var onImageReady: () -> Void

    @State private var showingCamera = false
    @State private var showingImagePicker = false

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            Image(systemName: "camera.viewfinder")
                .font(.system(size: 80))
                .foregroundStyle(.secondary)

            Text("Capture Battery Beak Screen")
                .font(.title2)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)

            Text("Take a photo or choose from your library. Fill the frame with the display and reduce glare.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()

            VStack(spacing: DesignTokens.Spacing.md) {
                PhotosPicker(
                    selection: $selectedPhotoItem,
                    matching: .images,
                    photoLibrary: .shared()
                ) {
                    Label("Choose from Library", systemImage: "photo.on.rectangle.angled")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
                .buttonStyle(.borderedProminent)

                Button {
                    showingCamera = true
                } label: {
                    Label("Take Photo", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xl)
        }
        .fullScreenCover(isPresented: $showingCamera) {
            CameraView(image: $capturedImage, onCaptured: {
                showingCamera = false
                if capturedImage != nil {
                    onImageReady()
                }
            })
            .ignoresSafeArea()
        }
    }
}
