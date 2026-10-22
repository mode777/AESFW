# Tasks

## 1. Move instantiation (design D1)

- [x] 1.1 Move `instantiateContentEntities` to `packages/app/src/content/instantiate.ts`, export it, and update the testkit runners.

## 2. Protocol (design D3)

- [x] 2.1 Extend `WorkerInitRequestDto` with the optional `content` sources and decode them.
- [x] 2.2 Add a `delta.test` case for init content.

## 3. Worker host (design D2, D4, D5)

- [x] 3.1 Create `packages/host-web/src/worker/session-host.ts` with `createSessionHost`.
- [x] 3.2 Wire `packages/host-web/src/worker/index.ts` to the real worker global, clock, fetch, and IndexedDB.

## 4. Client (design D6)

- [x] 4.1 Create `packages/host-web/src/client/index.ts` with `createSessionClient`.

## 5. Tests

- [x] 5.1 `packages/host-web/src/worker/session-host.test.ts` — init/ready, subscribe/snapshot, command/result, step/coalesced delta, catch-up limit, save/load, error boundary, using a fake port and clock. [TDS-21.1]
- [x] 5.2 `packages/host-web/src/client/client.test.ts` — the client sends versioned requests and decodes responses. [TDS-21.1]

## 6. Documentation and verification

- [x] 6.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 6.2 Confirm the design's clarification is recorded.
- [x] 6.3 Run `pnpm verify` and `pnpm trace`; all green, goldens unchanged. [TDS-21.1]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.6 with "✓ archived <date>" in `docs/08`.
