# Tasks

## 1. Protocol

- [x] 1.1 [PIC-9.2] Add additive `location_updates` to `SnapshotDeltaDto`, decode it in the delta codec, and merge it in `applyDelta`; decode `knowledge` in `decodeLocation`. Verify: `[PIC-9.2]` delta round-trip tests.

## 2. Projection

- [x] 2.1 [PIC-9.3, ARCH-8.3] Gate `locationDto` and the projection's entity list on the actor's knowledge, honoring the `fog` session setting. Verify: `[PIC-9.3]` unknown-location, foreign-entity, and fog-disabled tests.
- [x] 2.2 [PIC-9.2, PIC-9.3] Add location-level diffing to `diffProjection`. Verify: `[PIC-9.3]` discovery re-send and unchanged-location tests.

## 3. Read models and events

- [x] 3.1 [PIC-10.1, PIC-10.2, PIC-10.5] Add the actor parameter and knowledge gates to entity detail, need breakdown, transition eligibility, location summary, and planning metrics. Verify: per-read-model `[INV-19]` tests.
- [x] 3.2 [ARCH-8.3, TDS-17] Add `visibleEvents` and apply it in the host-web publish path; wire `session.settings.actor` into the read-model queries. Verify: `[INV-19]` event-family tests and host publish tests.

## 4. Property

- [x] 4.1 [INV-19, P-09] Add the generated-world fog property covering projection, delta, read models, and filtered events. Verify: `[P-09]` property test.

## 5. Documentation and verification

- [x] 5.1 Record the DTO-shape and boundary clarifications (design); confirm `docs/08` needs no change beyond archiving. Verify: no unintended document diff.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
