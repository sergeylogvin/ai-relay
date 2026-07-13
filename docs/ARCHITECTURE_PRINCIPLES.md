# Architecture Principles

These principles guide every technical decision in AI Relay.

1. **Core is UI-independent.** Shared domain logic must not depend on browser, desktop, or framework code.
2. **Providers are replaceable.** Claude, ChatGPT, Gemini, and future adapters must remain isolated behind stable contracts.
3. **Local-first by default.** User data is stored locally unless the user explicitly enables another storage mechanism.
4. **Explicit transfer control.** AI Relay must never submit messages or transfer context without a clear user action.
5. **Minimum permissions.** Browser and desktop clients request only the permissions required for the current feature set.
6. **Open, durable formats.** Exported projects and handoffs must remain human-readable and independently parseable.
7. **Immutable snapshots.** Historical project snapshots are append-only and must not be silently rewritten.
8. **Security boundaries are visible.** Corporate-to-personal transfers require review and clear warnings.
9. **No hidden telemetry.** Analytics and diagnostics are opt-in and disabled by default.
10. **Backward compatibility matters.** Stored user projects must remain readable across future versions whenever practical.
