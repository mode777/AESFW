# Tasks

## 0. Preconditions

- [ ] 0.1 Confirm that 11.4a–11.4f (`add-client-game-shell` … `add-client-news-and-milestones`), 11.4 (`add-client-polish-and-accessibility`), and 11.6 (`add-client-performance-pass`) are archived and that `openspec/specs/reference/client/spec.md` contains their requirements. Verify with `openspec list --json`, which must not list them as active. If any is unarchived, stop and report.
- [ ] 0.2 Run `corepack enable`, `pnpm install`, and `pnpm exec playwright install chromium` on the machine that will run browser checks. Then confirm that `pnpm exec playwright test opening-flow.spec.ts` fails at step `select-residence`, the D1 baseline, before any code change.

## 1. Protocol: delta wire fields (`@aesfw/protocol`)

- [ ] 1.1 Add optional `entity_creates?: readonly EntityDto[]` and `entity_removals?: readonly number[]` to `SnapshotDeltaDto` in `packages/protocol/src/snapshot.ts`, with TSDoc citing PIC-9.2 and A17. Verify with `pnpm type-check`.
- [ ] 1.2 Decode both fields in `decodeSnapshotDelta` (`codecs/snapshot.ts`). Reuse the snapshot entity decoder for `entity_creates`, require safe integers in `entity_removals`, omit absent keys, and use `protocol.invalid_field` for malformed values. Verify with the tests in 1.4–1.7.
- [ ] 1.3 Change `applyDelta` (`delta.ts`) to remove `entity_removals`, merge `entity_creates` in ascending entity ID, then apply updates. An update field value of `null` deletes the key. Clone created DTOs so the base is never aliased. Verify with the tests in 2.9–2.11.
- [ ] 1.4 Test `[PIC-9.2][A17] a delta with creations and removals decodes` in `codecs/snapshot.test.ts`.
- [ ] 1.5 Test `[PIC-9.2][A17] a delta without the new fields still decodes`, asserting that neither key is present.
- [ ] 1.6 Test `[PIC-9.2][A17] a non-integer removal is rejected` with `protocol.invalid_field`.
- [ ] 1.7 Test `[PIC-9.2][A17] a malformed created entity is rejected` with `protocol.invalid_field`.
- [ ] 1.8 Test `[PIC-3][A17] the protocol version is unchanged`, asserting `PROTOCOL_VERSION === 1`.

## 2. Projection: creation, removal, fields, location (`@aesfw/app`)

- [ ] 2.1 In `projections/diff.ts`, emit `entity_creates` and `entity_removals` (ascending, omitted when empty) and add `transport` to `ENTITY_FIELDS`. Update the TSDoc to cite A17. Verify with the tests in 2.4–2.13.
- [ ] 2.2 In `projections/project.ts` `locationOfEntity`, fall back to `transform.location` after producer, residence, and movement. Verify with the tests in 2.14–2.17.
- [ ] 2.3 Using the projection test helpers, add theme-free fixtures under `fixtures/` for a placeable `test.entity.a`, a placement-and-connectivity-only `test.entity.connector`, and an authored `test.entity.hub`. Verify that `pnpm aesfw validate` passes on the fixture package.
- [ ] 2.4 Test `[PIC-9.2][A17] a placed entity is reported as created` (place, step one tick, diff).
- [ ] 2.5 Test `[PIC-9.2][A17] a removed entity is reported by ID` (`entity_removals` is `[9]`, and there is no `entity_creates` key).
- [ ] 2.6 Test `[PIC-9.2][A17] created entities are ordered by entity ID` (10 before 12).
- [ ] 2.7 Test `[PIC-9.2][A17] a delta without creations or removals omits both lists`.
- [ ] 2.8 Test `[PIC-9.3][A17] discovery reveals entities as creations` (fog on, location `unknown` → `discovered`).
- [ ] 2.9 Test `[PIC-18][A17] a created entity is inserted in ID order` (`[5, 7, 9]`) in `packages/protocol/src/delta.test.ts`.
- [ ] 2.10 Test `[PIC-18][A17] a removed entity is dropped` (`[5]`) in `delta.test.ts`.
- [ ] 2.11 Test `[PIC-18][P-10] a disappearing field is deleted` (`production` removed from entity `4`; the result deep-equals `p_{n+1}`).
- [ ] 2.12 Test `[PIC-9.2][PIC-10.4] a transport state change is reported` (`waiting` → `moving` yields a `transport` update).
- [ ] 2.13 Test `[PIC-9.2] an unchanged transport summary is not re-sent`.
- [ ] 2.14 Test `[PIC-9.1] a placed entity without a producer carries its location` (connector at `[3, 4]`, `location_id: 1`).
- [ ] 2.15 Test `[PIC-9.1] an authored start entity carries its location` (hub at tick `0`).
- [ ] 2.16 Test `[PIC-9.1] an unplaced entity omits the location`.
- [ ] 2.17 Test `[PIC-9.3] fog filters placed entities by their location` (an entity of `test.owner.2` at a location unknown to `test.owner.1`).
- [ ] 2.18 Extend the P-10 property test (`*.prop.test.ts`) so its generator adds, removes, and updates entities and drops optional fields within one step. Name it `[PIC-18][P-10] round-trip holds across creation and removal`, and verify with `pnpm test:property`. Report the seed on failure.
- [ ] 2.19 Run the existing projection, fog (INV-19), and host-web session tests (`pnpm test packages/app packages/host-web`). Verify that they pass unchanged, or that any updated assertion only adds the new `location_id`/delta keys.

