#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hostPath = resolve(
  fileURLToPath(new URL("../native-host/ai-relay-host.mjs", import.meta.url))
);

function writeMessage(child, message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);

  header.writeUInt32LE(body.length, 0);
  child.stdin.write(header);
  child.stdin.write(body);
}

function readMessage(child) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];

    function onData(chunk) {
      chunks.push(chunk);

      const buffer = Buffer.concat(chunks);

      if (buffer.length < 4) {
        return;
      }

      const length = buffer.readUInt32LE(0);

      if (buffer.length < 4 + length) {
        return;
      }

      child.stdout.removeListener("data", onData);
      resolvePromise(JSON.parse(buffer.subarray(4, 4 + length).toString("utf8")));
    }

    child.stdout.on("data", onData);
    child.on("error", reject);
  });
}

const child = spawn(hostPath, [], {
  stdio: ["pipe", "pipe", "pipe"]
});

writeMessage(child, {
  type: "STORE_HANDOFF",
  markdown: "# AI Relay Handoff\n\nTest inbox sync.",
  metadata: {
    provider: "claude",
    title: "Test handoff",
    handoffMode: "context-pack"
  }
});

const response = await readMessage(child);
console.log(JSON.stringify(response, null, 2));
child.kill();
