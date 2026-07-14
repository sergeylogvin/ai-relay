const ACCEPTED_EXTENSIONS = [".json", ".zip"];

function normalizeFileName(name) {
  return String(name ?? "").trim().toLowerCase();
}

export function isSupportedLibraryImportFile(file) {
  if (!file || typeof file.name !== "string") {
    return false;
  }

  const name = normalizeFileName(file.name);
  return ACCEPTED_EXTENSIONS.some((extension) =>
    name.endsWith(extension)
  );
}

export function formatImportSummary(summary = {}) {
  const imported = Number(summary.imported ?? 0);
  const skipped = Number(summary.skipped ?? 0);
  const updated = Number(summary.updated ?? 0);

  const parts = [`Imported ${imported}`];

  if (updated > 0) {
    parts.push(`updated ${updated}`);
  }

  if (skipped > 0) {
    parts.push(`skipped ${skipped}`);
  }

  return `${parts.join(", ")} conversation(s).`;
}

export function createImportExportState({
  status = "idle",
  message = "",
  progress = 0,
  fileName = ""
} = {}) {
  return {
    status,
    message: String(message),
    progress: Math.max(0, Math.min(100, Number(progress) || 0)),
    fileName: String(fileName)
  };
}

export function renderImportExportUI({
  root,
  state = createImportExportState()
}) {
  if (!root) {
    throw new Error("Import/export root is required.");
  }

  root.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = "Import and export";

  const actions = document.createElement("div");
  actions.className = "import-export__actions";

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.dataset.action = "export-library";
  exportButton.textContent = "Export library";
  exportButton.disabled = state.status === "working";

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.dataset.action = "choose-import";
  importButton.textContent = "Import library";
  importButton.disabled = state.status === "working";

  const input = document.createElement("input");
  input.type = "file";
  input.hidden = true;
  input.dataset.role = "import-file";
  input.accept = ".json,.zip,application/json,application/zip";

  const dropzone = document.createElement("div");
  dropzone.className = "import-export__dropzone";
  dropzone.dataset.role = "dropzone";
  dropzone.tabIndex = 0;
  dropzone.textContent = "Drop a library JSON or ZIP backup here";

  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = state.progress;
  progress.hidden = state.status !== "working";

  const status = document.createElement("p");
  status.className = "import-export__status";
  status.dataset.status = state.status;
  status.textContent =
    state.message ||
    (state.fileName ? `Selected: ${state.fileName}` : "Ready.");

  actions.append(exportButton, importButton, input);
  root.append(heading, actions, dropzone, progress, status);
}

function dispatchState(root, state) {
  renderImportExportUI({ root, state });

  document.dispatchEvent(
    new CustomEvent("ai-relay:import-export-state", {
      detail: state
    })
  );
}

export function initializeImportExportUI({
  root,
  exportLibrary,
  importLibrary,
  confirmImport = (file) =>
    window.confirm(
      `Import ${file.name}? Existing records may be updated.`
    )
}) {
  if (!root) {
    return null;
  }

  let state = createImportExportState();

  async function runExport() {
    state = createImportExportState({
      status: "working",
      message: "Preparing export…",
      progress: 25
    });
    dispatchState(root, state);

    try {
      const result = await exportLibrary({
        onProgress(value, message = "Preparing export…") {
          state = createImportExportState({
            status: "working",
            message,
            progress: value
          });
          dispatchState(root, state);
        }
      });

      state = createImportExportState({
        status: "success",
        message:
          result?.message ||
          "Library export downloaded successfully.",
        progress: 100
      });
    } catch (error) {
      state = createImportExportState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Library export failed."
      });
    }

    dispatchState(root, state);
  }

  async function runImport(file) {
    if (!isSupportedLibraryImportFile(file)) {
      state = createImportExportState({
        status: "error",
        message: "Choose a .json or .zip library backup."
      });
      dispatchState(root, state);
      return;
    }

    const confirmed = await confirmImport(file);
    if (!confirmed) {
      state = createImportExportState({
        status: "idle",
        message: "Import cancelled.",
        fileName: file.name
      });
      dispatchState(root, state);
      return;
    }

    state = createImportExportState({
      status: "working",
      message: `Importing ${file.name}…`,
      progress: 10,
      fileName: file.name
    });
    dispatchState(root, state);

    try {
      const summary = await importLibrary(file, {
        onProgress(value, message = `Importing ${file.name}…`) {
          state = createImportExportState({
            status: "working",
            message,
            progress: value,
            fileName: file.name
          });
          dispatchState(root, state);
        }
      });

      state = createImportExportState({
        status: "success",
        message: formatImportSummary(summary),
        progress: 100,
        fileName: file.name
      });

      document.dispatchEvent(
        new CustomEvent("ai-relay:library-records-changed", {
          detail: {
            action: "import",
            summary
          }
        })
      );
    } catch (error) {
      state = createImportExportState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Library import failed.",
        fileName: file.name
      });
    }

    dispatchState(root, state);
  }

  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "export-library") {
      runExport();
      return;
    }

    if (action === "choose-import") {
      root.querySelector('[data-role="import-file"]')?.click();
    }
  });

  root.addEventListener("change", (event) => {
    const input = event.target.closest('[data-role="import-file"]');
    const file = input?.files?.[0];

    if (file) {
      runImport(file);
    }
  });

  root.addEventListener("dragover", (event) => {
    const dropzone = event.target.closest('[data-role="dropzone"]');
    if (!dropzone) return;

    event.preventDefault();
    dropzone.classList.add("is-drag-over");
  });

  root.addEventListener("dragleave", (event) => {
    event.target
      .closest('[data-role="dropzone"]')
      ?.classList.remove("is-drag-over");
  });

  root.addEventListener("drop", (event) => {
    const dropzone = event.target.closest('[data-role="dropzone"]');
    if (!dropzone) return;

    event.preventDefault();
    dropzone.classList.remove("is-drag-over");

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      runImport(file);
    }
  });

  renderImportExportUI({ root, state });

  return {
    exportLibrary: runExport,
    importFile: runImport,
    getState: () => state
  };
}
