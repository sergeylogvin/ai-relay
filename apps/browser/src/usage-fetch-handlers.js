export async function handleUsageFetchMessage(type) {
  if (type === "AI_RELAY_FETCH_CHATGPT_USAGE") {
    const { fetchChatGPTUsageInPageContext } = await import(
      chrome.runtime.getURL("core/chatgpt-usage.js")
    );

    return {
      ok: true,
      usage: await fetchChatGPTUsageInPageContext()
    };
  }

  if (type === "AI_RELAY_FETCH_GEMINI_USAGE") {
    const { fetchGeminiUsageInPageContext } = await import(
      chrome.runtime.getURL("core/gemini-usage.js")
    );

    return {
      ok: true,
      usage: await fetchGeminiUsageInPageContext({
        initUrl: window.location.href
      })
    };
  }

  if (type === "AI_RELAY_GEMINI_EXTRACT_TOKENS") {
    const { extractGeminiSessionTokens } = await import(
      chrome.runtime.getURL("core/gemini-usage.js")
    );

    const initUrl = window.location.href.split("#")[0];
    let html = document.documentElement?.innerHTML ?? "";
    let tokens = extractGeminiSessionTokens(html);

    if (!tokens.accessToken) {
      for (const url of [initUrl, "https://gemini.google.com/app"]) {
        try {
          const response = await fetch(url, { credentials: "include" });

          if (response.ok) {
            tokens = extractGeminiSessionTokens(await response.text());

            if (tokens.accessToken) {
              break;
            }
          }
        } catch {
          // Try the next init URL.
        }
      }
    }

    return {
      ok: true,
      tokens,
      sourcePath: "/app",
      pageUrl: window.location.href,
      language:
        tokens.language ||
        document.documentElement.lang?.split("-")[0] ||
        "en"
    };
  }

  throw new Error(`Unsupported usage fetch: ${type}`);
}
