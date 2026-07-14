# Browser user release checklist

## Automated

- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run package:browser`
- [ ] ZIP exists in `release/`
- [ ] SHA-256 checksum exists
- [ ] Release metadata exists

## Manual install

- [ ] Extract ZIP
- [ ] Load unpacked extension
- [ ] Extension icon appears
- [ ] Popup opens
- [ ] Library opens
- [ ] No console errors
- [ ] Data survives browser restart

## Core smoke test

- [ ] Save a conversation
- [ ] Search and filter it
- [ ] Create a collection
- [ ] Create a saved view
- [ ] Run a bulk operation
- [ ] Open analytics and settings
- [ ] Export a snapshot
- [ ] Validate snapshot import
- [ ] Open command palette with `Cmd/Ctrl + K`
