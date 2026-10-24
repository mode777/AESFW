# Proposal

## Why

Roadmap 08, M8 item 8.6 (`add-client-fog-and-expansion`). REF-12.1 gives the world map fog states and expansion commands — unknown locations render a dashed outline with their ID only, and the map starts explore or establish orders and activates or deactivates locations — but the client renders every location uniformly, has no map selection, and cannot create `explore` or `establish` orders. This change completes the M8 client slice on top of 8.4's authoritative filtering, finishing the M8 demo path.

## What Changes

- The world map renders fog states: an unknown location shows a dashed outline and its ID (no attributes exist to render, PIC-9.3); clicking a location selects it and opens a map action bar.
- The action bar issues `ActivateLocation`/`DeactivateLocation` for a known location and opens the logistics drawer with a prefilled explore or establish order for any location.
- The logistics editor gains `prefill`, and the draft model validates the action-less single-station drafts that `explore`/`establish` modes carry; new pure draft builders `exploreDraft`/`establishDraft`.
- The location grid skips locations the snapshot hides (an unknown location has no grid data to render).
- Owner marks and knowledge styling: discovered locations are accented, established ones bold, unknown ones dashed and dim.

## Capabilities

### Modified Capabilities

- `reference/client`: world-map fog rendering, map selection and commands, explore/establish order flows.

## Impact

- **Packages:** `reference/client-web` only (selectors, views, styles); the client still imports only `@aesfw/protocol` and `@aesfw/host-web/client`.
- **Tick phases/store kinds/commands/events:** none new — `CreateTransportOrder` (`mode: explore|establish`), `ActivateLocation`, and `DeactivateLocation` all exist.
- **Protocol/save format:** unchanged. **HASH-CHANGING:** no.
- **Dependencies on archived changes:** 8.4 `add-fog-filtered-projections` (archived 2026-10-24), 6.9 `add-client-route-editor` (archived 2026-10-23).

## Out of Scope

- Region-cluster map layout (REF-12.1's deterministic grouping): the id-grid layout stays until the reference content needs it (M11a).
- Establishment cost preview on the map action bar: the logistics drawer shows the draft; a cost tooltip is polish for M11a's client polish row.
- Playwright fog flows: CI's L10 stage covers the live browser; the selector tests here cover the pure model.
