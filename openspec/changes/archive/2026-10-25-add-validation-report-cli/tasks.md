# Tasks

## 1. Message catalogue and report builder

- [x] 1.1 [CONT-15] Create `diagnostics/messages.ts` with `DIAGNOSTIC_MESSAGES` for every catalogue code and `messageFor`; create `formatReport(diagnostics, options)`. Verify: unit tests (bijectivity, interpolation, fallback, ordering, summary).

## 2. CLI wiring

- [x] 2.1 [CONT-15][TDS-21.2] Wire `--design-intent` and `--economic-diagnostics` into `runValidate`; render text/JSON through `formatReport` on both paths; extend the usage string. Verify: CLI tests (design-intent on demand, promoted economic fails, defaults unchanged, JSON report shape).

## 3. Documentation and verification

- [x] 3.1 Run `pnpm trace`; CONT-15 traced. Verify: report.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`. Verify: green, no golden changed.
