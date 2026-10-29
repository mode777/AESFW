# Design: fix-client-playability

## Context

See `proposal.md` for motivation and the defect table (D1–D15); this document refers to those IDs. Facts that shape the approach:

- The host computes deltas in the application layer (`diffProjection` in `@aesfw/app`). The worker publishes the first projection as a snapshot and every later one as a delta (`session-host.ts` `publish`). Snapshot messages carry no events, so forcing snapshots on entity-set changes would drop events from the news rail and log. The user chose to extend the delta instead (amendment A17).
- `applyDelta` lives in `@aesfw/protocol`, because the client may import only the protocol (TDS-4.3 rule 4).
- Every placed entity has a `transform` component whose `location` is set at placement time (`sim/placement/apply.ts`). That includes authored start entities and entities without producer, residence, or movement components.
- The host answers `query` requests synchronously in arrival order (`session-host.ts` `handle`, `case 'query'`).
- The client's grid is an HTML overlay positioned over the island and sized to the island's screen size. Its SVG uses a `viewBox` in cell units, so every stroke and font size is in cells unless stated otherwise.
- `pnpm test:browser` and Playwright flows normally run on the build/verification box (AGENTS.md). A Windows workstation with `playwright install chromium` can run them too.

This change touches no tick phase, `phase-NN-*.ts` system module, or store write. The projection reads the `transform` store read-only.

## Goals / Non-Goals

**Goals:**
- Make the opening loop playable with normal mouse and keyboard input: select, preview, place, watch construction complete, inspect, and see stock change.
- Close the delta contract gap for entity creation and removal, field disappearance, and transport summaries, with P-10 extended to cover them.
- Keep every fix observable through a test: L1 unit tests for selectors, DOM helpers, delta, and codec; property tests for P-10; and Playwright smoke checks for CSS-dependent behaviour.

**Non-Goals:**
- Reworking the news rail wording, the context-panel information architecture, or the world-canvas look beyond grid legibility.
- Any simulation, balancing, or golden change.
- A tutorial system with state. The Help window is static text.

## Decisions

### 1. Delta carries `entity_creates` and `entity_removals` (amendment A17)

`diffProjection(prev, next)` builds `Map<entity_id, EntityDto>` for `prev` once, which it already does. It walks `next` in its order, which is ascending entity ID (`reader.entityIds`). Entities missing from the map go to `entity_creates`. A second pass over `prev` collects IDs missing from `next` into `entity_removals`. Both lists are ascending by construction and are omitted when empty. The `owner_updates` and `location_updates` pattern already works this way, so a delta for an unchanged entity set is byte-identical to today's.

`applyDelta` order: clone, remove the IDs in `entity_removals`, merge `entity_creates` into the ascending entity array (a two-pointer merge over two sorted lists), apply `entity_updates`, apply inventory, owner, and location updates. Removal comes before insertion, so an ID that is both removed and created in one delta, which cannot happen because IDs are not reused within a session, would still resolve to the created DTO. Updates come after creation, but `diffProjection` never emits an update for a created entity.

Alternatives considered:
- *A full snapshot whenever the entity set changes.* This needs no contract change, but it drops that publication's events unless the snapshot message also grows an `events` field, which is itself a contract change. It also costs a full snapshot per placement. The user rejected it.
- *Bumping `PROTOCOL_VERSION` to 2.* The fields are optional and additive, and the existing decoder ignores unknown keys. The user chose to keep `1`.

**A17 (05 §26 row, and 04 §9.2 text to add after the YAML block):**

> | A17 | 04 §9.2 | A delta MAY carry `entity_creates` (whole entity entries, ascending entity ID) for entities absent from the base, and `entity_removals` (entity IDs, ascending) for entities absent from the new projection. Both are omitted when empty. Applying a delta removes, then inserts in ascending entity ID, then applies updates. An entity update whose field value is `null` removes that field. | Without them a client cannot learn about placed, constructed, demolished, or newly visible entities except by resynchronizing; the reference client never showed a placed building. |

The 04 §9.2 prose gains: "Entities created since the base revision are sent whole in `entity_creates`; removed entities are listed by ID in `entity_removals`. An `entity_updates` field value of `null` means the field is no longer present. (Amended by A17, 05 §26.)" The 04 §9.3 sentence about `LocationDiscovered` gains: "Entities that become visible are delivered in `entity_creates`."

