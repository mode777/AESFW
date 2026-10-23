# Proposal

## Why

Roadmap 08, M6 item 6.6 (`add-transport-read-model`). The simulation now moves and handles cargo, but a client cannot ask for a unit's order, station, path, cargo, progress, or failure reason. This change adds the PIC-10.4 transport detail read model and its protocol DTO so the inspector and logistics view can display transport state without computing mechanics.

## What Changes

- New protocol DTOs `TransportDetailDto`, `TransportStationDto`, `TransportActionDto`, `TransportCargoDto`, `TransportCargoSlotDto`, and `TransportProgressDto`, with a decoder.
- New app read model `transportDetail(session, entity)` derived from cargo, movement, assignment, order, station cursor, and route state.
- Station cursor failures are stored so the read model can report `failure_reasons`.
- The web host answers `transport_detail` queries.
- Tests for the read model and the protocol decoder.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/projections`: the transport detail read model and its DTO.

## Impact

- **Packages:** `@aesfw/protocol` (DTOs and decoder), `@aesfw/app` (read model and export), `@aesfw/core` (optional station-cursor failure), `@aesfw/host-web` (query answer).
- **Tick phases:** none; the read model is on demand.
- **Store kinds:** none new.
- **Commands/events:** none new.
- **Error codes/diagnostic codes:** none.
- **Protocol/save format:** additive DTO only; protocol version is unchanged. Existing snapshots and goldens are unchanged.
- **Dependencies on archived changes:** 6.4 `add-transport-orders-and-stations` (archived 2026-10-23) and 2.4 `add-read-models` (archived 2026-10-22).

## Out of Scope

- 6.7 `add-golden-logistics-loop`: SCN-02.
- 6.8 `add-client-world-map` and 6.9 `add-client-route-editor`: client rendering and editing.
- Exchange quotes (PIC-10.7) and fog filtering (8.4).
