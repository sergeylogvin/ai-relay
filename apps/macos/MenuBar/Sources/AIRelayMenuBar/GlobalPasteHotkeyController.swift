import AppKit

final class GlobalPasteHotkeyController {
    static let preferencesKey = "globalPasteHotkeyEnabled"
    static let shortcutLabel = "Cmd+Shift+V"

    private var globalMonitor: Any?
    private var localMonitor: Any?
    private var handler: (() -> Void)?

    var isEnabled: Bool {
        get {
            if UserDefaults.standard.object(forKey: Self.preferencesKey) == nil {
                return true
            }

            return UserDefaults.standard.bool(forKey: Self.preferencesKey)
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Self.preferencesKey)
            restart()
        }
    }

    func start(handler: @escaping () -> Void) {
        self.handler = handler
        restart()
    }

    func stop() {
        if let globalMonitor {
            NSEvent.removeMonitor(globalMonitor)
            self.globalMonitor = nil
        }

        if let localMonitor {
            NSEvent.removeMonitor(localMonitor)
            self.localMonitor = nil
        }
    }

    private func restart() {
        stop()

        guard isEnabled, let handler else {
            return
        }

        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { event in
            guard Self.matchesPasteHotkey(event) else {
                return
            }

            DispatchQueue.main.async {
                handler()
            }
        }

        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            guard Self.matchesPasteHotkey(event) else {
                return event
            }

            handler()
            return nil
        }
    }

    private static func matchesPasteHotkey(_ event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection([.command, .shift, .option, .control])

        guard flags == [.command, .shift] else {
            return false
        }

        return event.charactersIgnoringModifiers?.lowercased() == "v"
    }
}
