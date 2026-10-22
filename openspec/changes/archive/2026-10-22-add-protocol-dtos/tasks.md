# Tasks

## 1. Types and version (design D1–D3, D5–D6)

- [x] 1.1 Create `version.ts` (`PROTOCOL_VERSION = 1`), `result.ts` (`DecodeResult`, `ok`, `err`), and `errors.ts` (`ProtocolError`, the v1 code constants).
- [x] 1.2 Create `scalars.ts` and the DTO modules `commands.ts`, `snapshot.ts`, `events.ts`, `metadata.ts`, `readmodels.ts`, `worker.ts` with the 04 wire shapes.
- [x] 1.3 Re-export all types and codecs from `index.ts`.

## 2. Codecs (design D4)

- [x] 2.1 Create `codecs/guards.ts` (object/integer/string/string-array guards and an error collector).
- [x] 2.2 Create `codecs/commands.ts`, `codecs/snapshot.ts`, `codecs/events.ts`, `codecs/metadata.ts`, `codecs/readmodels.ts`, `codecs/worker.ts` returning `DecodeResult`s.

## 3. Tests

- [x] 3.1 `src/version.test.ts` — `PROTOCOL_VERSION` is `1`. [TDS-22]
- [x] 3.2 `src/codecs/commands.test.ts` — envelope and result nominal, missing field, negative revision. [PIC-12, PIC-13]
- [x] 3.3 `src/codecs/snapshot.test.ts` — snapshot nominal, missing tick, delta nominal. [PIC-9]
- [x] 3.4 `src/codecs/events.test.ts` — known event, unknown type, missing sequence. [PIC-11]
- [x] 3.5 `src/codecs/metadata.test.ts` and `readmodels.test.ts` — metadata nominal, entity detail missing id, need breakdown nominal. [PIC-4, PIC-10.1–10.3]
- [x] 3.6 `src/codecs/worker.test.ts` — command request, unknown kind, version mismatch, non-integer version. [TDS-21.1]
- [x] 3.7 `src/codecs/errors.test.ts` — non-object input yields `protocol.invalid_field`. [TDS-22]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [TDS-22]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.1 with "✓ archived <date>" in `docs/08`.
