# Design

## Context

6.6 is a read-only projection. It does not change simulation behaviour; it exposes state that 6.4 already writes.

## Decisions

### D1 — One read model, no new stores

`transportDetail` reads `cargo`, `movement`, `transportAssignment`, `transportOrder`, `stationCursor`, and `route` directly through the world stores. It does not add a transport summary store. The route's station list comes from the order; the path comes from movement's connection ids.

### D2 — State derivation

- No assignment or order: `unassigned`.
- Movement has more than one leg remaining: `moving`.
- Docked with a cursor: `handling`.
- Otherwise: `waiting`.

### D3 — Cargo representation

Typed cargo is reported one DTO slot per authoritative slot, including empty slots (no `resource_id`). Unrestricted and per-resource cargo are reported one DTO slot per entry, in ascending resource-handle order. The DTO is display data; it does not decide load or unload behaviour.

### D4 — Failure reason storage

`StationCursor` gains an optional `failure` key. 6.4's `applyFailure` writes it for `wait`, `retry`, and `retain`; advancing or resetting the cursor omits it. This is additive and only appears after a failure, so existing goldens are unchanged.

## Phases and stores

No phase changes. The read model is on demand. The web host answers `{ kind: 'transport_detail', entity_id }`.

## Ordering and rounding

Stations and actions follow the order's order. Cargo slots follow ascending slot index or resource handle. No arithmetic beyond id lookup.

## Amendments

No amendment to 01–04 is required.

## Risks

- The DTO does not include trade price limits or establishment targets; those are later rows.
- `connection_path` is the current leg's connection ids, not the entire route's planned path. This matches the PIC-10.4 "connection path" wording and avoids storing a redundant full path.
