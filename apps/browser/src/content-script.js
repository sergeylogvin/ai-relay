async function loadRuntime() {
  const [providersModule, coreModule, exportModule, metadataModule] =
    await Promise.all([
      import(chrome.runtime.getURL("providers/registry.js")),
      import(chrome.runtime.getURL("core/context-engine.js")),
      import(chrome.runtime.getURL("export/exporter.js")),
      import(chrome.runtime.getURL("capture-metadata.js"))
    ]);

  return {
    ProviderRegistry: providersModule.ProviderRegistry,
    ContextEngine: coreModule.ContextEngine,
    ExportEngine: exportModule.ExportEngine,
    collectCaptureMetadata: metadataModule.collectCaptureMetadata
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
  if (message?.type === "AI_RELAY_PING") {
    sendResponse({ ok: true });
    return false;
  }

  const usageFetchMessages = new Set([
    "AI_RELAY_FETCH_CHATGPT_USAGE",
    "AI_RELAY_FETCH_GEMINI_USAGE"
  ]);

  if (usageFetchMessages.has(message?.type)) {
    (async () => {
      try {
        const { handleUsageFetchMessage } = await import(
          chrome.runtime.getURL("usage-fetch-handlers.js")
        );
        sendResponse(await handleUsageFetchMessage(message.type));
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })();

    return true;
  }

  const supportedMessages = new Set([
    "AI_RELAY_CAPTURE",
    "AI_RELAY_INSERT_CONTEXT"
  ]);

  if (!supportedMessages.has(message?.type)) return false;

  (async () => {
    try {
      const {
        ProviderRegistry,
        ContextEngine,
        ExportEngine,
        collectCaptureMetadata
      } = await loadRuntime();

      const registry = new ProviderRegistry();

      if (message.type === "AI_RELAY_INSERT_CONTEXT") {
        const result = registry.insertContext(
          window.location.href,
          message.context,
          document
        );

        sendResponse({ ok: true, insertion: result });
        return;
      }

      const conversation = registry.readConversation(
        window.location.href,
        document
      );

      if (!conversation.messages.length) {
        throw new Error(
          "No visible conversation messages were found on this page."
        );
      }

      const capturedAt = new Date().toISOString();
      const metadata = collectCaptureMetadata({
        conversation,
        root: document,
        url: window.location.href,
        capturedAt
      });
      const providerLimits = registry.supports(
        window.location.href,
        "readLimits"
      )
        ? registry.readLimits(window.location.href, document)
        : [];

      const enrichedConversation = {
        ...conversation,
        providerVersion: metadata.providerVersion,
        conversationId: metadata.conversationId,
        capturedAt,
        model: metadata.model,
        metadata
      };

      const contextEngine = new ContextEngine({
        recentMessageLimit: 12
      });

      const snapshot = contextEngine.createSnapshot({
        projectId: createProjectId(conversation),
        provider: conversation.provider,
        messages: conversation.messages,
        capturedAt
      });

      const handoff = contextEngine.createHandoff(snapshot);

      const exportEngine = new ExportEngine();
      const exported = await exportEngine.create({
        conversation: enrichedConversation,
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
          model: metadata.model,
          conversationId: metadata.conversationId,
          metadata: {
            ...metadata,
            providerLimits
          },
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
