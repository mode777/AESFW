# Tasks

## 1. Protocol

- [x] 1.1 [PIC-10.7] Add `ExchangeGoodQuoteDto` and `ExchangeQuotesDto` plus the `decodeExchangeQuotes` codec; export both. Verify: `[PIC-10.7]` codec round-trip tests.

## 2. Read model

- [x] 2.1 [PIC-10.7, ARCH-14.5] Implement `exchangeQuotes` (prices, bases, in-window volume, recovery estimate, region, currency, revision) in `@aesfw/app`. Verify: `[PIC-10.7]` read-model tests (quotes, recovery estimate, non-exchange null).
- [x] 2.2 [PIC-9.3, ARCH-8.3] Gate the read model on the actor's knowledge of the exchange location, honoring the `fog` session setting. Verify: `[PIC-9.3]` fog tests.

## 3. Host

- [x] 3.1 [TDS-21.1] Route the additive `exchange_quotes` query kind in the worker host. Verify: host query test.

## 4. Documentation and verification

- [x] 4.1 Record the D1–D4 decisions; confirm docs 04 needs no amendment (behavior matches PIC-10.7 as written). Verify: no unintended document diff.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, PIC-10.7 traced, no new untraced requirement IDs in the claimed sections. Verify: command output.
