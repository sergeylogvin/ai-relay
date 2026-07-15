export async function runGeminiUsageFetchInMainWorld() {
  const initUrl = location.href.split("#")[0];
  const sourcePath = location.pathname.includes("/app") ? location.pathname : "/app";
  const userAgent = navigator.userAgent;

  const html = await fetch(initUrl, {
    credentials: "include",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      Referer: `${location.origin}/`
    }
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Gemini init failed (${response.status}).`);
    }

    return response.text();
  });

  const accessToken = /"SNlM0e":\s*"(.*?)"/.exec(html)?.[1] ?? "";
  const buildLabel = /"cfb2h":\s*"(.*?)"/.exec(html)?.[1] ?? "";
  const sessionId = /"FdrFJe":\s*"(.*?)"/.exec(html)?.[1] ?? "";

  if (!accessToken && !buildLabel) {
    throw new Error("Could not extract Gemini session tokens.");
  }

  let reqId = 10000 + Math.floor(Date.now() % 90000);

  async function batchExecute(rpcId, payload) {
    reqId += 100000;

    const params = new URLSearchParams({
      rpcids: rpcId,
      _reqid: String(reqId),
      rt: "c",
      "source-path": sourcePath
    });

    if (buildLabel) {
      params.set("bl", buildLabel);
    }

    if (sessionId) {
      params.set("f.sid", sessionId);
    }

    const payloadQuoted = JSON.stringify(payload);
    const form = new URLSearchParams();
    form.set(
      "f.req",
      `[[["${rpcId}",${payloadQuoted},null,"generic"]]]`
    );

    if (accessToken) {
      form.set("at", accessToken);
    }

    const response = await fetch(`/_/BardChatUi/data/batchexecute?${params.toString()}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Origin: location.origin,
        Referer: `${location.origin}/`,
        "User-Agent": userAgent,
        "X-Same-Domain": "1"
      },
      body: form.toString()
    });

    if (!response.ok) {
      throw new Error(`Gemini batchexecute failed (${response.status}).`);
    }

    return response.text();
  }

  function getNestedValue(data, path) {
    let current = data;

    for (const index of path) {
      if (!Array.isArray(current) || index < 0 || index >= current.length) {
        return null;
      }

      current = current[index];
    }

    return current;
  }

  function parseFrames(text) {
    let content = String(text ?? "");

    if (content.startsWith(")]}'")) {
      content = content.slice(4).trimStart();
    }

    const frames = [];
    let pos = 0;

    while (pos < content.length) {
      while (pos < content.length && /\s/.test(content[pos])) {
        pos += 1;
      }

      const match = content.slice(pos).match(/^(\d+)\n/s);

      if (!match) {
        break;
      }

      const length = Number(match[1]);
      pos += match[0].length;
      const chunk = content.slice(pos, pos + length).trim();
      pos += length;

      if (!chunk) {
        continue;
      }

      try {
        frames.push(JSON.parse(chunk));
      } catch {
        frames.push(chunk);
      }
    }

    return frames;
  }

  function parseChatList(text) {
    const chats = [];

    for (const part of parseFrames(text)) {
      if (!Array.isArray(part)) {
        continue;
      }

      const bodyStr = getNestedValue(part, [2]);

      if (typeof bodyStr !== "string" || bodyStr.length < 10) {
        continue;
      }

      const body = JSON.parse(bodyStr);
      const chatList = getNestedValue(body, [2]);

      if (!Array.isArray(chatList)) {
        continue;
      }

      for (const item of chatList) {
        if (!Array.isArray(item) || item.length < 6) {
          continue;
        }

        chats.push({
          cid: item[0],
          timestamp: Array.isArray(item[5]) ? Number(item[5][0]) : 0
        });
      }

      if (chats.length > 0) {
        break;
      }
    }

    return chats;
  }

  const proOnly = new Set([
    "9d8ca3786ebdfbea",
    "d1f674dda82d1455",
    "e5a44cb1dae2b489",
    "4d79521e1e77dd3b",
    "b1e46a6037e6aa9f",
    "0e0f3a3749fc6a5c",
    "6cb69cd4b6cae77d",
    "e6fa609c3fa255c0",
    "852fc722e6249d28"
  ]);

  function classifyTurn(turn) {
    const userSection = getNestedValue(turn, [2]);
    const modelId = Array.isArray(userSection) ? userSection[4] : "";
    const thoughts = getNestedValue(turn, [3, 0, 0, 37, 0, 0]);

    if (typeof modelId === "string" && proOnly.has(modelId)) {
      return "pro";
    }

    if (typeof thoughts === "string" && thoughts.length > 0) {
      return "thinking";
    }

    return "flash";
  }

  function parseTurnCounts(text, sinceUnixSeconds) {
    const counts = { pro: 0, thinking: 0, flash: 0 };

    for (const part of parseFrames(text)) {
      if (!Array.isArray(part)) {
        continue;
      }

      const bodyStr = getNestedValue(part, [2]);

      if (typeof bodyStr !== "string" || bodyStr.length < 10) {
        continue;
      }

      const body = JSON.parse(bodyStr);
      const turns = getNestedValue(body, [0]);

      if (!Array.isArray(turns)) {
        continue;
      }

      for (const turn of turns) {
        const tsArr = getNestedValue(turn, [4]);
        const timestamp = Array.isArray(tsArr) ? Number(tsArr[0]) : 0;

        if (timestamp > 0 && timestamp < sinceUnixSeconds) {
          continue;
        }

        counts[classifyTurn(turn)] += 1;
      }

      break;
    }

    return counts;
  }

  function getStartOfPacificDay(now = new Date()) {
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);

    const read = (type) =>
      Number(dateParts.find((part) => part.type === type)?.value ?? "0");
    const year = read("year");
    const month = read("month");
    const day = read("day");

    for (let utcHour = 0; utcHour <= 23; utcHour += 1) {
      const probe = new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0, 0));
      const laParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }).formatToParts(probe);

      const laYear = Number(laParts.find((part) => part.type === "year")?.value);
      const laMonth = Number(laParts.find((part) => part.type === "month")?.value);
      const laDay = Number(laParts.find((part) => part.type === "day")?.value);
      const laHour = Number(laParts.find((part) => part.type === "hour")?.value);

      if (laYear === year && laMonth === month && laDay === day && laHour === 0) {
        return probe;
      }
    }

    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const sinceUnixSeconds = Math.floor(getStartOfPacificDay().getTime() / 1000);
  const listRaw = await batchExecute("MaZiqc", `[100]`);
  const chats = parseChatList(listRaw);
  const totals = { pro: 0, thinking: 0, flash: 0 };
  let scanned = 0;

  for (const chat of chats) {
    if (chat.timestamp < sinceUnixSeconds) {
      continue;
    }

    if (scanned >= 20) {
      break;
    }

    scanned += 1;

    const payload = JSON.stringify([chat.cid, 100, null, 1, [0], [4], null, 1]);
    const readRaw = await batchExecute("hNvQHb", payload);
    const counts = parseTurnCounts(readRaw, sinceUnixSeconds);
    totals.pro += counts.pro;
    totals.thinking += counts.thinking;
    totals.flash += counts.flash;
  }

  return totals;
}
