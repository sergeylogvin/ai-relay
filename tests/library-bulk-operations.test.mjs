import test from "node:test";
import assert from "node:assert/strict";

import {
  createSelectionState,
  toggleRecordSelection,
  selectRecordRange,
  selectAllRecords,
  clearRecordSelection,
  planBulkDelete,
  planBulkCollectionAssignment,
  planBulkTagUpdate,
  planBulkPinUpdate,
  planBulkExport,
  summarizeBulkSelection
} from "../packages/library/src/bulk-operations.js";

const records = [
  {
    id: "r1",
    collectionIds: ["work"],
    tags: ["seo"],
    pinned: false
  },
  {
    id: "r2",
    collectionIds: [],
    tags: ["research"],
    pinned: true
  },
  {
    id: "r3",
    collectionIds: ["archive"],
    tags: ["seo", "ideas"],
    pinned: false
  }
];

test("toggles and clears selection", () => {
  const initial = createSelectionState();

  const selected = toggleRecordSelection(
    initial,
    "r1",
    { additive: true }
  );

  assert.deepEqual(selected, {
    selectedIds: ["r1"],
    anchorId: "r1"
  });

  assert.deepEqual(clearRecordSelection(), {
    selectedIds: [],
    anchorId: null
  });
});

test("selects a contiguous range", () => {
  const state = {
    selectedIds: ["r1"],
    anchorId: "r1"
  };

  assert.deepEqual(
    selectRecordRange({
      orderedIds: ["r1", "r2", "r3"],
      state,
      recordId: "r3"
    }),
    {
      selectedIds: ["r1", "r2", "r3"],
      anchorId: "r1"
    }
  );
});

test("selects all records", () => {
  assert.deepEqual(
    selectAllRecords(["r1", "r2", "r2"]),
    {
      selectedIds: ["r1", "r2"],
      anchorId: "r1"
    }
  );
});

test("plans delete without mutating records", () => {
  const plan = planBulkDelete({
    records,
    recordIds: ["r1", "missing"]
  });

  assert.deepEqual(plan, {
    action: "delete",
    recordIds: ["r1"],
    missingIds: ["missing"],
    count: 1
  });

  assert.equal(records.length, 3);
});

test("plans collection assignment", () => {
  const plan = planBulkCollectionAssignment({
    records,
    recordIds: ["r1", "r2"],
    collectionId: "product",
    mode: "add"
  });

  assert.deepEqual(plan.changes, [
    {
      recordId: "r1",
      collectionIds: ["work", "product"]
    },
    {
      recordId: "r2",
      collectionIds: ["product"]
    }
  ]);
});

test("plans tag updates", () => {
  const plan = planBulkTagUpdate({
    records,
    recordIds: ["r1", "r3"],
    addTags: ["priority"],
    removeTags: ["seo"]
  });

  assert.deepEqual(plan.changes, [
    {
      recordId: "r1",
      tags: ["priority"]
    },
    {
      recordId: "r3",
      tags: ["ideas", "priority"]
    }
  ]);
});

test("plans pin and export actions", () => {
  assert.deepEqual(
    planBulkPinUpdate({
      records,
      recordIds: ["r1", "r2"],
      pinned: true
    }).changes,
    [
      { recordId: "r1", pinned: true },
      { recordId: "r2", pinned: true }
    ]
  );

  const exported = planBulkExport({
    records,
    recordIds: ["r3", "r1"]
  });

  assert.deepEqual(exported.recordIds, ["r3", "r1"]);
  assert.equal(exported.count, 2);
});

test("summarizes selection state", () => {
  assert.deepEqual(
    summarizeBulkSelection({
      records,
      selectedIds: ["r1", "r2", "r3"]
    }),
    {
      selectedIds: ["r1", "r2", "r3"],
      count: 3,
      hasSelection: true,
      allSelected: true
    }
  );
});

test("validates bulk input", () => {
  assert.throws(
    () =>
      planBulkCollectionAssignment({
        records,
        recordIds: ["r1"],
        collectionId: ""
      }),
    /collectionId is required/
  );

  assert.throws(
    () =>
      planBulkPinUpdate({
        records,
        recordIds: ["r1"],
        pinned: "yes"
      }),
    /pinned must be a boolean/
  );
});
