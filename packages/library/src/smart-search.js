import { LibraryValidationError } from "./errors.js";

const FIELD_WEIGHTS = {
  title: 8,
  tags: 6,
  collections: 5,
  provider: 4,
  domain: 4,
  url: 3,
  notes: 2,
  content: 1
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function levenshtein(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function fuzzyTokenScore(queryToken, fieldToken) {
  if (queryToken === fieldToken) return 1;
  if (fieldToken.startsWith(queryToken)) return 0.9;
  if (fieldToken.includes(queryToken)) return 0.75;

  const maxLength = Math.max(queryToken.length, fieldToken.length);
  if (maxLength < 4) return 0;

  const distance = levenshtein(queryToken, fieldToken);
  const similarity = 1 - distance / maxLength;

  return similarity >= 0.72 ? similarity * 0.65 : 0;
}

function bestTokenScore(queryToken, fieldTokens) {
  return fieldTokens.reduce(
    (best, fieldToken) =>
      Math.max(best, fuzzyTokenScore(queryToken, fieldToken)),
    0
  );
}

function getDomain(record) {
  if (record?.domain) return record.domain;

  try {
    return new URL(record?.url ?? "").hostname;
  } catch {
    return "";
  }
}

function getCollectionNames(record, collectionMap) {
  const ids = Array.isArray(record?.collectionIds)
    ? record.collectionIds
    : [];

  return ids
    .map((id) => collectionMap.get(id)?.name ?? id)
    .filter(Boolean);
}

function buildSearchDocument(record, collectionMap) {
  return {
    title: record?.title ?? "",
    tags: Array.isArray(record?.tags) ? record.tags.join(" ") : "",
    collections: getCollectionNames(record, collectionMap).join(" "),
    provider: record?.provider ?? "",
    domain: getDomain(record),
    url: record?.url ?? "",
    notes: record?.notes ?? record?.summary ?? "",
    content:
      record?.content ??
      record?.markdown ??
      record?.prompt ??
      record?.response ??
      ""
  };
}

function scoreField(queryTokens, phrase, fieldValue, weight) {
  const normalized = normalizeText(fieldValue);
  if (!normalized) {
    return { score: 0, matchedTerms: [] };
  }

  const fieldTokens = tokenize(normalized);
  const matchedTerms = [];
  let score = 0;

  if (phrase && normalized.includes(phrase)) {
    score += weight * 2.5;
  }

  for (const queryToken of queryTokens) {
    const tokenScore = bestTokenScore(queryToken, fieldTokens);

    if (tokenScore > 0) {
      matchedTerms.push(queryToken);
      score += weight * tokenScore;
    }
  }

  return { score, matchedTerms };
}

function createSnippet(value, terms, maxLength = 180) {
  const source = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!source) return "";

  const normalized = normalizeText(source);
  const indexes = terms
    .map((term) => normalized.indexOf(normalizeText(term)))
    .filter((index) => index >= 0);

  const firstMatch = indexes.length ? Math.min(...indexes) : 0;
  const start = Math.max(0, firstMatch - 50);
  const end = Math.min(source.length, start + maxLength);

  return `${start > 0 ? "…" : ""}${source.slice(start, end)}${
    end < source.length ? "…" : ""
  }`;
}

export function highlightSearchTerms(value, terms) {
  const source = String(value ?? "");
  const cleanTerms = [...new Set(
    terms
      .map((term) => String(term ?? "").trim())
      .filter(Boolean)
  )].sort((left, right) => right.length - left.length);

  if (!source || cleanTerms.length === 0) {
    return [{ text: source, match: false }];
  }

  const expression = new RegExp(
    `(${cleanTerms.map(escapeRegExp).join("|")})`,
    "gi"
  );

  return source
    .split(expression)
    .filter((part) => part !== "")
    .map((text) => ({
      text,
      match: cleanTerms.some(
        (term) => normalizeText(text) === normalizeText(term)
      )
    }));
}

export function smartSearchLibrary({
  records = [],
  collections = [],
  query = "",
  limit = 50,
  minScore = 1
} = {}) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("Records must be an array.");
  }

  if (!Array.isArray(collections)) {
    throw new LibraryValidationError("Collections must be an array.");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new LibraryValidationError("Limit must be a positive integer.");
  }

  const phrase = normalizeText(query);
  const queryTokens = tokenize(query);

  if (!phrase || queryTokens.length === 0) {
    return [];
  }

  const collectionMap = new Map(
    collections.map((collection) => [collection.id, collection])
  );

  return records
    .map((record, index) => {
      const document = buildSearchDocument(record, collectionMap);
      const fieldScores = {};
      const matchedTerms = new Set();
      let score = 0;

      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        const result = scoreField(
          queryTokens,
          phrase,
          document[field],
          weight
        );

        fieldScores[field] = Number(result.score.toFixed(4));
        score += result.score;

        for (const term of result.matchedTerms) {
          matchedTerms.add(term);
        }
      }

      if (record?.pinned) {
        score += 0.25;
      }

      const snippetSource =
        document.notes ||
        document.content ||
        document.title ||
        document.url;

      return {
        record,
        score: Number(score.toFixed(4)),
        matchedTerms: [...matchedTerms],
        matchedFields: Object.entries(fieldScores)
          .filter(([, fieldScore]) => fieldScore > 0)
          .map(([field]) => field),
        fieldScores,
        snippet: createSnippet(snippetSource, [...matchedTerms]),
        originalIndex: index
      };
    })
    .filter((result) => result.score >= minScore)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(Boolean(right.record?.pinned)) -
          Number(Boolean(left.record?.pinned)) ||
        String(right.record?.updatedAt ?? "").localeCompare(
          String(left.record?.updatedAt ?? "")
        ) ||
        left.originalIndex - right.originalIndex
    )
    .slice(0, limit)
    .map(({ originalIndex, ...result }) => result);
}
