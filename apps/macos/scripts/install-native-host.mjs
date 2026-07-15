import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hostScript = resolve(root, "native-host/ai-relay-host.mjs");
const hostName = "com.ai_relay.native_host";

const browserTargets = [
  {
    label: "Google Chrome",
    directory: "Google/Chrome"
  },
  {
    label: "Chromium",
    directory: "Chromium"
  },
  {
    label: "Brave",
    directory: "BraveSoftware/Brave-Browser"
  },
  {
    label: "Microsoft Edge",
    directory: "Microsoft Edge"
  }
];

function usage() {
  console.log(`Usage: node apps/macos/scripts/install-native-host.mjs <extension-id>

Example:
  node apps/macos/scripts/install-native-host.mjs abcdefghijklmnopqrstuvwxyz123456

Find the extension ID on chrome://extensions with Developer mode enabled.
`);
}

const extensionId = process.argv[2]?.trim();

if (!extensionId) {
  usage();
  process.exit(1);
}

await chmod(hostScript, 0o755);

const manifest = {
  name: hostName,
  description: "AI Relay desktop handoff bridge",
  path: hostScript,
  type: "stdio",
  allowed_origins: [`chrome-extension://${extensionId}/`]
};

for (const target of browserTargets) {
  const directory = resolve(
    homedir(),
    "Library/Application Support",
    target.directory,
    "NativeMessagingHosts"
  );

  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, `${hostName}.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(`Installed ${hostName} for ${target.label}.`);
}

console.log("");
console.log("Reload the AI Relay extension, then use Copy for Desktop in the popup.");
