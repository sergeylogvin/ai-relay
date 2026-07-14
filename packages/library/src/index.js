export {
  LIBRARY_BACKUP_VERSION,
  createLibraryBackup,
  importLibraryBackup,
  serializeLibraryBackup,
  validateLibraryBackup
} from "./backup.js";
export { BrowserStorageLibraryAdapter, DEFAULT_STORAGE_KEY } from "./browser-storage-adapter.js";
export {
  LibraryRecordNotFoundError,
  LibraryValidationError
} from "./errors.js";
export { ConversationLibrary } from "./library.js";
export { MemoryLibraryAdapter } from "./memory-adapter.js";
export { createLibraryRecord } from "./record.js";
export { matchesLibraryQuery } from "./search.js";
export {
  filterLibraryRecords,
  listLibraryCollections,
  listLibraryTags,
  normalizeTags,
  sortLibraryRecords,
  updateRecordOrganization
} from "./organization.js";
export {
  findDuplicateGroups,
  getDuplicateKey,
  getDuplicateRecordIds
} from "./duplicates.js";
export {
  mergeDuplicateGroup
} from "./merge-duplicates.js";
export {
  planLibraryCleanup
} from "./cleanup.js";
export {
  LIBRARY_SNAPSHOT_VERSION,
  createLibrarySnapshot,
  serializeLibrarySnapshot,
  getLibrarySnapshotFilename
} from "./snapshot.js";
export {
  parseLibrarySnapshot,
  planLibrarySnapshotImport
} from "./snapshot-import.js";
export {
  smartSearchLibrary,
  highlightSearchTerms
} from "./smart-search.js";
export {
  normalizeLibraryFilters as normalizeAdvancedLibraryFilters,
  recordMatchesLibraryFilters as recordMatchesAdvancedLibraryFilters,
  filterLibraryRecords as applyLibraryFilters,
  summarizeLibraryFilters as summarizeAdvancedLibraryFilters
} from "./filters.js";
export {
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
} from "./bulk-operations.js";