### 2. A `null` field value deletes the key

`diffProjection` already writes `nextRecord[field] ?? null` for a changed field. `applyDelta` now deletes the key when the value is `null`, instead of storing it. No projected entity field is legitimately `null`, because optional fields are omitted (exactOptionalPropertyTypes and the projection's spread pattern), so this is unambiguous. `transport` joins `ENTITY_FIELDS`. A transport whose summary disappears is the first realistic case, which is why both changes land together.

### 3. `location_id` falls back to the placement transform

`locationOfEntity` keeps its order (producer, then residence, then movement) and adds `transform.location` as a final fallback. The order keeps a moving transport reporting its movement location, as the existing "Snapshot transport summary" requirement requires. For placed producers and residences, the earlier sources equal the transform location anyway. The fog filter in `project` already drops entities whose `location_id` names an `unknown` location, so the fallback also tightens fog, which is the correct behaviour.

### 4. Boolean attributes in `h`/`svg`

In `applyProps`, `typeof value === 'boolean'` writes `''` for `true` and skips `false`. Before changing it, audit every `h(` and `svg(` call site that passes a boolean, including variables typed `boolean`, to an `aria-*` or `data-*` key, and convert those values to `'true'`/`'false'` strings. `grep` for boolean literals found none at the time of writing, but computed values such as `disabled: entry.locked` and `disabled: action.disabled === true` must be reviewed one by one. TypeScript cannot catch this, so the audit is a task.

Alternative: an allow-list of HTML boolean attributes. That is more code, and a missed attribute fails silently. The type-based rule is simpler and correct for every HTML boolean attribute.

### 5. CSS

- A global `[hidden] { display: none !important; }` at the top of `base.css`. `!important` is deliberate: the `hidden` state must win over any component display mode (D2).
- Grid layers, all in `base.css` under a `/* --- Location grid (REF-12.2) --- */` section:
  - `.grid-bg` sets the buildable fill (`--land`). `.grid-cells` (the blocked path) uses `--rule` plus a hatch `pattern` defined once in the grid SVG `<defs>`.
  - `.grid-rules` uses `stroke: var(--rule)` and `vector-effect: non-scaling-stroke` at `stroke-width: 0.5px`, so rules stay hairlines at every zoom.
  - `.grid-entity > *` uses `fill: var(--land)`, `stroke: var(--ink)`, and a non-scaling `stroke-width: 1.5px`. `.grid-entity .inner` and `.working-area` have no fill and an `--ink-2` stroke. `.state-planned`/`.dashed` use `stroke-dasharray: 3 2` with non-scaling strokes. `.state-blocked` uses an `--accent` stroke, `.state-idle` the `--ink-3` stroke, and `.progress` an `--ink-2` fill.
  - `.glyph` and `.status-marker-glyph` use `font-size: 0.7px` (cell units), `font-family: var(--font-num)`, and `fill: var(--ink)`. `.status-marker-bg` uses `fill: var(--paper)`, `stroke: var(--accent)`, and a non-scaling stroke.
  - `.placement-ghost > *` has no fill, a non-scaling `stroke-width: 2px`, and `stroke-dasharray: 4 3`. `.ghost-valid` and `.ghost-unknown` use `--ink`, and `.ghost-invalid` uses `--accent`.
  - Overlays: `.grid-suitability` gets a low-opacity `--role-primary` fill, `.grid-connectivity` an `--ink-3` stroke (`connected` uses `--role-establishment`), `.grid-coverage` a dashed `--focus` stroke, and `.grid-throughput-throttled` an `--accent` stroke. Gauge classes use the same tokens.
- Dark theme works through the same tokens. No per-theme grid rules are needed.

### 6. Stable grid box (D4)

The `.location-grid` container becomes `position: relative; width: 100%; height: 100%`. `.grid-svg` is `display: block; width: 100%; height: 100%`. The legend, status, and ghost-status paragraphs become one absolutely positioned caption strip at `bottom: 100%` (above the island), with `pointer-events: none`. The pointer-to-cell mapping in `location-grid.ts` already divides by the SVG's bounding box; once the box is the whole square overlay, the mapping is exact. No JavaScript change is needed beyond markup grouping.

### 7. Placement entry, drag paths, and camera

- A new pure selector, `firstAvailableEntry(tabs, activeCategoryKey)`, lives in `selectors/build-menu.ts`. It returns the first unlocked entry of the active tab, else the first unlocked entry in tab order, else `null`. The `B` handler and the palette's `mode.build` use it instead of `palette[0]`. The build-menu view exposes its active tab key so the handler can pass it in.
- Drag paths: `submitPath` and the grid's `pointerdown` path start run only when `archetypes.get(definitionId) === 'connector'`. Otherwise `pointerdown` records nothing, and the existing `click` confirms a single placement at the cursor cell.
- Camera: `startPlacement` calls a new pure helper, `focusLocation(camera, layout, locationId, viewport)` in `selectors/camera.ts`. When `camera.zoom < DETAIL_ZOOM`, it returns `{ x: island.x, y: island.y, zoom: DETAIL_ZOOM }`, passed through `clampCamera`. Otherwise it returns `camera` unchanged. The camera is non-authoritative view state, so floating point is acceptable here (04 §16).

### 8. Construction resource chips

The client issues a second metadata query, `definition_type: 'resource'`, on `ready`. The single `metadataRequest` flag becomes a FIFO of outstanding metadata request kinds (`'entity' | 'resource' | 'exchange'`). Each `definition_metadata` result pops the head. This is correct because the host answers queries synchronously in arrival order (see Context). `resourceBar` receives the resource metadata instead of the entity metadata. Its `CONSTRUCTION_TAG` filter is unchanged, and chip labels come from the i18n table (`BM1`) rather than `presentation_key`.

### 9. Debug lists move to the Tables window

`entityList` and `locationList` are appended to the Tables window body after the inventory and population tables, and removed from the context panel. Test IDs are unchanged. The existing opening-flow step `inspect-entity` changes to click a `grid-entity-*` shape, which is the real player path.

### 10. Milestones

- `MilestoneFacts` gains `events: readonly EventDto[]`, which is the mirror's event log.
- `residence`: some `ConstructionCompleted` event names a subject whose projected `definition_id` contains `residence`. `producer`: the same, for a subject with `production`. `route`: some entity has `transport.order_id !== undefined`. `population` and `advancement` are unchanged.
- The mirror's event log resets on snapshot replacement, such as a load. Completed milestones are persisted when they first become true, so a later reset does not un-complete them.
- The storage key becomes `${STORAGE_KEY}:milestones.v2:${slot}`. The v1 key is ignored and not migrated, because its contents are known-wrong. The key is not deleted either, because view settings live under `STORAGE_KEY` and must not be touched.

### 11. Help window

- `WindowKind` gains `'help'`. The action bar gets a `?` button (`action-window-help`), and `keyAction` maps `?` to `{ kind: 'window', id: 'help' }`. `?` is not otherwise bound, and on common layouts it arrives as `key === '?'`.
- The content is a static view: a definition list built from `KEY_HINTS`, then an ordered opening guide from `CLIENT_STRINGS` keys `help.guide.1` to `help.guide.6`. The guide is qualitative and refers players to on-screen numbers (build-menu costs, the residence advancement checklist). It does not restate content values, so it cannot drift from `ref.tier`. Draft text:
  1. Pause with Space, then press Home to centre on your start location.
  2. Open the S1 tab, choose Residence S1, and click a cell where the preview says "valid". Construction finishes on its own.
  3. Residents supply the AK1 workforce refiners need. A "C" marker on a building means missing capability: house more residents.
  4. Keep C1 and C2 (sustenance) and BM1 (construction) in stock; the resource bar shows your stock and the build menu shows costs.
  5. Open Statistics (E) for income and expenses, and Planning (P) for supply versus demand.
  6. Grow the S1 population to unlock combiners. Full, satisfied residences then advance to S2; select a residence to see its checklist.

### 12. Presentation localization

Add `ref.tier.category.s3: 'S3'` and `ref.tier.category.s4: 'S4'` to `localization.en.yaml`. Then regenerate `presentation.generated.ts`. The generator's raw output is not Prettier-formatted, and committing it unformatted fails `pnpm format:check`, so the task runs Prettier on the generated file. Making the generator emit formatted output is a follow-up (Open Questions).

### 13. Opening-flow e2e

The opening-flow test moves the pointer over candidate cells in a fixed list, row-major from the area right of the authored start layout, until `placement-ghost[data-validity="valid"]`. The attempt count is bounded, and the test fails with the last reasons after that. Validity is authoritative, so the test does not encode the seeded mask. It then clicks, presses Space to run, waits until `grid-entity-<new>` has `data-state` other than `planned` (at most 15 simulated ticks at ×1, about 2 s with the 100 ms tick), and asserts the BM1 chip value. Candidate cells are a test fixture, not client logic.

## Document Changes

Clarifications of 07 (no amendment ID, because they refine 07 without contradicting 01–04):

- **07 §12.4 table**, new row after "Log": `| Help | Keyboard map and a short opening guide (static client text) | — | — |`
- **07 §12.6, milestone tracker bullet**, append: "Milestones that name a player action complete on evidence of that action: a construction milestone needs a `ConstructionCompleted` event for a matching entity, and a route milestone needs a transport with an assigned order. Authored start entities never complete a milestone."
- **07 §13.2 key table**, new row: `| ? | Open or close the Help window |`. The `B` row becomes `| B | Open the build menu (place mode) with the first unlocked entry of the active tab |`.
- **07 §13.3 step 1**, append: "Choosing an entry while the camera is further out than detail level centres the viewed location at detail level."
- **07 §13.3 step 4**, append: "Other definitions never place along a drag; a press and release places at most one plan."

Amendment A17 (04 §9.2, §9.3; 05 §26) as worded in Decision 1.

08:

- **M11a table**, new row after 11.4: `| 11.4g | \`fix-client-playability\` | reference/client | playability repair: delta entity creation/removal (A17), placed-entity location, boolean attributes, hidden regions, grid styling, placement entry/camera/drag, resource chips, milestones, help window, browser opening loop | REF-12, REF-13, PIC-9.2, PIC-18 | 11.4, 11.6 | M |`
- **M11a exit criteria**, append: "The opening flow places a building through normal input and observes it complete (11.4g)."
- **§11 milestone log, M11a entry**, append 11.4g to "Delivered" when archived.

## Risks / Trade-offs

- [The boolean-attribute change flips an `aria-*`/`data-*` attribute some caller passed as a boolean] → The audit task covers every such call site, and the existing selector, a11y (axe), and e2e tests catch regressions in roles and states.
- [An older client connected to a newer host ignores `entity_creates`] → The client and host ship together in one bundle. The protocol version is unchanged by the user's decision, which is recorded in A17.
- [The `null`-deletes-field rule hides a genuine `null` value] → No entity field in 04 §9.1 is nullable, and the codec rejects `null` where a typed field is expected. The rule is documented in A17.
- [The FIFO metadata routing depends on in-order query answers] → This holds for the synchronous host. A unit test in `session-host` asserts ordering for two back-to-back queries. A future asynchronous host would need correlation IDs, which is noted as an open question.
- [Milestone storage reset surprises a returning player] → Only the five opening milestones reset, and they were wrong. View settings are untouched.
- [The e2e depends on finding a valid cell] → Candidate cells cover the empty area right of the authored layout, which the reserved-mask rule keeps seed-independent for authored cells. Validity is still checked authoritatively.
- [Performance budget, 11.6 / REF-14.6] → Delta work stays O(n) over entities with one extra pass. Client work changes only on entity-set changes, and the list signature already gates re-rendering. The performance spec stays as is and must still pass.

## Migration Plan

No data migration. Saves are unaffected because projections are not saved. Client milestone storage moves to the v2 key (Decision 10). Rollback is a revert: an older client ignores the new delta fields.

## Open Questions

- Should `gen-presentation.mjs` format its own output so a client build never dirties the tree? This is deferrable tooling and does not change the specs.
- Should query responses carry a correlation ID, so a future asynchronous host does not depend on FIFO ordering? This is deferrable, because no asynchronous host is planned.
