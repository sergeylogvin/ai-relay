import AppKit

final class HandoffPanelController: NSWindowController, NSWindowDelegate {
    private let store: HandoffStore
    private let titleField = NSTextField(wrappingLabelWithString: "No pending handoff")
    private let statusField = NSTextField(wrappingLabelWithString: "Capture in the browser extension.")
    private let copyButton = NSButton(title: "Copy handoff", target: nil, action: nil)
    private let pasteButton = NSButton(title: "Paste into front app", target: nil, action: nil)
    private let refreshButton = NSButton(title: "Refresh", target: nil, action: nil)
    private let clearButton = NSButton(title: "Clear inbox", target: nil, action: nil)
    private let launchAtLoginCheckbox = NSButton(
        checkboxWithTitle: "Launch at login",
        target: nil,
        action: nil
    )

    init(store: HandoffStore) {
        self.store = store

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 310),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )

        window.title = "AI Relay"
        window.isReleasedWhenClosed = false
        window.center()

        super.init(window: window)
        window.delegate = self
        configureContent()
        refresh()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func refresh() {
        store.reload()

        titleField.stringValue = store.menuTitle
        statusField.stringValue = store.statusLine

        let hasHandoff = store.handoff != nil
        copyButton.isEnabled = hasHandoff
        pasteButton.isEnabled = hasHandoff
        clearButton.isEnabled = hasHandoff
        launchAtLoginCheckbox.state = LaunchAtLoginController.isEnabled() ? .on : .off
    }

    func showPanel() {
        guard let window else {
            return
        }

        window.center()
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }

    @objc private func copyHandoff() {
        guard store.copyToClipboard() else {
            statusField.stringValue = "No handoff is available to copy."
            return
        }

        statusField.stringValue = "Copied to clipboard. Switch apps and press Cmd+V."
    }

    @objc private func pasteHandoff() {
        guard store.copyToClipboard() else {
            statusField.stringValue = "No handoff is available to paste."
            return
        }

        guard AutoPasteController.isTrusted() else {
            showAccessibilityAlert()
            return
        }

        window?.orderOut(nil)
        NSApp.hide(nil)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            switch AutoPasteController.pasteIntoFrontmostApp() {
            case .success:
                self?.statusField.stringValue = "Pasted into the front app."
            case .failure(.accessibilityRequired):
                self?.showAccessibilityAlert()
            case .failure(.eventFailed):
                self?.statusField.stringValue = "Paste failed. Copy the handoff and use Cmd+V manually."
            }
        }
    }

    @objc private func refreshClicked() {
        refresh()
    }

    @objc private func clearInbox() {
        store.clearInbox()
        refresh()
    }

    @objc private func toggleLaunchAtLogin() {
        let shouldEnable = launchAtLoginCheckbox.state == .on

        do {
            try LaunchAtLoginController.setEnabled(shouldEnable)
            statusField.stringValue = shouldEnable
                ? "AI Relay will start quietly at login."
                : "Launch at login disabled."
        } catch {
            launchAtLoginCheckbox.state = LaunchAtLoginController.isEnabled() ? .on : .off
            statusField.stringValue =
                "Could not update login item. Copy AI Relay to /Applications, then try again."
        }
    }

    private func showAccessibilityAlert() {
        let alert = NSAlert()
        alert.messageText = "Accessibility permission required"
        alert.informativeText =
            "AI Relay needs Accessibility access to paste into Cowork, Cursor, or ChatGPT desktop. Enable AI Relay in System Settings → Privacy & Security → Accessibility."
        alert.addButton(withTitle: "Open Settings")
        alert.addButton(withTitle: "Not now")

        if alert.runModal() == .alertFirstButtonReturn {
            AutoPasteController.openAccessibilitySettings()
        }

        AutoPasteController.requestAccessibilityPermission()
        statusField.stringValue = "Enable Accessibility for AI Relay, then try Paste again."
    }

    private func configureContent() {
        guard let contentView = window?.contentView else {
            return
        }

        titleField.font = NSFont.boldSystemFont(ofSize: 15)
        statusField.font = NSFont.systemFont(ofSize: 12)
        statusField.textColor = .secondaryLabelColor

        copyButton.target = self
        copyButton.action = #selector(copyHandoff)
        copyButton.bezelStyle = .rounded

        pasteButton.target = self
        pasteButton.action = #selector(pasteHandoff)
        pasteButton.bezelStyle = .rounded
        pasteButton.keyEquivalent = ""

        refreshButton.target = self
        refreshButton.action = #selector(refreshClicked)
        refreshButton.bezelStyle = .rounded

        clearButton.target = self
        clearButton.action = #selector(clearInbox)
        clearButton.bezelStyle = .rounded

        launchAtLoginCheckbox.target = self
        launchAtLoginCheckbox.action = #selector(toggleLaunchAtLogin)

        let actionRow = NSStackView(views: [copyButton, pasteButton])
        actionRow.orientation = .horizontal
        actionRow.spacing = 8
        actionRow.distribution = .fillEqually

        let utilityRow = NSStackView(views: [refreshButton, clearButton])
        utilityRow.orientation = .horizontal
        utilityRow.spacing = 8
        utilityRow.distribution = .fillEqually

        let stack = NSStackView(views: [
            titleField,
            statusField,
            actionRow,
            utilityRow,
            launchAtLoginCheckbox
        ])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false

        contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -16),
            titleField.widthAnchor.constraint(equalTo: stack.widthAnchor),
            statusField.widthAnchor.constraint(equalTo: stack.widthAnchor),
            actionRow.widthAnchor.constraint(equalTo: stack.widthAnchor),
            utilityRow.widthAnchor.constraint(equalTo: stack.widthAnchor)
        ])
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let store = HandoffStore()
    private var panelController: HandoffPanelController?
    private var pollTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        InboxBridgeLauncher.ensureRunning()

        panelController = HandoffPanelController(store: store)

        if LaunchAtLoginController.shouldPresentWindowOnLaunch() {
            panelController?.showPanel()
        }

        pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.panelController?.refresh()
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        panelController?.showPanel()
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        pollTimer?.invalidate()
    }
}
