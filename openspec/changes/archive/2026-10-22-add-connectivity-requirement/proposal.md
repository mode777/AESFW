# Proposal

## Why

Roadmap 08, M3 item 3.4 (`add-connectivity-requirement`, capability `sim/spatial`, size M). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Row 3.1 can place entities on a grid and row 3.3 validates a placement, but an entity at a location still has unconditional access to that location's inventory. GDD-10.2 requires entity-to-inventory access within a location to be **binary**: an entity either satisfies the location's connectivity requirement (for example a connector path to the hub) or it has no inventory access; distance inside a location does not change rates. GDD-9.9 makes the location hub "the connectivity root that other entities must connect to", ARCH-5.2 makes phase 04 "rebuild dirty spatial/connectivity data", and TDS-8.4 makes connectivity groups a derived cache. Without the connectivity provider and requirement components, the derived connectivity cache, and the `missing_inventory_access` block reason they cause, the "space" currency has no teeth and no later row (slot/area sources, the reference builder, the client connectivity overlay) can use connectivity. Depends on: `add-grid-spatial-policy` (3.1) — archived 2026-10-22.

## What Changes

- Add the connectivity runtime components on the existing `connectivityNode` store kind (TDS-8.3): a **provider** node and a **requirement** node, each naming a connectivity network.
- Make the location hub (an active location carrying a `locationHub` component) the connectivity root (GDD-9.9). A connectivity provider at a hub-less location also acts as a root, per GDD-9.9 ("these responsibilities are assigned to other entities").
- Add binary, location-scoped hub access: an entity that requires connectivity is connected iff its location has at least one connectivity provider. No graded or range-based connectivity is modeled; a provider connects the whole location to its root.
- Add the derived connectivity-group cache in `world.caches.connectivity` (TDS-8.4): one group per rooted location, carrying the root and the ascending connected member entity IDs. It is rebuilt in phase 04, excluded from saves and hashes, left dirty by `decodeWorld` and `cloneWorld`, and a full rebuild equals the maintained cache (INV-20).
- Emit `missing_inventory_access` in phase 07 for a producer that carries a connectivity requirement but is not connected (GDD-10.2, GDD-10.3), in addition to the existing missing-input/output-inventory case.
- No **BREAKING** and no **HASH-CHANGING** artifacts: the connectivity cache is excluded from `encodeWorld`, and no existing content, fixture, or golden declares a connectivity node or requires connectivity.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sim/spatial`: adds the connectivity provider and requirement components, the location hub as the connectivity root, the derived connectivity-group cache (INV-20), and binary hub access.
- `sim/production`: extends the production-precondition block reasons so a producer that requires connectivity but has none reports `missing_inventory_access`.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/connectivity.ts`, types `world.caches.connectivity`, implements `src/systems/phase-04-rebuild-spatial-caches.ts` for the connectivity cache, and extends `src/sim/production/preconditions.ts`; `src/index.ts` exports the new surface. No new runtime dependency is added to `@aesfw/core`.
- **Tick phases:** phase 04 `rebuildSpatialCaches` additionally rebuilds the connectivity cache (reads `location`, `locationHub`, `transform`, `connectivityNode`; writes no component store). Phase 07 `evaluatePreconditions` reads `connectivityNode` and the connectivity cache. **Store kinds:** `connectivityNode` (already in the TDS-8.3 catalogue). **Derived cache:** `world.caches.connectivity`.
- **Commands/events:** none. **Error/diagnostic codes:** none new; reuses `missing_inventory_access` (GDD-10.3).
- **Verification impact:** new L1 unit tests for the connectivity components, the cache, phase 04, the connectivity query, and the connectivity block reason; `checkInvariants` gains an INV-20 check for the connectivity cache.
- **Out of scope (later roadmap rows):** slot and area sources (3.5 `add-slot-and-area-sources`); the reference builder stage and connector content (3.6 `add-reference-content-builder-stage`); the client grid connectivity overlay (3.7 `add-client-location-grid`); inter-location connections and transport (M6); the `connected_graph` and `explicit_logistics` inventory-access policies (12.5 `add-alternative-inventory-access-policies`).
