# Proposal

## Why

Roadmap 08, M2 item 2.5 (`add-save-load`, capability `app/persistence`, size M). M2's exit criteria require that save → reload → continue works, and R-10 (save compatibility breaks repeatedly) is retired by a versioned save format. Depends on: `add-session-and-command-gateway` (2.2) — archived 2026-10-22.

## What Changes

- Add `@aesfw/app/persistence`: `save(session): SaveDocument` and `load(content, doc): Result<SessionState, Diagnostic[]>`.
- The save document follows TDS-19.1 (header, canonical state, session tail) and is canonical JSON (TDS-19.3).
- Loading compares the configuration checksum and package versions and returns a `content_mismatch` diagnostic on mismatch.
- Extend the save's `session` object with the session `settings` (additive to TDS-19.1) so `load(content, doc)` can restore a usable session.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `app/persistence`: the save document and the save/load functions.

## Impact

- **Packages:** `@aesfw/app` gains `src/persistence/**`.
- **Tick phases:** none. **Commands:** none. **Events:** none. **Error codes:** the `content_mismatch` diagnostic.
- **Out of scope:** migrations and ID aliases (12.1); replay documents (12.2); the IndexedDB store (2.6).
- **Verification impact:** `pnpm test` gains save/load tests, including save-continue determinism (SCN-13 basic).
