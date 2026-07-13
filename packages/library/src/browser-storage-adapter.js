import { LibraryValidationError } from "./errors.js";

export const DEFAULT_STORAGE_KEY = "aiRelay.conversationLibrary";

function assertStorageArea(storageArea) {
  if (
    !storageArea ||
    typeof storageArea.get !== "function" ||
    typeof storageArea.set !== "function"
  ) {
    throw new LibraryValidationError(
      "A WebExtension-compatible storage area is required."
    );
  }
}

export class BrowserStorageLibraryAdapter {
  constructor({
    storageArea = globalThis.chrome?.storage?.local,
    storageKey = DEFAULT_STORAGE_KEY
  } = {}) {
    assertStorageArea(storageArea);
    this.storageArea = storageArea;
    this.storageKey = storageKey;
  }

  async readAll() {
    const result = await this.storageArea.get(this.storageKey);
    const records = result?.[this.storageKey];

    if (records == null) return {};

    if (typeof records !== "object" || Array.isArray(records)) {
      throw new LibraryValidationError(
        "Conversation library storage is corrupted."
      );
    }

    return records;
  }

  async writeAll(records) {
    await this.storageArea.set({
      [this.storageKey]: records
    });
  }

  async save(record) {
    const records = await this.readAll();
    records[record.id] = structuredClone(record);
    await this.writeAll(records);
  }

  async get(id) {
    const records = await this.readAll();
    return records[id] ? structuredClone(records[id]) : null;
  }

  async list() {
    const records = await this.readAll();
    return Object.values(records).map((record) =>
      structuredClone(record)
    );
  }

  async delete(id) {
    const records = await this.readAll();

    if (!Object.hasOwn(records, id)) return false;

    delete records[id];
    await this.writeAll(records);
    return true;
  }

  async clear() {
    await this.writeAll({});
  }
}
