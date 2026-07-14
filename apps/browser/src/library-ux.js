import {
  applyLibraryAccessibility,
  createLiveRegion,
  renderEmptyState,
  renderLoadingState
} from "./accessibility-ui.js";

export function initializeLibraryUX({
  root = document,
  listRoot,
  getVisibleRecords = () => [],
  onAction = () => {}
} = {}) {
  const liveRegion = createLiveRegion({
    root: root.body ?? document.body
  });

  function announce(message, politeness = "polite") {
    liveRegion.announce({
      message,
      politeness
    });
  }

  function showLoading(label = "Loading library") {
    if (!listRoot) {
      return;
    }

    renderLoadingState({
      root: listRoot,
      label
    });
  }

  function renderCurrentState() {
    if (!listRoot) {
      return;
    }

    const records = getVisibleRecords();

    if (records.length === 0) {
      const empty = renderEmptyState({
        root: listRoot,
        title: "No conversations found",
        message:
          "Try changing your search, filters, or active collection.",
        actionLabel: "Clear filters",
        actionId: "clear-library-filters"
      });

      empty?.addEventListener("click", (event) => {
        const action = event.target.closest(
          "[data-action]"
        )?.dataset.action;

        if (!action) {
          return;
        }

        onAction(action);
        announce("Library filters cleared.");
      });

      return;
    }

    listRoot.removeAttribute("aria-busy");
  }

  function recordsChanged(event) {
    renderCurrentState();

    const count =
      Number(event?.detail?.count) ||
      getVisibleRecords().length;

    announce(
      `${count} conversation${count === 1 ? "" : "s"} available.`
    );
  }

  applyLibraryAccessibility(root);

  root.addEventListener(
    "ai-relay:library-records-changed",
    recordsChanged
  );

  root.addEventListener(
    "ai-relay:library-filtered",
    recordsChanged
  );

  return {
    announce,
    showLoading,
    renderCurrentState,
    destroy() {
      root.removeEventListener(
        "ai-relay:library-records-changed",
        recordsChanged
      );
      root.removeEventListener(
        "ai-relay:library-filtered",
        recordsChanged
      );
      liveRegion.destroy();
    }
  };
}
