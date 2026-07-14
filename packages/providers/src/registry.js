import { DEFAULT_PROVIDER_PLUGINS } from "./default-plugins.js";
import { validateProviderAdapter } from "./plugin.js";

export class ProviderNotFoundError extends Error {
  constructor(input) {
    super(`No provider adapter found for: ${String(input)}`);
    this.name = "ProviderNotFoundError";
    this.input = input;
  }
}

export class DuplicateProviderError extends Error {
  constructor(id) {
    super(`Provider plugin already registered: ${id}`);
    this.name = "DuplicateProviderError";
    this.providerId = id;
  }
}

export class ProviderRegistry {
  constructor(plugins = DEFAULT_PROVIDER_PLUGINS) {
    this.plugins = [];
    this.adapters = [];

    for (const plugin of plugins) {
      this.register(plugin);
    }
  }

  register(plugin) {
    if (!plugin || typeof plugin.createAdapter !== "function") {
      throw new TypeError("Provider plugin must implement createAdapter().");
    }

    if (this.plugins.some((item) => item.id === plugin.id)) {
      throw new DuplicateProviderError(plugin.id);
    }

    const adapter = validateProviderAdapter(
      plugin.createAdapter(),
      plugin.id
    );

    this.plugins.push(plugin);
    this.adapters.push(adapter);

    return this;
  }

  list() {
    return this.plugins.map((plugin, index) => ({
      id: plugin.id,
      displayName: plugin.displayName,
      hosts: [...plugin.hosts],
      capabilities: this.adapters[index].capabilities()
    }));
  }

  getCapabilities(input) {
    return this.require(input).capabilities();
  }

  supports(input, capability) {
    return Boolean(this.getCapabilities(input)[capability]);
  }

  providersSupporting(capability) {
    return this.list().filter(
      ({ capabilities }) => Boolean(capabilities[capability])
    );
  }

  find(input) {
    return this.adapters.find((adapter) => adapter.matches(input)) ?? null;
  }

  require(input) {
    const adapter = this.find(input);

    if (!adapter) {
      throw new ProviderNotFoundError(input);
    }

    return adapter;
  }

  readConversation(input, root = document) {
    return this.require(input).readConversation(root);
  }
}
