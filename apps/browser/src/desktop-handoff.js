export const DESKTOP_NATIVE_HOST = "com.ai_relay.native_host";

function buildDesktopMessage(markdown, metadata = {}) {
  return {
    markdown: String(markdown ?? "").trim(),
    metadata: {
      provider: metadata.provider ?? null,
      title: metadata.title ?? null,
      url: metadata.url ?? null,
      handoffMode: metadata.handoffMode ?? null
    }
  };
}

export async function storeHandoffForDesktop(markdown, metadata = {}) {
  const payload = buildDesktopMessage(markdown, metadata);

  if (!payload.markdown) {
    return { ok: false, skipped: true };
  }

  try {
    const response = await chrome.runtime.sendNativeMessage(
      DESKTOP_NATIVE_HOST,
      {
        type: "STORE_HANDOFF",
        ...payload
      }
    );

    return {
      ...response,
      fallback: null
    };
  } catch {
    return {
      ok: false,
      fallback: "native-host-unavailable"
    };
  }
}

export async function copyHandoffForDesktop(markdown, metadata = {}) {
  const payload = buildDesktopMessage(markdown, metadata);

  if (!payload.markdown) {
    throw new Error("No handoff Markdown is available to copy.");
  }

  try {
    const response = await chrome.runtime.sendNativeMessage(
      DESKTOP_NATIVE_HOST,
      {
        type: "COPY_HANDOFF",
        ...payload
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
    await navigator.clipboard.writeText(payload.markdown);

    return {
      ok: true,
      characters: payload.markdown.length,
      fallback: "clipboard"
    };
  }
}
