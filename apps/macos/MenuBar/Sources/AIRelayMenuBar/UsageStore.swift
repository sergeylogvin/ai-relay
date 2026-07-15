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
        guard let snapshot, !snapshot.providers.isEmpty else {
            return "Usage data will appear after Refresh in the browser extension."
        }

        let providerOrder = ["claude", "chatgpt", "gemini"]
        var parts: [String] = []

        for providerId in providerOrder {
            guard let record = snapshot.providers[providerId] else {
                continue
            }

            if record.status != "ok" {
                continue
            }

            let bucket =
                record.buckets.first(where: { $0.id == "session" })
                ?? record.buckets.first(where: { $0.id == "pro" })
                ?? record.buckets.first

            guard let bucket else {
                continue
            }

            let label = providerId.capitalized
            parts.append("\(label) \(Int(bucket.utilization))%")
        }

        if parts.isEmpty {
            return "Usage refresh completed, but no provider data is available yet."
        }

        return parts.joined(separator: " · ")
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
