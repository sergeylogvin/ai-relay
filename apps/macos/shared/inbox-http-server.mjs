#!/usr/bin/env node

import http from "node:http";
import {
  HANDOFF_INBOX_HTTP_PORT,
  HANDOFF_INBOX_HTTP_STORE_PATH
} from "./inbox-bridge-config.mjs";
import {
  resolveHandoffInboxPath,
  writeHandoffInbox
} from "./handoff-inbox.mjs";

function sendJson(response, statusCode, payload) {
  const body = `${JSON.stringify(payload)}\n`;

  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    throw new TypeError("Request body is required.");
  }

  return JSON.parse(raw);
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, service: "ai-relay-inbox" });
    return;
  }

  if (request.method === "POST" && request.url === HANDOFF_INBOX_HTTP_STORE_PATH) {
    try {
      const body = await readJsonBody(request);
      const record = await writeHandoffInbox(
        {
          markdown: body.markdown,
          metadata: body.metadata ?? {}
        },
        resolveHandoffInboxPath()
      );

      sendJson(response, 200, {
        ok: true,
        title: record.title,
        characters: record.characters,
        storedAt: record.storedAt
      });
      return;
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }
  }

  sendJson(response, 404, {
    ok: false,
    error: "Not found."
  });
});

const port = Number(
  process.env.AI_RELAY_INBOX_HTTP_PORT ?? HANDOFF_INBOX_HTTP_PORT
);

server.listen(port, "127.0.0.1", () => {
  console.error(
    `AI Relay inbox bridge listening on http://127.0.0.1:${port}`
  );
});
