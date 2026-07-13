function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function matchesLibraryQuery(record, query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return true;

  const haystack = [
    record.title,
    record.provider,
    record.sourceUrl,
    ...(record.tags ?? []),
    record.handoffMarkdown
  ]
    .map(normalize)
    .join("\n");

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}
