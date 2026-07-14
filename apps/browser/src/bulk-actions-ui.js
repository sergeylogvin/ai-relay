function button(label, action, disabled = false) {
  const element = document.createElement("button");
  element.type = "button";
  element.dataset.action = action;
  element.textContent = label;
  element.disabled = disabled;
  return element;
}

export function renderBulkActions({
  root,
  selectedCount = 0,
  totalCount = 0
}) {
  if (!root) {
    throw new Error("Bulk actions root is required.");
  }

  const hasSelection = selectedCount > 0;
  const allSelected =
    totalCount > 0 && selectedCount === totalCount;

  root.replaceChildren();

  const summary = document.createElement("span");
  summary.className = "bulk-actions__summary";
  summary.textContent = hasSelection
    ? `${selectedCount} selected`
    : "No conversations selected";

  root.append(
    summary,
    button(
      allSelected ? "Clear selection" : "Select all",
      allSelected ? "clear-selection" : "select-all",
      totalCount === 0
    ),
    button("Move", "move-selected", !hasSelection),
    button("Tags", "tag-selected", !hasSelection),
    button("Pin", "pin-selected", !hasSelection),
    button("Export", "export-selected", !hasSelection),
    button("Delete", "delete-selected", !hasSelection)
  );
}

export function initializeBulkActionsUI({
  root,
  getSelection,
  getRecordIds,
  onSelectAll,
  onClearSelection,
  onMove,
  onTag,
  onPin,
  onExport,
  onDelete
}) {
  if (!root) {
    return null;
  }

  async function refresh() {
    const [selection, recordIds] = await Promise.all([
      getSelection(),
      getRecordIds()
    ]);

    renderBulkActions({
      root,
      selectedCount: selection.selectedIds.length,
      totalCount: recordIds.length
    });
  }

  root.addEventListener("click", async (event) => {
    const target = event.target.closest(
      "button[data-action]"
    );

    if (!target) {
      return;
    }

    const selection = await getSelection();

    switch (target.dataset.action) {
      case "select-all":
        await onSelectAll();
        break;
      case "clear-selection":
        await onClearSelection();
        break;
      case "move-selected":
        await onMove(selection.selectedIds);
        break;
      case "tag-selected":
        await onTag(selection.selectedIds);
        break;
      case "pin-selected":
        await onPin(selection.selectedIds);
        break;
      case "export-selected":
        await onExport(selection.selectedIds);
        break;
      case "delete-selected":
        await onDelete(selection.selectedIds);
        break;
    }

    document.dispatchEvent(
      new CustomEvent("ai-relay:bulk-selection-changed", {
        detail: {
          action: target.dataset.action
        }
      })
    );

    await refresh();
  });

  document.addEventListener(
    "ai-relay:bulk-selection-changed",
    refresh
  );

  refresh();

  return {
    refresh
  };
}
