import AppKit

enum HandoffPasteResult {
    case pasted
    case noHandoff
    case accessibilityRequired
    case eventFailed
}

enum HandoffPasteService {
    static func pasteFromHotkey(store: HandoffStore) -> HandoffPasteResult {
        store.reload()

        guard store.copyToClipboard() else {
            return .noHandoff
        }

        guard AutoPasteController.isTrusted() else {
            return .accessibilityRequired
        }

        return performPaste()
    }

    static func pasteFromWindow(store: HandoffStore, window: NSWindow?, completion: @escaping (HandoffPasteResult) -> Void) {
        store.reload()

        guard store.copyToClipboard() else {
            completion(.noHandoff)
            return
        }

        guard AutoPasteController.isTrusted() else {
            completion(.accessibilityRequired)
            return
        }

        window?.orderOut(nil)
        NSApp.hide(nil)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            completion(performPaste())
        }
    }

    private static func performPaste() -> HandoffPasteResult {
        switch AutoPasteController.pasteIntoFrontmostApp() {
        case .success:
            return .pasted
        case .failure(.accessibilityRequired):
            return .accessibilityRequired
        case .failure(.eventFailed):
            return .eventFailed
        }
    }
}
