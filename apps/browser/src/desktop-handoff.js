export const DESKTOP_NATIVE_HOST = "com.ai_relay.native_host";

export async function copyHandoffForDesktop(markdown) {
  const normalized = String(markdown ?? "").trim();

  if (!normalized) {
    throw new Error("No handoff Markdown is available to copy.");
  }

  try {
    const response = await chrome.runtime.sendNativeMessage(
      DESKTOP_NATIVE_HOST,
      {
        type: "COPY_HANDOFF",
        markdown: normalized
      }
    );

    if (!response?.ok) {
      throw new Error(response?.error ?? "Desktop copy failed.");
    }

    return {
      ...response,
      fallback: null
    };
  } catch {
    await navigator.clipboard.writeText(normalized);

    return {
      ok: true,
      characters: normalized.length,
      fallback: "clipboard"
    };
  }
}
