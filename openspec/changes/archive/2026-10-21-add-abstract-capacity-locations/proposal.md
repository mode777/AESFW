# Proposal

## Why

Roadmap 08, M1 item 1.8 (`add-abstract-capacity-locations`, capability `sim/spatial`, size M). The M1 closed loop of 01 §23.1 runs in locations: an entity needs a place to exist and a shared inventory to draw from and deliver to. Until locations and their inventories can be instantiated from content, no production or population system has a world to act on. This row delivers the spatial-policy abstraction, the `abstract_capacity` implementation the M1 example (03 §14) uses, location entities with their shared inventories, and the default single-owner instantiation, retiring R-05 (content pipeline scope) and R-09's interface risk early. Depends on: `add-registry-compilation` (1.4) and `add-inventory-transactions` (1.7) — archived 2026-10-21.

## What Changes

- Add the core `SpatialPolicy` interface of ARCH-11 and the `framework.spatial.abstract_capacity` implementation, with a policy registry.
- Add the `location` component runtime shape (template, spatial policy, capacity, used, properties, region, activation, owner) and the `locationHub` inventory link.
- Add the core `InventoryAccessPolicy` interface of ARCH-12 and the `framework.inventory.shared_location` implementation, which exposes every inventory of a location to requesters there.
- Add the pure `instantiateWorld(world, plan)` default-world instantiation from a plain `WorldPlan`, allocating a location entity and its inventories per plan entry for a single owner.
- Add `defaultWorldPlan(registry)` in `@aesfw/content`, deriving the plan from the location templates with `activation.initial: true` (CONT-6.6), with the `abstract_capacity` spatial parameters and the template's inventories.
- Add unit tests for capacity, placement, shared-location access, and instantiation.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `sim/spatial`: the spatial-policy abstraction and `abstract_capacity`, location entities and their inventory hub, the inventory-access-policy abstraction and `shared_location`, and default-world instantiation.

### Modified Capabilities

- `content/registry`: adds `defaultWorldPlan(registry)`, deriving a default world plan from location templates.

## Impact

- **Packages:** `@aesfw/core` gains `src/policies/spatial/**`, `src/policies/inventory-access/**`, `src/sim/location.ts`, and `src/sim/instantiate.ts`; `@aesfw/content` gains `src/world/plan.ts`. No new runtime dependency is added.
- **Tick phases:** none implemented; the spatial caches of phase 04 are 3.1. **Store kinds:** `location`, `locationHub`, `inventory`. **Commands/events:** none yet. **Diagnostic codes:** `unknown_spatial_policy`, `unknown_inventory_policy`, `unknown_location_template`, `unsupported_spatial_parameter`.
- **Out of scope:** the grid policy, buildable mask, footprints, and distance/radius queries (`add-grid-spatial-policy`, 3.1); construction and placement commands (3.2, 3.3); connectivity (3.4); slot and area sources (3.5); the full world definition with multiple locations and connections (`add-world-definition-and-connections`, 6.1); regions and distribution rules (8.1).
- **Verification impact:** `pnpm test` gains spatial and instantiation unit tests.
