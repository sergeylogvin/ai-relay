function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function digestWithWebCrypto(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

async function digestWithNodeCrypto(value) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
}

export async function sha256(value) {
  if (typeof value !== "string") {
    throw new TypeError("sha256 input must be a string.");
  }

  if (globalThis.crypto?.subtle) {
    return digestWithWebCrypto(value);
  }

  return digestWithNodeCrypto(value);
}