## 3. Client foundations: DOM helper and hidden regions

- [ ] 3.1 Audit every `h(`/`svg(` call in `reference/client-web/src` that passes a boolean, including computed booleans, to an `aria-*` or `data-*` key, and convert each to a `'true'`/`'false'` string. List the audited sites in the PR description, and verify with `grep` that no boolean-typed value remains on such keys.
- [ ] 3.2 Change `applyProps` in `dom/h.ts`: `true` writes `''` and `false` is omitted. Verify with the tests in 3.4–3.5.
- [ ] 3.3 Add `[hidden] { display: none !important; }` at the top of `style/base.css`. Verify with the tests in 3.7–3.8.
- [ ] 3.4 Test `[REF-14.1] a false boolean is omitted` in a new `dom/h.test.ts`.
- [ ] 3.5 Test `[REF-14.1] a true boolean is an empty attribute`.
- [ ] 3.6 Test `[REF-12.3] unlocked build entries are enabled` in a build-menu view test (residence enabled, combiner disabled with `aria-disabled="true"`).
- [ ] 3.7 Playwright test `[REF-11] island actions are hidden until an island is selected` in `e2e/smoke.spec.ts`.
- [ ] 3.8 Playwright test `[REF-12.3] a hidden build menu is not displayed` (select an entity, then assert that `build-menu` is not visible).

## 4. Location grid: styling and box

