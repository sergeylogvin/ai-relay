import { LibraryValidationError } from "./errors.js";

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return raw.toLowerCase().replace(/\/+$/, "");
  }
}

export function getDuplicateKey(record) {
  if (!record || typeof record !== "object") {
    throw new LibraryValidationError("A conversation record is required.");
  }

  const provider = normalizeText(record.provider);
  const sourceUrl = normalizeUrl(record.sourceUrl);

  if (provider && sourceUrl) {
    return `source:${provider}:${sourceUrl}`;
  }

  const checksum = normalizeText(record.checksum);
  if (checksum) {
    return `checksum:${provider}:${checksum}`;
  }

  const title = normalizeText(record.title);
  return `fallback:${provider}:${title}:${Number(record.messageCount ?? 0)}`;
}

export function findDuplicateGroups(records) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("records must be an array.");
  }

  const groups = new Map();

  for (const record of records) {
    const key = getDuplicateKey(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) =>
      [...group].sort((left, right) => {
        const leftTime = Date.parse(left.updatedAt ?? "") || 0;
        const rightTime = Date.parse(right.updatedAt ?? "") || 0;
        return rightTime - leftTime;
      })
    );
}

export function getDuplicateRecordIds(records) {
  return new Set(
    findDuplicateGroups(records).flatMap((group) =>
      group.map((record) => record.id)
    )
  );
}
