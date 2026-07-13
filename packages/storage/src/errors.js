export class StorageError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "StorageError";
  }
}

export class RecordNotFoundError extends StorageError {
  constructor(id) {
    super(`Record not found: ${id}`);
    this.name = "RecordNotFoundError";
    this.id = id;
  }
}

export class InvalidRecordError extends StorageError {
  constructor(message) {
    super(message);
    this.name = "InvalidRecordError";
  }
}
