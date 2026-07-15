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

final class HandoffStore: ObservableObject {
    @Published private(set) var handoff: HandoffRecord?

    private let inboxURL: URL

    init(inboxURL: URL? = nil) {
        if let inboxURL {
            self.inboxURL = inboxURL
        } else {
            let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("Library/Application Support/AI Relay", isDirectory: true)
            self.inboxURL = supportDirectory.appendingPathComponent("pending-handoff.json")
        }

        reload()
    }

    var menuBarLabel: String {
        guard let handoff else {
            return "AI Relay"
        }

        let title = handoff.title.trimmingCharacters(in: .whitespacesAndNewlines)

        if title.isEmpty {
            return "AI Relay"
        }

        if title.count <= 28 {
            return title
        }

        return String(title.prefix(25)) + "..."
    }

    var menuTitle: String {
        guard let handoff else {
            return "No pending handoff"
        }

        return handoff.title
    }

    var statusLine: String {
        guard let handoff else {
            return "Waiting for Capture in the browser extension."
        }

        let mode = handoff.handoffMode ?? "handoff"
        let syncedAt = formatStoredAt(handoff.storedAt)
        return "\(handoff.provider) · \(mode) · \(handoff.characters) chars · synced \(syncedAt)"
    }

    private func formatStoredAt(_ isoDate: String) -> String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = parser.date(from: isoDate) ?? ISO8601DateFormatter().date(from: isoDate) else {
            return "recently"
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
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
}
