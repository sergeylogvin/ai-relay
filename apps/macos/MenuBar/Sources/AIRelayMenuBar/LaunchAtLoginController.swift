import AppKit
import ServiceManagement

enum LaunchAtLoginController {
    static func isEnabled() -> Bool {
        guard #available(macOS 13.0, *) else {
            return false
        }

        return SMAppService.mainApp.status == .enabled
    }

    static func setEnabled(_ enabled: Bool) throws {
        guard #available(macOS 13.0, *) else {
            throw LaunchAtLoginError.unsupported
        }

        if enabled {
            try SMAppService.mainApp.register()
            return
        }

        try SMAppService.mainApp.unregister()
    }

    static func shouldPresentWindowOnLaunch() -> Bool {
        guard isEnabled() else {
            return true
        }

        return NSApplication.shared.isActive
    }
}

enum LaunchAtLoginError: LocalizedError {
    case unsupported

    var errorDescription: String? {
        switch self {
        case .unsupported:
            return "Launch at login requires macOS 13 or later."
        }
    }
}
