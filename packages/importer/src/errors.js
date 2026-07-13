export class ImportValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ImportValidationError";
    this.details = details;
  }
}
