import Foundation

struct UsageBucketRecord: Codable {
    let id: String
    let label: String
    let utilization: Double
    let resetsAt: String?
}

struct ProviderUsageRecord: Codable {
    let provider: String
    let status: String
    let error: String?
    let fetchedAt: String
    let buckets: [UsageBucketRecord]
}

struct UsageSnapshotRecord: Codable {
    let schemaVersion: Int
    let updatedAt: String
    let providers: [String: ProviderUsageRecord]
}

final class UsageStore {
    private let snapshotURL: URL

    private(set) var snapshot: UsageSnapshotRecord?

    init(snapshotURL: URL? = nil) {
        if let snapshotURL {
            self.snapshotURL = snapshotURL
        } else {
            let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("Library/Application Support/AI Relay", isDirectory: true)
            self.snapshotURL = supportDirectory.appendingPathComponent("usage-snapshot.json")
        }

        reload()
    }

    var hasClaudeUsage: Bool {
        snapshot?.providers["claude"] != nil
    }

    var claudeUsage: ProviderUsageRecord? {
        snapshot?.providers["claude"]
    }

    var summaryLine: String {
        guard let claude = claudeUsage else {
            return "Usage data will appear after Refresh in the browser extension."
        }

        if claude.status != "ok" {
            return claude.error ?? "Claude usage unavailable."
        }

        guard let session = claude.buckets.first(where: { $0.id == "session" }) else {
            return "Claude usage synced recently."
        }

        return "Claude session \(Int(session.utilization))% used"
    }

    func reload() {
        guard FileManager.default.fileExists(atPath: snapshotURL.path) else {
            snapshot = nil
            return
        }

        do {
            let data = try Data(contentsOf: snapshotURL)
            snapshot = try JSONDecoder().decode(UsageSnapshotRecord.self, from: data)
        } catch {
            snapshot = nil
        }
    }

    func formatResetLabel(_ isoDate: String?) -> String? {
        guard let isoDate, !isoDate.isEmpty else {
            return nil
        }

        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = parser.date(from: isoDate) ?? ISO8601DateFormatter().date(from: isoDate)

        guard let date else {
            return nil
        }

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return "Resets \(formatter.string(from: date))"
    }
}
