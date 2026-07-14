# Library v1 release checklist

## Product scope

- [x] Local conversation library
- [x] Metadata organization
- [x] Tags and pinned conversations
- [x] Collections
- [x] Duplicate detection
- [x] Duplicate review UI
- [x] Duplicate merge planner
- [x] Cleanup planner
- [x] Snapshot export
- [x] Snapshot import
- [x] Smart search
- [x] Advanced filters
- [x] Collections UI
- [x] Bulk operations
- [x] Import/export UI
- [x] Settings and preferences
- [x] Analytics and insights
- [x] Saved views
- [x] Keyboard shortcuts
- [x] Command palette
- [x] UX polish and accessibility

## Validation

- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run build:browser`
- [ ] Browser extension package builds successfully
- [ ] Main branch remains clean after validation

## Manual smoke test

- [ ] Open Library
- [ ] Search conversations
- [ ] Apply advanced filters
- [ ] Create and open a collection
- [ ] Select multiple conversations
- [ ] Run a bulk operation
- [ ] Save and apply a saved view
- [ ] Open command palette with `Cmd/Ctrl + K`
- [ ] Export a snapshot
- [ ] Import a snapshot preview
- [ ] Open settings
- [ ] Open analytics
- [ ] Verify empty state and loading state
- [ ] Verify keyboard focus indicators
- [ ] Verify reduced-motion behavior
