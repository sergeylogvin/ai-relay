import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("popup exposes Cursor and desktop copy actions", async () => {
  const html = await readFile(
    resolve(root, "apps/browser/src/popup.html"),
    "utf8"
  );
  const popup = await readFile(
    resolve(root, "apps/browser/src/popup.js"),
    "utf8"
  );
  const manifest = await readFile(
    resolve(root, "apps/browser/src/manifest.json"),
    "utf8"
  );

  assert.match(html, /id="copyForCursorButton"/);
  assert.match(html, /id="copyForDesktopButton"/);
  assert.match(html, /Continue in desktop apps/);
  assert.match(popup, /renderCursorContextPack/);
  assert.match(popup, /copyHandoffForDesktop/);
  assert.match(popup, /storeHandoffForDesktop/);
  assert.match(popup, /syncDesktopHandoff/);
  assert.match(popup, /Cursor context pack copied/);
  assert.match(manifest, /nativeMessaging/);
});

test("background can route desktop copy requests to the native host", async () => {
  const background = await readFile(
    resolve(root, "apps/browser/src/background.js"),
    "utf8"
  );

  assert.match(background, /AI_RELAY_COPY_FOR_DESKTOP/);
  assert.match(background, /sendNativeMessage/);
});

test("macOS native host install script and host entrypoint exist", async () => {
  const readme = await readFile(
    resolve(root, "apps/macos/README.md"),
    "utf8"
  );
  const host = await readFile(
    resolve(root, "apps/macos/native-host/ai-relay-host.mjs"),
    "utf8"
  );
  const inbox = await readFile(
    resolve(root, "apps/macos/shared/handoff-inbox.mjs"),
    "utf8"
  );

  assert.match(readme, /install-native-host/);
  assert.match(readme, /build-menu-bar/);
  assert.match(host, /COPY_HANDOFF/);
  assert.match(host, /STORE_HANDOFF/);
  assert.match(inbox, /pending-handoff\.json/);
  assert.match(host, /pbcopy/);
});
