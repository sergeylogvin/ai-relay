import { continueInProvider } from "./continue-in-provider.js";
import { DESKTOP_NATIVE_HOST } from "./desktop-handoff.js";

async function dispatchNativeHandoff(type, payload) {
  const response = await chrome.runtime.sendNativeMessage(
    DESKTOP_NATIVE_HOST,
    {
      type,
      markdown: payload.markdown,
      metadata: payload.metadata ?? {}
    }
  );

  if (!response?.ok) {
    throw new Error(response?.error ?? "Desktop handoff bridge failed.");
  }

  return response;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AI_RELAY_CONTINUE_IN_PROVIDER") {
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
  }

  if (message?.type === "AI_RELAY_STORE_HANDOFF") {
    (async () => {
      try {
        const response = await dispatchNativeHandoff("STORE_HANDOFF", message);

        sendResponse({
          ok: true,
          ...response
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })();

    return true;
  }

  if (message?.type === "AI_RELAY_COPY_FOR_DESKTOP") {
    (async () => {
      try {
        const response = await dispatchNativeHandoff("COPY_HANDOFF", message);

        sendResponse({
          ok: true,
          ...response
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })();

    return true;
  }

  return false;
});
