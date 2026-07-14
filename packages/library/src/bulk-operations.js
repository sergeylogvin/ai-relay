import { LibraryValidationError } from "./errors.js";

function normalizeIds(value, name) {
  if (!Array.isArray(value)) {
    throw new LibraryValidationError(`${name} must be an array.`);
  }

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  ];
}

function normalizeTags(value) {
  return normalizeIds(value ?? [], "tags");
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) {
    throw new LibraryValidationError("records must be an array.");
  }

  return records;
}

function buildRecordMap(records) {
  return new Map(
    records
      .filter((record) => record && record.id)
      .map((record) => [String(record.id), record])
  );
}

function selectRecords(records, recordIds) {
  const map = buildRecordMap(records);

  return recordIds
    .map((id) => map.get(id))
    .filter(Boolean);
}

export function createSelectionState({
  selectedIds = [],
  anchorId = null
} = {}) {
  return {
    selectedIds: normalizeIds(selectedIds, "selectedIds"),
    anchorId: anchorId ? String(anchorId) : null
  };
}

export function toggleRecordSelection(
  state,
  recordId,
  { additive = false } = {}
) {
  const current = createSelectionState(state);
  const id = String(recordId ?? "").trim();

  if (!id) {
    throw new LibraryValidationError("recordId is required.");
  }

  const selected = new Set(
    additive ? current.selectedIds : []
  );

  if (selected.has(id)) {
    selected.delete(id);
  } else {
    selected.add(id);
  }

  return {
    selectedIds: [...selected],
    anchorId: id
  };
}

export function selectRecordRange({
  orderedIds,
  state,
  recordId,
  additive = false
}) {
  const ids = normalizeIds(orderedIds, "orderedIds");
  const current = createSelectionState(state);
  const targetId = String(recordId ?? "").trim();

  if (!targetId) {
    throw new LibraryValidationError("recordId is required.");
  }

  const anchorId = current.anchorId ?? targetId;
  const start = ids.indexOf(anchorId);
  const end = ids.indexOf(targetId);

  if (start === -1 || end === -1) {
    return toggleRecordSelection(current, targetId, {
      additive
    });
  }

  const [from, to] =
    start <= end ? [start, end] : [end, start];

  const selected = new Set(
    additive ? current.selectedIds : []
  );

  for (const id of ids.slice(from, to + 1)) {
    selected.add(id);
  }

  return {
    selectedIds: [...selected],
    anchorId
  };
}

export function selectAllRecords(recordIds = []) {
  const ids = normalizeIds(recordIds, "recordIds");

  return {
    selectedIds: ids,
    anchorId: ids[0] ?? null
  };
}

export function clearRecordSelection() {
  return {
    selectedIds: [],
    anchorId: null
  };
}

export function planBulkDelete({
  records = [],
  recordIds = []
} = {}) {
  const normalizedRecords = normalizeRecords(records);
  const ids = normalizeIds(recordIds, "recordIds");
  const selected = selectRecords(normalizedRecords, ids);
  const foundIds = new Set(selected.map((record) => String(record.id)));

  return {
    action: "delete",
    recordIds: selected.map((record) => String(record.id)),
    missingIds: ids.filter((id) => !foundIds.has(id)),
    count: selected.length
  };
}

export function planBulkCollectionAssignment({
  records = [],
  recordIds = [],
  collectionId,
  mode = "add"
} = {}) {
  const normalizedRecords = normalizeRecords(records);
  const ids = normalizeIds(recordIds, "recordIds");
  const normalizedCollectionId = String(
    collectionId ?? ""
  ).trim();

  if (!normalizedCollectionId) {
    throw new LibraryValidationError(
      "collectionId is required."
    );
  }

  if (!["add", "remove", "replace"].includes(mode)) {
    throw new LibraryValidationError(
      'mode must be "add", "remove", or "replace".'
    );
  }

  return {
    action: "collection",
    mode,
    collectionId: normalizedCollectionId,
    changes: selectRecords(normalizedRecords, ids).map(
      (record) => {
        const existing = normalizeIds(
          Array.isArray(record.collectionIds)
            ? record.collectionIds
            : [],
          "collectionIds"
        );

        let collectionIds;

        if (mode === "replace") {
          collectionIds = [normalizedCollectionId];
        } else if (mode === "remove") {
          collectionIds = existing.filter(
            (id) => id !== normalizedCollectionId
          );
        } else {
          collectionIds = [
            ...new Set([
              ...existing,
              normalizedCollectionId
            ])
          ];
        }

        return {
          recordId: String(record.id),
          collectionIds
        };
      }
    )
  };
}

export function planBulkTagUpdate({
  records = [],
  recordIds = [],
  addTags = [],
  removeTags = []
} = {}) {
  const normalizedRecords = normalizeRecords(records);
  const ids = normalizeIds(recordIds, "recordIds");
  const add = normalizeTags(addTags);
  const remove = new Set(normalizeTags(removeTags));

  return {
    action: "tags",
    changes: selectRecords(normalizedRecords, ids).map(
      (record) => {
        const existing = normalizeTags(record.tags ?? []);
        const tags = [
          ...new Set([
            ...existing.filter((tag) => !remove.has(tag)),
            ...add
          ])
        ];

        return {
          recordId: String(record.id),
          tags
        };
      }
    )
  };
}

export function planBulkPinUpdate({
  records = [],
  recordIds = [],
  pinned
} = {}) {
  const normalizedRecords = normalizeRecords(records);
  const ids = normalizeIds(recordIds, "recordIds");

  if (typeof pinned !== "boolean") {
    throw new LibraryValidationError(
      "pinned must be a boolean."
    );
  }

  return {
    action: "pin",
    pinned,
    changes: selectRecords(normalizedRecords, ids).map(
      (record) => ({
        recordId: String(record.id),
        pinned
      })
    )
  };
}

export function planBulkExport({
  records = [],
  recordIds = []
} = {}) {
  const normalizedRecords = normalizeRecords(records);
  const ids = normalizeIds(recordIds, "recordIds");
  const selected = selectRecords(normalizedRecords, ids);

  return {
    action: "export",
    records: selected,
    recordIds: selected.map((record) => String(record.id)),
    count: selected.length
  };
}

export function summarizeBulkSelection({
  records = [],
  selectedIds = []
} = {}) {
  const normalizedRecords = normalizeRecords(records);
  const ids = normalizeIds(selectedIds, "selectedIds");
  const selected = selectRecords(normalizedRecords, ids);

  return {
    selectedIds: selected.map((record) => String(record.id)),
    count: selected.length,
    hasSelection: selected.length > 0,
    allSelected:
      normalizedRecords.length > 0 &&
      selected.length === normalizedRecords.length
  };
}
