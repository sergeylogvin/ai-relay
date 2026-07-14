export const PROVIDER_CAPABILITIES = Object.freeze({
  READ_CONVERSATION: "readConversation",
  INSERT_CONTEXT: "insertContext",
  UPLOAD_FILES: "uploadFiles",
  READ_LIMITS: "readLimits",
  STREAMING: "streaming",
  ATTACHMENTS: "attachments",
  ARTIFACTS: "artifacts",
  IMAGES: "images"
});

export const DEFAULT_PROVIDER_CAPABILITIES = Object.freeze({
  [PROVIDER_CAPABILITIES.READ_CONVERSATION]: false,
  [PROVIDER_CAPABILITIES.INSERT_CONTEXT]: false,
  [PROVIDER_CAPABILITIES.UPLOAD_FILES]: false,
  [PROVIDER_CAPABILITIES.READ_LIMITS]: false,
  [PROVIDER_CAPABILITIES.STREAMING]: false,
  [PROVIDER_CAPABILITIES.ATTACHMENTS]: false,
  [PROVIDER_CAPABILITIES.ARTIFACTS]: false,
  [PROVIDER_CAPABILITIES.IMAGES]: false
});

export function normalizeProviderCapabilities(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Provider capabilities must be an object.");
  }

  const normalized = { ...DEFAULT_PROVIDER_CAPABILITIES };

  for (const key of Object.values(PROVIDER_CAPABILITIES)) {
    if (key in value) {
      normalized[key] = Boolean(value[key]);
    }
  }

  return Object.freeze(normalized);
}

export function supportsCapability(capabilities, capability) {
  if (!Object.values(PROVIDER_CAPABILITIES).includes(capability)) {
    throw new TypeError(`Unknown provider capability: ${String(capability)}`);
  }

  return Boolean(capabilities?.[capability]);
}
