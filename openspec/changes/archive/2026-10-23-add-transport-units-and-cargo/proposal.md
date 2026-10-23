# Proposal

## Why

Roadmap 08, M6 item 6.2 (`add-transport-units-and-cargo`). The sector graph exists after 6.1, but nothing can traverse it: there are no transport entities, cargo compartments, handling configuration, or transport maintenance. This change adds transport-unit content and runtime state, retiring the GDD-15.4 representation gap and making INV-16 checkable before movement arrives in 6.3.

## What Changes

- New content collection `transport_units` (CONT-6.16): entity definition, cargo compartment policy, slot count and capacity, acceptance, movement speed and mode, loading/unloading rates, order modes, and optional maintenance.
- A world definition's `initial_entities` now instantiate at their declared location and owner instead of being ignored. A transport-unit definition whose `entity_definition` matches an instantiated entity attaches cargo, movement, handling, and maintenance components.
- New core transport shapes and pure cargo operations: `Cargo`, `TransportMovement`, `TransportHandling`, `loadCargo`, `unloadCargo`, `cargoQuantity`, `cargoFreeCapacity`, `cargoSlotsValid`.
- Cargo supports `unrestricted`, `typed_slots`, and `per_resource` compartments. Typed slots hold one resource type at a time; `acceptance: transportable_resources` resolves to the transportable resource handles at instantiation.
- `checkInvariants` gains INV-16 (every typed slot holds at most one resource type and stays within slot capacity).
- The location hub inventory is the transport endpoint for loading and unloading; 6.4 owns the actual handling actions.
- Existing goldens are unchanged because no existing fixture defines a transport unit or world initial entity.

## Capabilities

### New Capabilities

- `sim/transport`: transport units, cargo compartments, movement and handling configuration, and transport maintenance.

### Modified Capabilities

- `content/schemas`: the transport-unit schema and its reference validation.
- `testkit/harness`: INV-16 is added to `checkInvariants`.

## Impact

- **Packages:** `@aesfw/core` (`sim/transport`, cargo helpers, INV-16 input), `@aesfw/content` (transport-unit schema, collections, reference validation, world initial entities), `@aesfw/app` (world-content instantiation and transport components), `@aesfw/testkit` (INV-16), `@aesfw/host-web` (uses world-content instantiation).
- **Tick phases:** none; instantiation happens at session creation.
- **Store kinds:** existing `cargo`, `movement`, and `handling` stores; no new store kind. `definition`, `owner`, `maintenance` are written at instantiation.
- **Commands/events:** none. **Error codes:** none. **Diagnostic codes:** none new; existing schema and reference diagnostics apply.
- **Protocol/save format:** no protocol change. Cargo values are encoded by the existing generic component codec. Existing goldens are unchanged.
- **Dependencies on archived changes:** 6.1 `add-world-definition-and-connections` (archived 2026-10-23) and 4.2 `add-maintenance` (archived 2026-10-22).

## Out of Scope

- 6.3 `add-route-planning-and-movement`: path planning, traversal time, movement advancement, and arrivals.
- 6.4 `add-transport-orders-and-stations`: orders, stations, handling actions, transport commands, and throughput requests for handling.
- 6.5 `add-transport-quantity-rules`: load and unload quantity rules.
- 6.6 `add-transport-read-model`: transport detail read model.
- 7.4 `add-purpose-locks`: transport-load purpose locking beyond the existing transaction support.
