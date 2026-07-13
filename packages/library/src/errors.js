export class LibraryValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LibraryValidationError";
    this.details = details;
  }
}

export class LibraryRecordNotFoundError extends Error {
  constructor(id) {
    super(`Conversation library record not found: ${id}`);
    this.name = "LibraryRecordNotFoundError";
    this.id = id;
  }
}