- [ ] 4.1 Add the location-grid CSS section of design Decision 5, plus the hatch `<pattern>` in the grid SVG `<defs>`. Check light and dark themes manually in the browser, and record screenshots in the PR.
- [ ] 4.2 Restructure the `location-grid.ts` markup per design Decision 6. Captions go into one absolutely positioned strip, and the SVG fills the container. Verify with the tests in 4.7–4.8.
- [ ] 4.3 Playwright test `[REF-10.2] entity shapes are not default black` (the hub's computed fill equals the `--land` token).
- [ ] 4.4 Playwright test `[REF-12.2] non-buildable cells differ from buildable ones`.
- [ ] 4.5 Playwright test `[REF-10.3] a status glyph fits inside its cell` (the `C` marker's bounding box is at most one cell).
- [ ] 4.6 Playwright test `[REF-13.3] the ghost shows authoritative validity` (on an invalid result, the stroke is the `--accent` token and is dashed).
- [ ] 4.7 Playwright test `[REF-12.2] the SVG fills the overlay` (400 × 400 px overlay, with the ghost status present).
- [ ] 4.8 Playwright test `[REF-13.3] hover maps to the cell under the pointer` (centre of `(20, 6)` → `placement_query` position `[20, 6]`).

## 5. Placement: entry, drag, camera

- [ ] 5.1 Add the pure `firstAvailableEntry(tabs, activeCategoryKey)` to `selectors/build-menu.ts`, expose the active tab key from the build-menu view, and use the function for `B` and the palette's `mode.build` in `main.ts`. Verify with the tests in 5.4–5.5.
- [ ] 5.2 Gate drag-path start and submission on the connector archetype (`location-grid.ts` pointerdown/pointerup, `main.ts` `submitPath`). Verify with the tests in 5.6–5.7.
- [ ] 5.3 Add the pure `focusLocation(camera, layout, locationId, viewport)` to `selectors/camera.ts`, and call it from `startPlacement`. Verify with the tests in 5.8–5.9.
- [ ] 5.4 Test `[REF-13.2] B selects the first unlocked S1 entry` (a selector test with a locked first ID in the alphabet).
- [ ] 5.5 Test `[REF-13.2] no unlocked entry keeps inspect mode`.
- [ ] 5.6 Test `[REF-13.3] a residence drag places at most one residence` (grid view test with a fake pointer sequence and a command spy).
- [ ] 5.7 Test `[REF-13.3] a connector drag places one plan per cell` (four commands, `(5, 5)`…`(8, 5)` in order).
- [ ] 5.8 Test `[REF-13.5] selecting from far zoom moves to detail` (zoom `1` → `DETAIL_ZOOM`, centred on the island).
- [ ] 5.9 Test `[REF-13.5] selecting at detail zoom keeps the camera` (zoom `3` unchanged).

## 6. HUD: tabs, resource chips, debug lists

- [ ] 6.1 Add `ref.tier.category.s3: 'S3'` and `ref.tier.category.s4: 'S4'` to `reference/content/ref.tier.presentation/localization.en.yaml`. Regenerate with `node reference/client-web/scripts/gen-presentation.mjs`, then run `pnpm exec prettier --write` on the generated file. Verify with `pnpm aesfw validate reference/content/ref.tier.presentation --against reference/content/ref.tier`.
- [ ] 6.2 Replace the single `metadataRequest` flag in `main.ts` with a FIFO of request kinds. Query `definition_metadata` for `resource` on `ready`, and pass the resource metadata to `resourceBar`. Verify with the tests in 6.6–6.8.
- [ ] 6.3 Move `entityList` and `locationList` from the context panel into the Tables window body. Verify with the tests in 6.9–6.10.
- [ ] 6.4 Update `e2e/opening-flow.spec.ts` step `inspect-entity` to click a `grid-entity-*` shape instead of an `entity-item-*` button. Verify that the step passes.
- [ ] 6.5 Test `[PIC-7][REF-12.3] the S3 and S4 tabs are localized` (a build-menu selector over the generated presentation data).
- [ ] 6.6 Test `[TDS-21.1] queries are answered in arrival order` in the `host-web` session-host tests, with two back-to-back `definition_metadata` queries (entity, then resource). This guards the FIFO assumption.
- [ ] 6.7 Test `[REF-11] BM1 stock is shown at the start` (`resourceBar` selector with resource metadata: the BM1 chip shows `60`).
- [ ] 6.8 Test `[REF-11] a placement lowers the chip` (`resourceBar` after the summary's BM1 drops by 36000: the chip shows `54`).
- [ ] 6.9 Test `[REF-15] the context panel has no debug lists` (DOM test on the mounted shell).
- [ ] 6.10 Playwright test `[REF-15] the Tables window lists entities` (`entity-item-13` inside `window-tables`).

## 7. Milestones

- [ ] 7.1 Add `events` to `MilestoneFacts`. Rewrite the residence, producer, and route predicates per design Decision 10, version the storage key to `milestones.v2`, and pass `mirror.events()` from `main.ts`. Verify with the tests in 7.2–7.6.
- [ ] 7.2 Test `[REF-12.6] start entities complete no milestone` (reference-world projection at tick `0`, no events).
- [ ] 7.3 Test `[REF-12.6] a completed residence completes the milestone` (`ConstructionCompleted` naming a `residence_s1`).
- [ ] 7.4 Test `[REF-12.6] an idle transport does not complete the route milestone`.
- [ ] 7.5 Test `[REF-12.6] an assigned transport completes the route milestone` (`order_id: 30`).
- [ ] 7.6 Test `[REF-14.5] stale completions are ignored` (the v1 key holds three IDs, and reading slot `auto` returns `[]`).

## 8. Help window

- [ ] 8.1 Add `'help'` to `WindowKind`, the `?` mapping in `input/keymap.ts`, the `action-window-help` button, the `help.guide.1`–`help.guide.6` client strings (design Decision 11), and a `views/hud/help.ts` view registered with the window host. Verify with the tests in 8.2–8.4.
- [ ] 8.2 Test `[REF-12.4] the help window lists the key map` (DOM test: every `KEY_HINTS` entry is rendered).
- [ ] 8.3 Test `[REF-13.2] the question-mark key toggles help` (`keyAction({ key: '?' })` maps to the help window, and two presses open then close it).
- [ ] 8.4 Test `[REF-15] the help window shows the opening guide` (an ordered list whose first-step text names Residence S1 and the S1 tab).

## 9. Created entities reach the grid, and the opening loop

- [ ] 9.1 Test `[REF-14.2][PIC-9.2] a created entity is drawn` (mirror plus grid DOM test: a delta with `entity_creates` for entity `24` produces `grid-entity-24` and no snapshot request).
- [ ] 9.2 Test `[REF-14.2][PIC-9.2] a removed entity disappears`.
- [ ] 9.3 Add the Playwright test `[REF-18][VER-13.2] a residence is placed and completes in the browser` to `e2e/opening-flow.spec.ts`, per design Decision 13: a normal click on the build entry, hover over candidate cells until the ghost is valid, click, run, and wait for a non-planned state and BM1 `54`. Verify with `pnpm test:e2e` on the verification box, or locally where Chromium runs.
- [ ] 9.4 Run the full existing e2e suite (`smoke`, `opening-flow`, `accessibility`, `determinism`, `performance`). Verify that all pass, with axe reporting no new violations and the performance budgets of REF-14.6 holding.

## 10. Documents

- [ ] 10.1 Apply amendment A17. Add the 04 §9.2 prose and the §9.3 sentence, and the 05 §26 table row, exactly as worded in design Decision 1. Verify by diffing the documents against design.md.
- [ ] 10.2 Apply the 07 clarifications listed in design "Document Changes" (§12.4, §12.6, §13.2, §13.3 steps 1 and 4). Verify by diffing against design.md.
- [ ] 10.3 Add row 11.4g and the exit-criteria sentence to 08 M11a, as worded in design "Document Changes".
- [ ] 10.4 Update the TSDoc on every changed exported function in the pure packages (`diffProjection`, `project`, `applyDelta`, `decodeSnapshotDelta`) to name A17 and the requirement IDs. Verify with `pnpm lint`.

## 11. Verification

- [ ] 11.1 Run the SCN-14 golden and the determinism harnesses (double-run, clone-run, save-continue) via `pnpm test`. Verify that no golden hash changes, since this change is not hash-changing. Any change is a defect to investigate, not to regenerate.
- [ ] 11.2 Run `pnpm test:browser` on the build/verification box. Verify that browser-versus-CLI hashes match.
- [ ] 11.3 Do a manual playtest on `pnpm --filter @aesfw-ref/client-web dev`: place two residences and a connector line with the mouse only, demolish one residence (`X`), and confirm that it disappears without reload. Open Help with `?`, and confirm that the milestones start incomplete. Record the observations in the PR.
- [ ] 11.4 Run `pnpm verify` and `pnpm trace`. Verify that all are green and that the claimed sections have no new untraced requirement IDs.

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive` once review passes; on archive, mark row 11.4g as archived in 08 and append it to the M11a milestone-log entry.
- Re-attempt the M11a human playtest gate on the deployed build and record the playtest note (not produced by an agent).
