export class MemoryLibraryAdapter {
  constructor(initialRecords = []) {
    this.records = new Map(
      initialRecords.map((record) => [record.id, structuredClone(record)])
    );
  }

  async save(record) {
    this.records.set(record.id, structuredClone(record));
  }

  async get(id) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async list() {
    return [...this.records.values()].map((record) =>
      structuredClone(record)
    );
  }

  async delete(id) {
    return this.records.delete(id);
  }

  async clear() {
    this.records.clear();
  }
}
