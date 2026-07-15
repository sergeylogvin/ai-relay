import AppKit
import ApplicationServices

enum AutoPasteError: Error {
    case accessibilityRequired
    case eventFailed
}

enum AutoPasteController {
    private static let pasteKeyCode = CGKeyCode(9)

    static func isTrusted(prompt: Bool = false) -> Bool {
        let promptKey = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options = [promptKey: prompt] as CFDictionary

        return AXIsProcessTrustedWithOptions(options)
    }

    static func pasteIntoFrontmostApp() -> Result<Void, AutoPasteError> {
        guard isTrusted() else {
            return .failure(.accessibilityRequired)
        }

        let source = CGEventSource(stateID: .combinedSessionState)

        guard
            let keyDown = CGEvent(
                keyboardEventSource: source,
                virtualKey: pasteKeyCode,
                keyDown: true
            ),
            let keyUp = CGEvent(
                keyboardEventSource: source,
                virtualKey: pasteKeyCode,
                keyDown: false
            )
        else {
            return .failure(.eventFailed)
        }

        keyDown.flags = .maskCommand
        keyUp.flags = .maskCommand
        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)

        return .success(())
    }

    static func openAccessibilitySettings() {
        if let url = URL(
            string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        ) {
            NSWorkspace.shared.open(url)
        }
    }

    static func requestAccessibilityPermission() {
        _ = isTrusted(prompt: true)
    }
}
