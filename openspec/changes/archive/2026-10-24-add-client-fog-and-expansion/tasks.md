# Tasks

## 1. Selectors

- [x] 1.1 [REF-12.1] Add `exploreDraft`/`establishDraft` and the mode-aware `draftValid` rule. Verify: `[REF-12.1]` draft builder and validation tests.

## 2. Views

- [x] 2.1 [REF-12.1] Render fog classes, the ID-only unknown label, suppressed owner marks, and location selection in the world map; add `prefill` to the logistics editor. Verify: the map model tests and a clean type-check.
- [x] 2.2 [REF-12.1, REF-13.2] Wire the map action bar (activate/deactivate/explore/establish) and grid suppression of unknown locations in `main.ts`; add the styles. Verify: the app shell builds and `pnpm depcruise` stays clean.

## 3. Verification

- [x] 3.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
