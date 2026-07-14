import { normalizeProviderCapabilities } from "./capabilities.js";

const REQUIRED_ADAPTER_METHODS = Object.freeze([
  "matches",
  "capabilities",
  "readConversation"
]);

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

export function validateProviderAdapter(adapter, expectedId = null) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("Provider adapter must be an object.");
  }

  const id = assertNonEmptyString(adapter.id, "adapter.id");

  if (expectedId !== null && id !== expectedId) {
    throw new TypeError(
      `Provider adapter id "${id}" does not match plugin id "${expectedId}".`
    );
  }

  for (const method of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[method] !== "function") {
      throw new TypeError(
        `Provider adapter "${id}" must implement ${method}().`
      );
    }
  }

  const capabilities = normalizeProviderCapabilities(
    adapter.capabilities()
  );

  if (
    capabilities.insertContext &&
    typeof adapter.insertContext !== "function"
  ) {
    throw new TypeError(
      `Provider adapter "${id}" declares insertContext but does not implement insertContext().`
    );
  }

  const validatedAdapter = {
    id,
    matches: adapter.matches.bind(adapter),
    readConversation: adapter.readConversation.bind(adapter),
    capabilities() {
      return capabilities;
    }
  };

  if (capabilities.insertContext) {
    validatedAdapter.insertContext = adapter.insertContext.bind(adapter);
  }

  return Object.freeze(validatedAdapter);
}

export function defineProviderPlugin({
  id,
  displayName,
  hosts,
  createAdapter
}) {
  const normalizedId = assertNonEmptyString(id, "plugin.id");
  const normalizedName = assertNonEmptyString(
    displayName ?? id,
    "plugin.displayName"
  );

  if (!Array.isArray(hosts) || hosts.length === 0) {
    throw new TypeError(`Provider plugin "${normalizedId}" needs hosts.`);
  }

  const normalizedHosts = Object.freeze(
    hosts.map((host) => assertNonEmptyString(host, "plugin.host"))
  );

  if (typeof createAdapter !== "function") {
    throw new TypeError(
      `Provider plugin "${normalizedId}" needs createAdapter().`
    );
  }

  const plugin = {
    id: normalizedId,
    displayName: normalizedName,
    hosts: normalizedHosts,
    createAdapter() {
      return validateProviderAdapter(createAdapter(), normalizedId);
    }
  };

  return Object.freeze(plugin);
}
