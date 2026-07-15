import { normalizeProviderUsage, normalizeUsageBucket } from "./usage-snapshot.js";

const GEMINI_ORIGIN = "https://gemini.google.com";
const GOOGLE_ORIGIN = "https://www.google.com";
const BATCH_EXECUTE_URL = `${GEMINI_ORIGIN}/_/BardChatUi/data/batchexecute`;
const INIT_URL = `${GEMINI_ORIGIN}/app`;

const RPC_LIST_CHATS = "MaZiqc";
const RPC_READ_CHAT = "hNvQHb";

const PRO_ONLY_VARIANTS = new Set([
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

const DEFAULT_PRO_LIMIT = 100;
const DEFAULT_THINKING_LIMIT = 300;

const SNlM0e_RE = /"SNlM0e":\s*"(.*?)"/;
const CFB2H_RE = /"cfb2h":\s*"(.*?)"/;
const FDRFJE_RE = /"FdrFJe":\s*"(.*?)"/;
const LENGTH_MARKER_RE = /^(\d+)\n/s;

export function classifyGeminiTurn(modelId, hasThoughts) {
  if (PRO_ONLY_VARIANTS.has(modelId)) {
    return "pro";
  }

  if (hasThoughts) {
    return "thinking";
  }

  return "flash";
}

export function getStartOfPacificDay(now = new Date()) {
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

export function getNextPacificMidnightIso(now = new Date()) {
  const start = getStartOfPacificDay(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export function parseGeminiUsageCounts(
  counts,
  {
    proLimit = DEFAULT_PRO_LIMIT,
    thinkingLimit = DEFAULT_THINKING_LIMIT,
    now = new Date()
  } = {}
) {
  const proUsed = Number(counts?.pro ?? 0);
  const thinkingUsed = Number(counts?.thinking ?? 0);
  const resetsAt = getNextPacificMidnightIso(now);

  return normalizeProviderUsage({
    provider: "gemini",
    status: "ok",
    buckets: [
      normalizeUsageBucket({
        id: "pro",
        label: `Pro (${proLimit}/day)`,
        utilization: (proUsed / proLimit) * 100,
        resetsAt
      }),
      normalizeUsageBucket({
        id: "thinking",
        label: `Thinking (${thinkingLimit}/day)`,
        utilization: (thinkingUsed / thinkingLimit) * 100,
        resetsAt
      })
    ]
  });
}

export function extractGeminiSessionTokens(html) {
  return {
    accessToken: SNlM0e_RE.exec(html)?.[1] ?? "",
    buildLabel: CFB2H_RE.exec(html)?.[1] ?? "",
    sessionId: FDRFJE_RE.exec(html)?.[1] ?? ""
  };
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

function getNestedString(data, path) {
  const value = getNestedValue(data, path);
  return typeof value === "string" ? value : "";
}

export function extractJsonFromBatchExecuteResponse(text) {
  let content = String(text ?? "");

  if (content.startsWith(")]}'")) {
    content = content.slice(4).trimStart();
  }

  const frames = parseByFrame(content);

  if (frames.length > 0) {
    return frames;
  }

  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }

  const collected = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    try {
      collected.push(JSON.parse(trimmed));
    } catch {
      // ignore malformed lines
    }
  }

  return collected;
}

function parseByFrame(content) {
  const frames = [];
  let pos = 0;

  while (pos < content.length) {
    while (pos < content.length && /\s/.test(content[pos])) {
      pos += 1;
    }

    if (pos >= content.length) {
      break;
    }

    const remaining = content.slice(pos);
    const match = LENGTH_MARKER_RE.exec(remaining);

    if (!match) {
      break;
    }

    const length = Number(match[1]);

    if (!Number.isFinite(length)) {
      break;
    }

    pos += match[0].length;
    const chunk = content.slice(pos, pos + length).trim();
    pos += length;

    if (!chunk) {
      continue;
    }

    try {
      const parsed = JSON.parse(chunk);

      frames.push(parsed);
    } catch {
      frames.push(chunk);
    }
  }

  return frames;
}

export function parseGeminiChatListResponse(text) {
  const parts = extractJsonFromBatchExecuteResponse(text);
  const chats = [];

  for (const part of parts) {
    let parsed = part;

    if (typeof part === "string") {
      if (!part.startsWith("[")) {
        continue;
      }

      try {
        parsed = JSON.parse(part);
      } catch {
        continue;
      }
    }

    if (!Array.isArray(parsed)) {
      continue;
    }

    const bodyStr = getNestedValue(parsed, [2]);

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

      const cid = typeof item[0] === "string" ? item[0] : null;
      const title = typeof item[1] === "string" ? item[1] : "";
      const timestamp = Array.isArray(item[5]) ? Number(item[5][0]) : 0;

      if (cid) {
        chats.push({ cid, title, timestamp });
      }
    }

    if (chats.length > 0) {
      break;
    }
  }

  return chats;
}

function turnTimestamp(turn) {
  const tsArr = getNestedValue(turn, [4]);

  if (!Array.isArray(tsArr) || tsArr.length === 0) {
    return 0;
  }

  return Number(tsArr[0]) || 0;
}

export function classifyGeminiTurnFromRaw(turn) {
  const modelId = getNestedString(turn, [2, 4]);
  const hasThoughts = getNestedString(turn, [3, 0, 0, 37, 0, 0]) !== "";
  return classifyGeminiTurn(modelId, hasThoughts);
}

export function parseGeminiTurnCountsFromChatResponse(text, sinceUnixSeconds = 0) {
  const counts = { pro: 0, thinking: 0, flash: 0 };
  const parts = extractJsonFromBatchExecuteResponse(text);

  for (const part of parts) {
    let parsed = part;

    if (typeof part === "string") {
      if (!part.startsWith("[")) {
        continue;
      }

      try {
        parsed = JSON.parse(part);
      } catch {
        continue;
      }
    }

    if (!Array.isArray(parsed)) {
      continue;
    }

    const bodyStr = getNestedValue(parsed, [2]);

    if (typeof bodyStr !== "string" || bodyStr.length < 10) {
      continue;
    }

    const body = JSON.parse(bodyStr);
    const turns = getNestedValue(body, [0]);

    if (!Array.isArray(turns)) {
      continue;
    }

    for (const turn of turns) {
      if (!Array.isArray(turn)) {
        continue;
      }

      const timestamp = turnTimestamp(turn);

      if (timestamp > 0 && timestamp < sinceUnixSeconds) {
        continue;
      }

      const bucket = classifyGeminiTurnFromRaw(turn);
      counts[bucket] += 1;
    }

    break;
  }

  return counts;
}

function looksLikeAuthFailure(text) {
  if (!text) {
    return true;
  }

  if (text[0] === ")" || (text[0] >= "0" && text[0] <= "9") || text[0] === "[") {
    return false;
  }

  return text.includes("accounts.google.com") || text.includes("<html");
}

function buildBatchExecuteBody(rpcId, payload) {
  const payloadQuoted = JSON.stringify(payload);
  const serialized = `[[["${rpcId}",${payloadQuoted},null,"generic"]]]`;
  const params = new URLSearchParams();
  params.set("f.req", serialized);
  return params.toString();
}

function buildAuthFetchOptions(cookieHeader, headers = {}) {
  if (cookieHeader) {
    return {
      headers: {
        ...headers,
        Cookie: cookieHeader
      }
    };
  }

  return {
    headers,
    credentials: "include"
  };
}

export async function fetchGeminiUsageInPageContext(options = {}) {
  return fetchGeminiUsageCore({
    ...options,
    cookieHeader: null
  });
}

async function fetchGeminiUsageCore({
  cookieHeader = null,
  fetchImpl = fetch,
  now = new Date(),
  proLimit = DEFAULT_PRO_LIMIT,
  thinkingLimit = DEFAULT_THINKING_LIMIT,
  chatLimit = 200
} = {}) {
  try {
    const session = await initGeminiSession(cookieHeader, fetchImpl);
    const sinceUnixSeconds = Math.floor(getStartOfPacificDay(now).getTime() / 1000);
    const chats = await listGeminiChats(session, fetchImpl, chatLimit);

    if (looksLikeAuthFailure(chats.raw)) {
      return normalizeProviderUsage({
        provider: "gemini",
        status: "error",
        error: "Gemini session expired. Open gemini.google.com and sign in again.",
        buckets: []
      });
    }

    const totals = { pro: 0, thinking: 0, flash: 0 };

    for (const chat of chats.items) {
      if (chat.timestamp < sinceUnixSeconds) {
        continue;
      }

      const counts = await countGeminiTurnsInChat(
        session,
        chat.cid,
        sinceUnixSeconds,
        fetchImpl
      );
      totals.pro += counts.pro;
      totals.thinking += counts.thinking;
      totals.flash += counts.flash;
    }

    return parseGeminiUsageCounts(totals, { proLimit, thinkingLimit, now });
  } catch (error) {
    return normalizeProviderUsage({
      provider: "gemini",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      buckets: []
    });
  }
}

export async function fetchGeminiUsageFromSession({
  cookieHeader,
  fetchImpl = fetch,
  now = new Date(),
  proLimit = DEFAULT_PRO_LIMIT,
  thinkingLimit = DEFAULT_THINKING_LIMIT,
  chatLimit = 200
} = {}) {
  if (!cookieHeader) {
    return normalizeProviderUsage({
      provider: "gemini",
      status: "error",
      error: "Sign in to gemini.google.com in this browser profile.",
      buckets: []
    });
  }

  return fetchGeminiUsageCore({
    cookieHeader,
    fetchImpl,
    now,
    proLimit,
    thinkingLimit,
    chatLimit
  });
}

async function initGeminiSession(cookieHeader, fetchImpl) {
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

  await fetchImpl(
    GOOGLE_ORIGIN,
    {
      method: "GET",
      ...buildAuthFetchOptions(cookieHeader, {
        "User-Agent": userAgent
      })
    }
  );

  const response = await fetchImpl(
    INIT_URL,
    {
      method: "GET",
      ...buildAuthFetchOptions(cookieHeader, {
        "User-Agent": userAgent,
        Referer: `${GEMINI_ORIGIN}/`
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini init failed (${response.status}).`);
  }

  const html = await response.text();
  const tokens = extractGeminiSessionTokens(html);

  if (!tokens.accessToken && !tokens.buildLabel) {
    throw new Error("Could not extract Gemini session tokens.");
  }

  return {
    ...tokens,
    cookieHeader,
    reqId: 10000 + Math.floor(Date.now() % 90000)
  };
}

async function batchExecute(session, rpcId, payload, fetchImpl) {
  const reqId = session.reqId;
  session.reqId += 100000;

  const params = new URLSearchParams({
    rpcids: rpcId,
    _reqid: String(reqId),
    rt: "c",
    "source-path": "/app"
  });

  if (session.buildLabel) {
    params.set("bl", session.buildLabel);
  }

  if (session.sessionId) {
    params.set("f.sid", session.sessionId);
  }

  const body = buildBatchExecuteBody(rpcId, payload);
  const form = new URLSearchParams(body);

  if (session.accessToken) {
    form.set("at", session.accessToken);
  }

  const response = await fetchImpl(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    ...buildAuthFetchOptions(session.cookieHeader, {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: GEMINI_ORIGIN,
      Referer: `${GEMINI_ORIGIN}/`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      "X-Same-Domain": "1"
    }),
    body: form.toString()
  });

  if (!response.ok) {
    throw new Error(`Gemini batchexecute failed (${response.status}).`);
  }

  return response.text();
}

async function listGeminiChats(session, fetchImpl, limit) {
  const raw = await batchExecute(session, RPC_LIST_CHATS, `[${limit}]`, fetchImpl);
  return {
    raw,
    items: parseGeminiChatListResponse(raw)
  };
}

async function countGeminiTurnsInChat(session, cid, sinceUnixSeconds, fetchImpl) {
  const payload = JSON.stringify([cid, 100, null, 1, [0], [4], null, 1]);
  const raw = await batchExecute(session, RPC_READ_CHAT, payload, fetchImpl);
  return parseGeminiTurnCountsFromChatResponse(raw, sinceUnixSeconds);
}
