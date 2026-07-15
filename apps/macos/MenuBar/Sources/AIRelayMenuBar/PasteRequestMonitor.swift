import AppKit

struct PasteRequestRecord: Codable {
    let requestedAt: String
    let storedAt: String
    let targetApp: String
}

enum PasteTargetApp: String {
    case cursor
    case chatgpt
    case front

    init(rawValue: String) {
        switch rawValue.lowercased() {
        case "cursor":
            self = .cursor
        case "chatgpt", "cowork":
            self = .chatgpt
        default:
            self = .front
        }
    }
}

final class PasteRequestMonitor {
    private let requestURL: URL
    private var handledStoredAt: String?

    init(requestURL: URL? = nil) {
        if let requestURL {
            self.requestURL = requestURL
        } else {
            let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("Library/Application Support/AI Relay", isDirectory: true)
            self.requestURL = supportDirectory.appendingPathComponent("pending-paste-request.json")
        }
    }

    func pendingRequest() -> PasteRequestRecord? {
        guard FileManager.default.fileExists(atPath: requestURL.path) else {
            return nil
        }

        do {
            let data = try Data(contentsOf: requestURL)
            let decoded = try JSONDecoder().decode(PasteRequestRecord.self, from: data)
            return decoded
        } catch {
            return nil
        }
    }

    func clearRequest() {
        try? FileManager.default.removeItem(at: requestURL)
    }

    func shouldHandle(request: PasteRequestRecord, for app: NSRunningApplication) -> Bool {
        if handledStoredAt == request.storedAt {
            return false
        }

        let target = PasteTargetApp(rawValue: request.targetApp)

        switch target {
        case .cursor:
            return isCursorApp(app)
        case .chatgpt:
            return isDesktopHandoffApp(app)
        case .front:
            return !isAIRelayApp(app)
        }
    }

    func markHandled(_ request: PasteRequestRecord) {
        handledStoredAt = request.storedAt
        clearRequest()
    }

    private func isCursorApp(_ app: NSRunningApplication) -> Bool {
        let bundleId = app.bundleIdentifier?.lowercased() ?? ""
        let name = app.localizedName?.lowercased() ?? ""

        return bundleId.contains("cursor") || name == "cursor"
    }

    private func isDesktopHandoffApp(_ app: NSRunningApplication) -> Bool {
        let bundleId = app.bundleIdentifier?.lowercased() ?? ""
        let name = app.localizedName?.lowercased() ?? ""

        return isChatGPTDesktopApp(bundleId: bundleId, name: name)
            || isClaudeDesktopApp(bundleId: bundleId, name: name)
    }

    private func isChatGPTDesktopApp(bundleId: String, name: String) -> Bool {
        return bundleId.contains("chatgpt")
            || bundleId.contains("openai.chat")
            || bundleId.contains("openai.codex")
            || name.contains("chatgpt")
    }

    private func isClaudeDesktopApp(bundleId: String, name: String) -> Bool {
        return bundleId.contains("anthropic.claude")
            || bundleId.contains("claude.usagebar")
            || name == "claude"
            || name.contains("cowork")
    }

    private func isAIRelayApp(_ app: NSRunningApplication) -> Bool {
        app.bundleIdentifier == Bundle.main.bundleIdentifier
    }
}
