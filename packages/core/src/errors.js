export class DomainValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "DomainValidationError";
    this.details = details;
  }
}
