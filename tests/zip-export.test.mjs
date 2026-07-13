import test from "node:test";
import assert from "node:assert/strict";

import { createZipArchive } from "../packages/export/src/zip.js";

function findAscii(bytes, value) {
  const encoded = new TextEncoder().encode(value);

  outer:
  for (let index = 0; index <= bytes.length - encoded.length; index += 1) {
    for (let offset = 0; offset < encoded.length; offset += 1) {
      if (bytes[index + offset] !== encoded[offset]) {
        continue outer;
      }
    }

    return index;
  }

  return -1;
}

test("createZipArchive creates a valid ZIP signature", () => {
  const archive = createZipArchive({
    "handoff.md": "# Handoff\n",
    "capture.json": "{}\n"
  });

  assert.equal(archive[0], 0x50);
  assert.equal(archive[1], 0x4b);
  assert.equal(archive[2], 0x03);
  assert.equal(archive[3], 0x04);
});

test("createZipArchive includes every filename", () => {
  const archive = createZipArchive({
    "capture.json": "{}\n",
    "handoff.md": "# Handoff\n",
    "metadata.json": "{}\n"
  });

  assert.notEqual(findAscii(archive, "capture.json"), -1);
  assert.notEqual(findAscii(archive, "handoff.md"), -1);
  assert.notEqual(findAscii(archive, "metadata.json"), -1);
});

test("createZipArchive is deterministic", () => {
  const left = createZipArchive({
    "z.txt": "last",
    "a.txt": "first"
  });

  const right = createZipArchive({
    "a.txt": "first",
    "z.txt": "last"
  });

  assert.deepEqual(left, right);
});

test("createZipArchive rejects empty archives", () => {
  assert.throws(
    () => createZipArchive({}),
    /At least one ZIP entry is required/
  );
});
