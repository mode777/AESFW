# Tasks

## 1. Pure modules (design D2–D4)

- [x] 1.1 Create `src/store/signals.ts` with `signal` and `computed`.
- [x] 1.2 Create `src/store/mirror.ts` with `createMirror`.
- [x] 1.3 Create `src/store/view-state.ts` with `createViewState`.
- [x] 1.4 Create `src/i18n/index.ts` with `createI18n`.
- [x] 1.5 Create `src/dom/h.ts` helpers.

## 2. Shell (design D1, D5, D6)

- [x] 2.1 Create `src/views/top-bar.ts` and `src/views/debug-overlay.ts`.
- [x] 2.2 Create `src/session/client.ts` wiring `@aesfw/host-web/client`.
- [x] 2.3 Create `src/main.ts`, `index.html`, `vite.config.ts`, `src/style/tokens.css`, and `src/style/base.css`.
- [x] 2.4 Add `vite` as a devDependency.

## 3. Tests

- [x] 3.1 `src/store/signals.test.ts` — computed follows source, same-value set does not notify. [REF-14.1]
- [x] 3.2 `src/store/mirror.test.ts` — matching delta applied, mismatched delta requests snapshot. [PIC-18]
- [x] 3.3 `src/i18n/i18n.test.ts` — missing-key fallback, grouping. [REF-14.4]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green. [REF-14]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.8 with "✓ archived <date>" in `docs/08`.
