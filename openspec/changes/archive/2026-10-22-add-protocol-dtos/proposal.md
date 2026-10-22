# Proposal

## Why

Roadmap 08, M2 item 2.1 (`add-protocol-dtos`, capability `app/protocol`, size M). M2's goal is that the basic loop runs in a Web Worker and is observable and controllable through a minimal browser client that uses only the protocol. That client can exist only once the presentation contract of 04 is expressed as typed, validated wire DTOs. This row retires R-07 (the presentation contract unworkable in practice): it fixes the exact wire shapes and the boundary validation before any projection, session, or client is built on them. Depends on: `add-purity-and-boundary-guardrails` (0.2) — archived 2026-10-21.

## What Changes

- Populate `@aesfw/protocol` with the DTO types of 04 and their pure codecs, protocol version 1:
  - command envelope and command result (PIC-12, PIC-13);
  - full snapshot and snapshot delta, including owner, location, entity, inventory, production, spatial, and balance sub-DTOs (PIC-9);
  - domain event (PIC-11);
  - definition metadata (PIC-4);
  - the M2 read models: entity detail, location summary, need breakdown (PIC-10.1–10.3);
  - worker request/response messages carrying `protocol_version` and a `kind` (TDS-21.1, TDS-22).
- Add boundary codecs that validate incoming DTOs and return `Result`-style outcomes without importing any other package (TDS-4.3 rule 3, TDS-22).
- Establish `PROTOCOL_VERSION = 1` and a stable protocol error-code catalogue.
- No **BREAKING** changes (the protocol starts at version 1); no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `app/protocol`: the versioned wire DTOs and their boundary codecs.

## Impact

- **Packages:** `@aesfw/protocol` gains `src/**` modules and tests; it keeps zero runtime dependencies (TDS-4.2, TDS-4.3 rule 3). `@aesfw/app` and `@aesfw/host-web` consume the DTOs in later M2 rows.
- **Tick phases:** none. **Commands:** the `CommandEnvelopeDto` type names the command types owned by later rows; no command is executed here. **Events:** the `EventDto` type only. **Error codes:** a new protocol decode-error catalogue (`protocol.*`).
- **Out of scope:** the projection builders, session, command gateway, read-model computation, save/load, and worker host (rows 2.2–2.6); placement query/result DTOs and read models beyond entity detail, location summary, and need breakdown (rows 3.3 and 4.4/4.5); fog filtering (row 8.4).
- **Verification impact:** `pnpm test` gains protocol codec tests; `pnpm type-check` covers the DTO types.
