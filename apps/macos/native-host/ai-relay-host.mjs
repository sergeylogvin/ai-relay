#!/usr/bin/env node

import {
  resolveHandoffInboxPath
} from "../shared/handoff-inbox.mjs";
import { persistHandoffWithOptionalPasteRequest } from "../shared/handoff-persistence.mjs";

const HOST_NAME = "com.ai_relay.native_host";

function readExactBytes(source, length) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    function onReadable() {
      while (total < length) {
        const chunk = source.read(length - total);
        if (!chunk) return;

        chunks.push(chunk);
        total += chunk.length;
      }

      source.removeListener("readable", onReadable);
      source.removeListener("error", reject);
      resolve(Buffer.concat(chunks, length));
    }

    source.on("readable", onReadable);
    source.on("error", reject);
    onReadable();
  });
}

async function readMessage(source) {
  const header = await readExactBytes(source, 4);
  const length = header.readUInt32LE(0);
  const body = await readExactBytes(source, length);

  return JSON.parse(body.toString("utf8"));
}

function writeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);

  header.writeUInt32LE(body.length, 0);
  process.stdout.write(header);
  process.stdout.write(body);
}

async function copyToClipboard(text) {
  const { spawn } = await import("node:child_process");

  return new Promise((resolve, reject) => {
    const child = spawn("pbcopy", [], {
      stdio: ["pipe", "ignore", "pipe"]
    });

    child.stdin.write(text);
    child.stdin.end();

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pbcopy exited with code ${code}.`));
    });
  });
}

async function persistHandoff(message) {
  const markdown = String(message.markdown ?? "").trim();

  if (!markdown) {
    throw new TypeError("Handoff markdown is required.");
  }

  const record = await persistHandoffWithOptionalPasteRequest(
    {
      markdown,
      metadata: message.metadata ?? {}
    },
    resolveHandoffInboxPath()
  );

  return record;
}

async function handleMessage(message) {
  const type = message?.type;

  if (type !== "COPY_HANDOFF" && type !== "STORE_HANDOFF") {
    return {
      ok: false,
      error: `Unsupported message type: ${type ?? "unknown"}`
    };
  }

  try {
    const record = await persistHandoff(message);

    if (type === "COPY_HANDOFF") {
      await copyToClipboard(record.markdown);
    }

    return {
      ok: true,
      host: HOST_NAME,
      characters: record.characters,
      storedAt: record.storedAt,
      title: record.title
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  while (true) {
    const message = await readMessage(process.stdin);
    const response = await handleMessage(message);

    writeMessage(response);
  }
}

main().catch((error) => {
  writeMessage({
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
