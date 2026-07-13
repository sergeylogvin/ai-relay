import { RecordNotFoundError } from "./errors.js";

export class MemoryStorageAdapter {
  #records = new Map();

  async put(key, value) {
    this.#records.set(key, structuredClone(value));
  }

  async get(key) {
    if (!this.#records.has(key)) {
      throw new RecordNotFoundError(key);
    }

    return structuredClone(this.#records.get(key));
  }

  async has(key) {
    return this.#records.has(key);
  }

  async delete(key) {
    return this.#records.delete(key);
  }

  async list(prefix = "") {
    return [...this.#records.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        value: structuredClone(value),
      }));
  }

  async clear() {
    this.#records.clear();
  }
}
