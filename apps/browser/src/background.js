import { continueInProvider } from "./continue-in-provider.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AI_RELAY_CONTINUE_IN_PROVIDER") {
    return false;
  }

  (async () => {
    try {
      const result = await continueInProvider({
        targetProvider: message.targetProvider,
        handoffMarkdown: message.handoffMarkdown
      });

      sendResponse({
        ok: true,
        ...result
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
