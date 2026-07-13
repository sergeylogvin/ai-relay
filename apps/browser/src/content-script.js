function formatRawHandoff(conversation) {
  const lines = [
    "# AI Relay Capture",
    "",
    `Provider: ${conversation.provider}`,
    `Title: ${conversation.title || "Untitled conversation"}`,
    "",
    "## Conversation",
    ""
  ];

  for (const message of conversation.messages) {
    lines.push(
      `### ${message.role.toUpperCase()}`,
      "",
      message.content,
      ""
    );
  }

  lines.push(
    "## Continuation instruction",
    "",
    "Continue from this conversation. Preserve prior decisions and constraints. Ask before assuming missing facts."
  );

  return lines.join("\n").trim();
}

async function loadRegistry() {
  const moduleUrl = chrome.runtime.getURL("providers/registry.js");
  const { ProviderRegistry } = await import(moduleUrl);

  return new ProviderRegistry();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AI_RELAY_CAPTURE") return false;

  (async () => {
    try {
      const registry = await loadRegistry();
      const conversation = registry.readConversation(
        window.location.href,
        document
      );

      sendResponse({
        ok: true,
        capture: {
          schemaVersion: 1,
          provider: conversation.provider,
          title: conversation.title,
          url: conversation.url,
          capturedAt: new Date().toISOString(),
          messages: conversation.messages,
          markdown: formatRawHandoff(conversation)
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
