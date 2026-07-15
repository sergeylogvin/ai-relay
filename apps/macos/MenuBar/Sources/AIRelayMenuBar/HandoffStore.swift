import AppKit
import Foundation

struct HandoffRecord: Codable {
    let schemaVersion: Int
    let storedAt: String
    let provider: String
    let title: String
    let url: String?
    let handoffMode: String?
    let characters: Int
    let markdown: String
}

@MainActor
final class HandoffStore: ObservableObject {
    @Published private(set) var handoff: HandoffRecord?

    private let inboxURL: URL
    private var pollTimer: Timer?

    init(inboxURL: URL? = nil) {
        if let inboxURL {
            self.inboxURL = inboxURL
        } else {
            let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("Library/Application Support/AI Relay", isDirectory: true)
            self.inboxURL = supportDirectory.appendingPathComponent("pending-handoff.json")
        }

        reload()
        startPolling()
    }

    deinit {
        pollTimer?.invalidate()
    }

    var menuTitle: String {
        guard let handoff else {
            return "No pending handoff"
        }

        return handoff.title
    }

    var statusLine: String {
        guard let handoff else {
            return "Capture in the browser extension to sync a handoff."
        }

        let mode = handoff.handoffMode ?? "handoff"
        return "\(handoff.provider) · \(mode) · \(handoff.characters) chars"
    }

    func reload() {
        guard FileManager.default.fileExists(atPath: inboxURL.path) else {
            handoff = nil
            return
        }

        do {
            let data = try Data(contentsOf: inboxURL)
            let decoded = try JSONDecoder().decode(HandoffRecord.self, from: data)

            if decoded.markdown.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                handoff = nil
                return
            }

            handoff = decoded
        } catch {
            handoff = nil
        }
    }

    func copyToClipboard() {
        guard let markdown = handoff?.markdown else {
            return
        }

        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(markdown, forType: .string)
    }

    func clearInbox() {
        try? FileManager.default.removeItem(at: inboxURL)
        handoff = nil
    }

    private func startPolling() {
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.reload()
            }
        }
    }
}
