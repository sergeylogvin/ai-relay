async function loadRuntime() {
  const [providersModule, coreModule, exportModule] = await Promise.all([
    import(chrome.runtime.getURL("providers/registry.js")),
    import(chrome.runtime.getURL("core/context-engine.js")),
    import(chrome.runtime.getURL("export/exporter.js"))
  ]);

  return {
    ProviderRegistry: providersModule.ProviderRegistry,
    ContextEngine: coreModule.ContextEngine,
    ExportEngine: exportModule.ExportEngine
  };
}

function createProjectId(conversation) {
  const provider = conversation.provider ?? "unknown";
  const title = conversation.title ?? "untitled";

  return `${provider}:${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "ai-relay-project";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AI_RELAY_CAPTURE") return false;

  (async () => {
    try {
      const { ProviderRegistry, ContextEngine, ExportEngine } =
        await loadRuntime();

      const registry = new ProviderRegistry();
      const conversation = registry.readConversation(
        window.location.href,
        document
      );

      if (!conversation.messages.length) {
        throw new Error(
          "No visible conversation messages were found on this page."
        );
      }

      const contextEngine = new ContextEngine({
        recentMessageLimit: 12
      });

      const snapshot = contextEngine.createSnapshot({
        projectId: createProjectId(conversation),
        provider: conversation.provider,
        messages: conversation.messages,
        capturedAt: new Date().toISOString()
      });

      const handoff = contextEngine.createHandoff(snapshot);

      const exportEngine = new ExportEngine();
      const exported = await exportEngine.create({
        conversation,
        handoff,
        createdAt: snapshot.capturedAt
      });

      sendResponse({
        ok: true,
        capture: {
          schemaVersion: exported.schemaVersion,
          provider: conversation.provider,
          title: conversation.title,
          url: conversation.url,
          capturedAt: exported.createdAt,
          messageCount: conversation.messages.length,
          snapshot,
          handoff,
          files: exported.files,
          checksum: exported.checksum,
          markdown: exported.files["handoff.md"]
        }
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })();

  return true;
});
