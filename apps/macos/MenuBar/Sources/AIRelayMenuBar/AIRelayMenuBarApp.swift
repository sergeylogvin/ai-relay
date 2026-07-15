import SwiftUI

@main
struct AIRelayMenuBarApp: App {
    @StateObject private var store = HandoffStore()

    var body: some Scene {
        MenuBarExtra("AI Relay", systemImage: "arrow.triangle.2.circlepath") {
            VStack(alignment: .leading, spacing: 8) {
                Text(store.menuTitle)
                    .font(.headline)

                Text(store.statusLine)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Divider()

                Button("Copy handoff") {
                    store.copyToClipboard()
                }
                .disabled(store.handoff == nil)

                Button("Refresh") {
                    store.reload()
                }

                Button("Clear inbox") {
                    store.clearInbox()
                }
                .disabled(store.handoff == nil)

                Divider()

                Button("Quit AI Relay Menu Bar") {
                    NSApplication.shared.terminate(nil)
                }
            }
            .padding(12)
        }
        .menuBarExtraStyle(.window)
    }
}
