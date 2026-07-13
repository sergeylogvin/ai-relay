import { DomainValidationError } from "./errors.js";

export function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainValidationError(`${fieldName} must be a non-empty string`, {
      field: fieldName,
      value
    });
  }

  return value.trim();
}

export function optionalString(value, fieldName) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new DomainValidationError(`${fieldName} must be a string`, {
      field: fieldName,
      value
    });
  }

  return value.trim();
}

export function stringArray(value, fieldName) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new DomainValidationError(`${fieldName} must be an array of strings`, {
      field: fieldName,
      value
    });
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

export function isoDate(value, fieldName) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new DomainValidationError(`${fieldName} must be a valid date`, {
      field: fieldName,
      value
    });
  }

  return date.toISOString();
}
