import {
  LibraryRecordNotFoundError,
  LibraryValidationError
} from "./errors.js";
import { createLibraryRecord } from "./record.js";
import { matchesLibraryQuery } from "./search.js";

function sortRecords(records) {
  return [...records].sort((left, right) => {
    const updatedComparison = String(right.updatedAt).localeCompare(
      String(left.updatedAt)
    );

    if (updatedComparison !== 0) return updatedComparison;

    return left.title.localeCompare(right.title);
  });
}

export class ConversationLibrary {
  constructor(adapter) {
    if (!adapter) {
      throw new LibraryValidationError("A library adapter is required.");
    }

    this.adapter = adapter;
  }

  async save(input) {
    const existing = input.id
      ? await this.adapter.get(input.id)
      : null;

    const record = createLibraryRecord({
      ...input,
      createdAt: existing?.createdAt ?? input.createdAt,
      updatedAt: input.updatedAt ?? new Date().toISOString()
    });

    await this.adapter.save(record);
    return record;
  }

  async get(id) {
    const record = await this.adapter.get(id);

    if (!record) {
      throw new LibraryRecordNotFoundError(id);
    }

    return record;
  }

  async list({
    query = "",
    provider = null,
    tags = []
  } = {}) {
    const records = await this.adapter.list();

    return sortRecords(
      records.filter((record) => {
        if (provider && record.provider !== provider) {
          return false;
        }

        if (
          tags.length > 0 &&
          !tags.every((tag) => record.tags.includes(tag.toLowerCase()))
        ) {
          return false;
        }

        return matchesLibraryQuery(record, query);
      })
    );
  }

  async delete(id) {
    const deleted = await this.adapter.delete(id);

    if (!deleted) {
      throw new LibraryRecordNotFoundError(id);
    }
  }

  async clear() {
    await this.adapter.clear();
  }
}
