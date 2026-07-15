import Foundation

enum InboxBridgeLauncher {
    static func ensureRunning() {
        guard let scriptURL = resolveStartScriptURL() else {
            return
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = [scriptURL.path]

        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            fputs("AI Relay: failed to start inbox bridge: \(error.localizedDescription)\n", stderr)
        }
    }

    private static func resolveStartScriptURL() -> URL? {
        if let bundled = Bundle.main.url(
            forResource: "start-inbox-bridge",
            withExtension: "sh",
            subdirectory: "inbox-bridge"
        ) {
            return bundled
        }

        let devScript = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("scripts/start-inbox-bridge.sh")

        if FileManager.default.fileExists(atPath: devScript.path) {
            return devScript
        }

        return nil
    }
}
