# Proposal

## Why

Roadmap 08, M2 item 2.4 (`add-core-read-models`, capability `app/projections`, size M). The client inspector and tables of rows 2.8–2.9 read definition metadata and per-entity, per-location, and per-need read models. This row delivers those read models over the projection layer, retiring R-07 (the presentation contract unworkable in practice). Depends on: `add-projections-and-deltas` (2.3) — archived 2026-10-22.

## What Changes

- Add `@aesfw/app/readmodels` with the M2 read models of PIC-10.1–10.3: `definitionMetadata`, `entityDetail`, `locationSummary`, and `needBreakdown`.
- Read models are pure functions over the world and the registry; derived values are never written back (ARCH-8.2).
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### Modified Capabilities

- `app/projections`: extended with the M2 read models.

## Impact

- **Packages:** `@aesfw/app` gains `src/readmodels/**`.
- **Tick phases:** none. **Commands:** none. **Events:** none. **Error codes:** none new.
- **Out of scope:** the remaining read models — transport detail, planning metrics, owner economy, exchange quotes (6.6, 4.4, 4.5, 9.3); fog filtering (8.4).
- **Verification impact:** `pnpm test` gains read-model tests; goldens unchanged.
