# Tasks

## 1. Host wiring

- [x] 1.1 Import `placementQuery` from `@aesfw/app` in `packages/host-web/src/worker/session-host.ts` and add a `placement_query` branch to `answerQuery`: validate that `definition_id` is a string, `location_id` is a safe integer, and `logical_transform` carries a two-integer `position` and integer `orientation`; on success call `placementQuery(content, session.world, session.revision, dto)` and return `{ placement_result: result }`; on a malformed payload return `{}`. Verify with `pnpm type-check`.
- [x] 1.2 Confirm the branch reads `session`/`content` without reassigning either, and that no DTO, `PROTOCOL_VERSION`, save-format, or golden artifact changes; verify the existing `packages/host-web` tests still pass.

## 2. Unit tests (one per spec scenario)

- [x] 2.1 [PIC-12.1] A `placement_query` for `test.entity.builder` at `location_id` `1`, `position` `[1, 1]`, orientation `0` against an active `4` by `4` grid location posts a `query_result` whose `result.placement_result.valid` is `true` and whose `reasons` are empty.
- [x] 2.2 [PIC-12.1] The same query at `position` `[0, 0]` at a location whose cell `(0, 0)` is blocked posts a `query_result` whose `result.placement_result.valid` is `false` and whose `reasons[0].code` is `not_buildable`.
- [x] 2.3 [PIC-12.1, TDS-21.1] A `placement_query` missing `definition_id` and `logical_transform` posts a `query_result` whose `result` is `{}`.

## 3. Documentation

- [x] 3.1 Confirm the `docs/08_Implementation_Roadmap.md` row `3.7b` (Change ID `add-placement-query-host`, capability `host/web`, depends on `3.3`) is present and that row `3.8` lists `3.7b` in its Depends-on; record that no amendment to 01–07 is needed.

## 4. Verification

- [x] 4.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.7b with "✓ archived <date>" in `docs/08`.
