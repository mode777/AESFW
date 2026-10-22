# Proposal

## Why

Roadmap 08, M3 item 3.7b (`add-placement-query-host`, capability `host/web`, size S). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Row 3.3 (`add-placement-predicates-and-commands`, archived 2026-10-22) added the read-only `placement_query` at the application layer (`placementQuery` in `packages/app/src/session/placement.ts`) and the `PlacementQueryDto`/`PlacementResultDto` in `@aesfw/protocol`. The next M3 client row 3.8 (`add-client-placement-mode`) needs an authoritative ghost preview (REF-13.2) and talks to the simulation only through `@aesfw/host-web/client`. But the web-worker host `answerQuery` (`packages/host-web/src/worker/session-host.ts`) handles only `entity_detail`, `need_breakdown`, `location_summary`, and `definition_metadata`; it has no `placement_query` branch, so the client cannot obtain an authoritative placement result. This gap-closure change wires that branch so 3.8 can render the ghost from authoritative data. Depends on: `add-placement-predicates-and-commands` (3.3), archived 2026-10-22.

## What Changes

- Add a `placement_query` branch to the worker host `answerQuery`: parse the query payload (definition id, location id, logical transform) into a `PlacementQueryDto`, call the application-layer `placementQuery(content, session.world, session.revision, dto)`, and return `{ placement_result: <PlacementResultDto> }`.
- Handle malformed or unknown payloads by returning `{}`, consistent with the existing query branches.
- Add `@aesfw/host-web` tests covering a valid placement, a rejected placement (with reasons), and a malformed query.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host/web`: the worker session host's `query` handling SHALL also answer `placement_query` by returning the authoritative `placement_result`.

## Impact

- **Packages:** `@aesfw/host-web` extends `src/worker/session-host.ts` (imports `placementQuery` from `@aesfw/app`, adds the `placement_query` branch) and `src/worker/session-host.test.ts` (three tests). `@aesfw/protocol` and `@aesfw/app` are unchanged: the query result is a generic `JsonObject` (`WorkerQueryResultResponseDto`), so no worker DTO change is needed, and `placementQuery`/`PlacementQueryDto`/`PlacementResultDto` already exist. No new runtime dependency is added to any package; `@aesfw/core` is unchanged.
- **Tick phases:** none (the query is read-only over `WorldReader`/the world and compiled content). **Store kinds:** reads the stores the placement predicates already read (`location`, `transform`, `footprint`, `definition`); no new store kind. **Commands/events:** none. **Error/diagnostic codes:** none new; the branch reuses the placement rejection reason codes and returns `{}` for a malformed payload.
- **Verification impact:** new L1 host tests in `packages/host-web/src/worker/session-host.test.ts` for a valid placement, a rejected placement carrying reasons, and a malformed query returning `{}`.
- No **BREAKING** and no **HASH-CHANGING** artifacts: the change adds no protocol field, no save-format change, no versioned-algorithm change, and no golden change, so `PROTOCOL_VERSION` stays `1`.
- **Out of scope (later roadmap rows):** the client placement UI, build palette, keyboard placement, and construction commands (3.8 `add-client-placement-mode`); the core predicates and the application command mapping (3.3, already done); the client location grid (3.7, archived); any DTO, protocol-version, or save-format change.
