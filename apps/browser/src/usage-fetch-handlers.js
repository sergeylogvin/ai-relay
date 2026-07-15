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

  throw new Error(`Unsupported usage fetch: ${type}`);
}
