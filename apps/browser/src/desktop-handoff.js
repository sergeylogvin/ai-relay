export const DESKTOP_NATIVE_HOST = "com.ai_relay.native_host";
export const DESKTOP_INBOX_STORE_URL = "http://127.0.0.1:17831/handoff";

function buildDesktopMessage(markdown, metadata = {}) {
  return {
    markdown: String(markdown ?? "").trim(),
    metadata: {
      provider: metadata.provider ?? null,
      title: metadata.title ?? null,
      url: metadata.url ?? null,
      handoffMode: metadata.handoffMode ?? null,
      targetApp: metadata.targetApp ?? null,
      pasteRequested: metadata.pasteRequested === true
    }
  };
}

async function storeHandoffViaHttp(markdown, metadata = {}) {
  const payload = buildDesktopMessage(markdown, metadata);

  const response = await fetch(DESKTOP_INBOX_STORE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? `Desktop inbox HTTP sync failed (${response.status}).`);
  }

  return body;
}

async function sendDesktopHandoffMessage(type, markdown, metadata = {}) {
  const payload = buildDesktopMessage(markdown, metadata);

  if (!payload.markdown) {
    throw new Error("No handoff Markdown is available.");
  }

  const response = await chrome.runtime.sendMessage({
    type,
    ...payload
  });

  if (!response) {
    throw new Error("Desktop handoff bridge did not respond.");
  }

  return response;
}

export async function storeHandoffForDesktop(markdown, metadata = {}) {
  const payload = buildDesktopMessage(markdown, metadata);

  if (!payload.markdown) {
    return { ok: false, skipped: true };
  }

  try {
    const response = await storeHandoffViaHttp(markdown, metadata);

    return {
      ...response,
      fallback: null
    };
  } catch (httpError) {
    try {
      const response = await sendDesktopHandoffMessage(
        "AI_RELAY_STORE_HANDOFF",
        markdown,
        metadata
      );

      if (!response?.ok) {
        return {
          ok: false,
          fallback: "desktop-bridge-unavailable",
          error: response?.error ?? "Desktop sync failed."
        };
      }

      return {
        ...response,
        fallback: "native-host"
      };
    } catch (nativeError) {
      return {
        ok: false,
        fallback: "desktop-bridge-unavailable",
        error:
          nativeError instanceof Error
            ? nativeError.message
            : httpError instanceof Error
              ? httpError.message
              : String(nativeError)
      };
    }
  }
}

export async function copyHandoffForDesktop(markdown, metadata = {}) {
  const payload = buildDesktopMessage(markdown, metadata);

  if (!payload.markdown) {
    throw new Error("No handoff Markdown is available to copy.");
  }

  try {
    const response = await sendDesktopHandoffMessage(
      "AI_RELAY_COPY_FOR_DESKTOP",
      markdown,
      metadata
    );

    if (!response?.ok) {
      throw new Error(response?.error ?? "Desktop copy failed.");
    }

    return {
      ...response,
      fallback: null
    };
  } catch {
    try {
      const response = await storeHandoffViaHttp(markdown, metadata);

      await navigator.clipboard.writeText(payload.markdown);

      return {
        ...response,
        characters: payload.markdown.length,
        fallback: "clipboard"
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
}
