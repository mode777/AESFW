# Tasks

## 1. Protocol DTOs

- [x] 1.1 Add `LocationGridDto` (`width`, `height`, `blocked`), `FootprintDto` (`width`, `height`), and `ConnectivityDto` (`role`, `network`, `connected`) to `packages/protocol/src/snapshot.ts`; add the optional `grid?` field to `LocationDto`, `footprint?` to `SpatialDto`, and `connectivity?` to `EntityDto`; export the three new DTOs from `packages/protocol/src/index.ts`. Verify with `pnpm --filter @aesfw/protocol type-check`.
- [x] 1.2 Confirm `PROTOCOL_VERSION` stays `1` and no existing DTO field changes type; verify the existing `packages/protocol/src/version.test.ts` still passes.

## 2. Projection population

- [x] 2.1 Populate `LocationDto.grid` in `locationDto` (`packages/app/src/projections/project.ts`) from `location.grid`, copying `blocked` into a fresh ascending array and omitting the field for an abstract location; verify via the grid projection tests.
- [x] 2.2 Populate `EntityDto.spatial` in `entityDto` from the `transform` and `footprint` stores (`logical_position`, `orientation`, optional `footprint`), omitting it for an entity with no transform; verify via the spatial projection tests.
- [x] 2.3 Populate `EntityDto.connectivity` in `entityDto` from the `connectivityNode` store and `isConnected` (`role`, `network`, `connected`), omitting it for an entity with no node; verify via the connectivity projection tests.

## 3. Delta

- [x] 3.1 Add `connectivity` to `ENTITY_FIELDS` in `packages/app/src/projections/diff.ts` so a connectivity change emits an `entity_update`; verify via the connectivity delta test and the existing P-10 round-trip test.

## 4. Snapshot codec

- [x] 4.1 Decode the optional `grid` (integer `width`/`height`, integer-array `blocked`) in `decodeLocation`, and the optional `spatial` (two-integer `logical_position`, integer `orientation`, optional `footprint`) and `connectivity` (string `role`, string `network`, boolean `connected`) in `decodeEntity` in `packages/protocol/src/codecs/snapshot.ts`, reporting `protocol.invalid_field` at the failing path for a malformed present field and omitting absent ones; verify via the codec tests.

## 5. Unit tests (one per spec scenario)

- [x] 5.1 [PIC-9.1, CONT-6.4] A grid location with `width` `4`, `height` `3`, and blocked `[1, 6]` projects `grid` `{ width: 4, height: 3, blocked: [1, 6] }`.
- [x] 5.2 [PIC-9.1, CONT-6.4] An abstract-capacity location projects `grid` `undefined`.
- [x] 5.3 [PIC-9.3] The same world projected for two actors carries the location `grid` in both (no fog filtering).
- [x] 5.4 [PIC-9.1, TDS-18.4] An entity at `[10, 12]`, orientation `1`, footprint `[2, 3]` projects `spatial` `{ logical_position: [10, 12], orientation: 1, footprint: { width: 2, height: 3 } }`.
- [x] 5.5 [PIC-9.1] An entity with a transform but no footprint projects `spatial.logical_position` present and `spatial.footprint` `undefined`.
- [x] 5.6 [PIC-9.1] An entity with no transform projects `spatial` `undefined`.
- [x] 5.7 [PIC-9.1, GDD-9.2] A requirement node for `test.connectivity.hub` in a location with a hub projects `connectivity` `{ role: 'requirement', network: 'test.connectivity.hub', connected: true }`.
- [x] 5.8 [GDD-9.9] A requirement node in a location with no hub and no provider projects `connectivity.connected` `false`.
- [x] 5.9 [GDD-9.2] A provider node for `test.connectivity.hub` projects `connectivity.role` `'provider'`.
- [x] 5.10 [PIC-9.1] An entity with no connectivity node projects `connectivity` `undefined`.
- [x] 5.11 [PIC-9.2] Flipping an entity's `connectivity.connected` from `false` to `true` emits an `entity_update` with component `connectivity`.
- [x] 5.12 [PIC-9.1, PIC-9.2] `decodeSnapshot` decodes `grid`, `spatial`, and `connectivity` when present and rejects a malformed `grid.blocked`, `spatial.logical_position`, or `connectivity.connected` with `protocol.invalid_field`.

## 6. Documentation

- [x] 6.1 Confirm the `docs/08_Implementation_Roadmap.md` row `3.6b` (Change ID `add-spatial-projection-data`, capability `app/projections`, depends on `3.1, 3.3, 3.4`) and the `3.7` dependency update are present and consistent; record that no amendment to 01–07 is needed.

## 7. Verification

- [x] 7.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.6b with "✓ archived <date>" in `docs/08`.
