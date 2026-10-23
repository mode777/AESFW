# Proposal

## Why

Roadmap 08, M7 item 7.6 (`add-services-and-coverage-needs`). Every need is currently satisfied by resource flow (`resource_consumption`, `resource_availability`), so GDD-3.6's second decision geometry — spatial coverage rewarding compact settlement — is absent, services (GDD-9.6) do not exist, and the tier-depth progression of M7 (several coverage needs with tier-rising `required_distinct_providers`) has no substrate. This change adds service definitions, the `service_provider` component, and the `service_capacity`, `spatial_coverage`, and `state_query` supplier types, retiring the coverage-geometry part of R-08.

## What Changes

- New `services` content collection (CONT-6.12): `{ id, mode: coverage | capacity, default_relation }` with a radius relation `{ type: radius, cells }`.
- Entity definitions gain the `service_provider` component (CONT-6.8): `{ mode, service, relation?, capability?, quantity_per_tick?, consumes? }`. A coverage provider covers residences within its relation; a capacity provider generates `quantity_per_tick` of a capability resource per tick at its location.
- The need `demand` union (CONT-6.11) gains `service_capacity { service, quantity_per_population_per_tick }`, `spatial_coverage { service, required_distinct_providers, provider_selector? }`, and `state_query { condition }`, with reference validation for service and condition.
- Phase 08 computes demand for the new types: `service_capacity` demands scale with population like consumption; `spatial_coverage` and `state_query` demand a unit boolean supply.
- Phase 20 delivers the new types: capacity needs allocate the location's generated service capacity across residences in ascending entity ID; a covered residence is fully supplied when at least `required_distinct_providers` active providers cover it under their relation; a `state_query` need is supplied when its condition evaluates true for the residence.
- The `service_provider` component instantiates with its resolved service and relation; disabled providers are excluded (paused/disabled exclusion, 06 §5.3).
- Theme-free fixture and unit coverage for every new supplier type, allocation, coverage geometry, and exclusions.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `sim/needs`: the three new supplier types in phases 08 and 20.
- `content/schemas`: the `services` collection, the `service_provider` component, and the extended need demand union.

## Impact

- **Packages:** `@aesfw/content` (schemas, references, world plan), `@aesfw/core` (need types, phase 08/20, service-provider instantiation support), `@aesfw/app` (content instantiation), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 08 `calculatePopulationDemand` (writes `needStates`), phase 20 `allocateServicesAndConsumeNeeds` (reads `serviceProvider`, spatial state; writes `needStates`, `inventory`, `ledger`).
- **Store kinds:** new component kind `serviceProvider` (v1 catalogue extension, encoded and hashed).
- **Commands/events:** none new. **Error codes:** none. **Diagnostic codes:** none new beyond existing unknown-reference diagnostics.
- **Protocol/save format:** the new store kind joins the save document and hash. **HASH-CHANGING:** no — fixtures without services produce an empty store and unchanged hashes; existing goldens are unchanged.
- **Dependencies on archived changes:** 3.1 `add-grid-spatial-policy` (archived 2026-10-22) and 1.13 `add-population-growth` (archived 2026-10-21).

## Out of Scope

- 7.2 `add-satisfaction-bands`: band tables and effects (phase 22's other half).
- 7.3 `add-tier-transitions`: transition conditions referencing coverage or services.
- 7.9 `add-client-population-and-transitions`: the coverage overlay in the client.
- 12.5 `add-alternative-inventory-access-policies`: unrelated access-policy work.
