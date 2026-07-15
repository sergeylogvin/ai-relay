import AppKit

final class HandoffPanelController: NSWindowController, NSWindowDelegate {
    private let store: HandoffStore
    private let titleField = NSTextField(wrappingLabelWithString: "No pending handoff")
    private let statusField = NSTextField(wrappingLabelWithString: "Capture in the browser extension.")
    private let copyButton = NSButton(title: "Copy handoff", target: nil, action: nil)
    private let refreshButton = NSButton(title: "Refresh", target: nil, action: nil)
    private let clearButton = NSButton(title: "Clear inbox", target: nil, action: nil)

    init(store: HandoffStore) {
        self.store = store

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 240),
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
        clearButton.isEnabled = hasHandoff
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
        store.copyToClipboard()
    }

    @objc private func refreshClicked() {
        refresh()
    }

    @objc private func clearInbox() {
        store.clearInbox()
        refresh()
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

        refreshButton.target = self
        refreshButton.action = #selector(refreshClicked)
        refreshButton.bezelStyle = .rounded

        clearButton.target = self
        clearButton.action = #selector(clearInbox)
        clearButton.bezelStyle = .rounded

        let buttonRow = NSStackView(views: [copyButton, refreshButton])
        buttonRow.orientation = .horizontal
        buttonRow.spacing = 8

        let stack = NSStackView(views: [titleField, statusField, buttonRow, clearButton])
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
            statusField.widthAnchor.constraint(equalTo: stack.widthAnchor)
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
        panelController?.showPanel()

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
