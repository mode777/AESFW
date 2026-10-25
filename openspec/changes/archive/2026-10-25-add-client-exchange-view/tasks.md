# Tasks

## 1. Selector

- [x] 1.1 [REF-12.4] Add `selectors/exchange.ts`: `tradeDraft` (pure RouteDraft builder from a quotes DTO, resource, direction, and quantity) and the exchange-entity/quotes view-model helpers. Verify: `[REF-12.4]` selector tests.

## 2. View and wiring

- [x] 2.1 [REF-12.4, PIC-10.7] Add the exchange drawer view: per-exchange quote rows (price versus base, volume, recovery), empty state, and buy/sell shortcut buttons. Verify: view smoke test.
- [x] 2.2 [REF-12.4] Wire the drawer into `main.ts`: definition-metadata exchange discovery, per-entity quotes queries, query-result rendering, the `X` drawer key, and the prefill-and-switch trade shortcut. Verify: type-check and existing client tests.

## 3. Documentation and verification

- [x] 3.1 Record the D1–D3 decisions; confirm the client imports only `@aesfw/protocol` and `@aesfw/host-web/client`. Verify: dependency rules.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`; all green, REF-12.4 already traced. Verify: command output.
