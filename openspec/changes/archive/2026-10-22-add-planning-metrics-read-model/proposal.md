# Proposal

## Why

Roadmap 08, M4 item 4.5 (`add-planning-metrics-read-model`). Supported population is the genre's primary planning currency (GDD-3.8) and the framework must make it computable for every resource flow (GDD-10.6). With production, needs, and population in place, the data exists but nothing derives the planning figures; this change delivers the PIC-10.5 read model in `@aesfw/app/readmodels/planning.ts` (TDS-18.5) and the framework half of SCN-18.

## What Changes

- New planning read model `planningMetrics(session, actor)` returning a `PlanningDto`:
  - For every resource consumed by a `resource_consumption` need, per owner scope and per location scope: the nominal net production rate (producer outputs − recipe inputs, per tick, computed as exact rationals), and per consuming tier the per-capita demand (need quantity × consumption factor), the supported population (`floor(net_rate / per_capita)`), the current consuming population, and a coverage ratio in permille.
  - Chain metrics per produced resource: stages grouped by entity definition covering the producers that output or consume the resource, each with entity count, integer ratio across stages, per-tick output of the chain resource, total footprint, per-interval maintenance, and capability demand; plus the chain's total output rate.
- `PlanningDto` and a `decodePlanning` codec in `@aesfw/protocol`.
- The SCN-18 framework fixture: a theme-free chain whose supported population is asserted against a hand calculation.

## Capabilities

### New Capabilities

### Modified Capabilities

- `app/projections`: ADDED requirement — the planning metrics read model.
- `app/protocol`: ADDED requirement — `PlanningDto` shapes and the `decodePlanning` codec.

## Impact

- **Packages:** `@aesfw/app` (`readmodels/planning.ts` with the exact-rational helpers), `@aesfw/protocol` (DTO types, codec).
- **Tick phases:** none — a derived read model over nominal rates. **Store kinds:** reads `producer`, `residence`, `populationGroup`, `maintenance`, `owner`, `footprint`.
- **Commands/events/error codes/diagnostics:** none.
- **Protocol:** additive new read-model DTO and codec (PIC-10.5). **Save format:** untouched. **Not hash-changing.**
- **Dependencies on archived changes:** 2.4 `add-core-read-models` (archived 2026-10-22), 1.13 `add-population-growth` (archived 2026-10-21), 4.2 (archived) for maintenance stages.

## Out of Scope

- Utilization- and throttle-adjusted rate fields (M5 `add-throughput-allocation`; TDS-18.5 reserves separate fields).
- Host worker exposure and the client planning view (4.7 `add-client-economy-and-planning` owns those surfaces).
- The reference half of SCN-18 on GDD Appendix B content (M11).
- Multi-hop chain resolution beyond direct consumers of the chain resource (refined with reference content in M11).
