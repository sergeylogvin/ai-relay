import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("library page creates organization controls", async () => {
  const source = await readFile(
    resolve(root, "apps/browser/src/library-page.js"),
    "utf8"
  );

  assert.match(source, /tagFilter/);
  assert.match(source, /pinnedOnlyFilter/);
  assert.match(source, /recordTagsInput/);
  assert.match(source, /recordPinnedInput/);
  assert.match(source, /saveOrganizationButton/);
  assert.match(source, /filterLibraryRecords/);
  assert.match(source, /updateRecordOrganization/);
});
