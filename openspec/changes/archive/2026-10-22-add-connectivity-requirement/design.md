# Design — add-connectivity-requirement

## Context

`add-grid-spatial-policy` (3.1) and `add-placement-predicates-and-commands` (3.3) are archived. The `connectivityNode` store kind exists in the TDS-8.3 catalogue but is unused, `world.caches.connectivity` is typed `unknown`, and phase 04 rebuilds only the spatial cache. GDD-9.9 makes the location hub "the connectivity root that other entities must connect to"; GDD-10.2 makes entity-to-inventory access within a location binary; GDD-10.3 lists "missing inventory access" as a block reason; ARCH-5.2 makes phase 04 "rebuild dirty spatial/connectivity data"; TDS-8.4 makes connectivity groups a derived cache. This document records the connectivity semantics, the component shape, and the cache contract that 3.4 fixes.

## Goals / Non-Goals

**Goals:** the connectivity provider and requirement components, the location hub as the connectivity root, binary hub access, the derived connectivity-group cache (INV-20) rebuilt in phase 04, and the `missing_inventory_access` block reason a disconnected requiring producer emits.

**Non-Goals:** slot and area sources (3.5), the reference builder stage and connector content (3.6), the client connectivity overlay (3.7), inter-location connections and transport (M6), and the `connected_graph`/`explicit_logistics` inventory-access policies (12.5).

## Decisions

### D1 — Module layout

- `packages/core/src/sim/connectivity.ts`: `ConnectivityRole`, `ConnectivityNode`, `ConnectivityGroup`, `ConnectivityCache`, and the pure helpers `connectivityNodeOf`, `hasConnectivityRequirement`, `buildConnectivityCache`, `ensureConnectivityCache`, `rebuildConnectivityCaches`, `isConnected`, and `connectedEntities`.
- `packages/core/src/world/types.ts`: type `DerivedCaches.connectivity` as `ConnectivityCache | undefined`.
- `packages/core/src/systems/phase-04-rebuild-spatial-caches.ts`: rebuild both the spatial and connectivity caches when the caches are dirty or either is absent.
- `packages/core/src/sim/production/preconditions.ts`: add the connectivity case to the static block reasons.
- `packages/core/src/index.ts`: export the new surface.

### D2 — Component shape and store kind

One store kind, `connectivityNode` (TDS-8.3), carries one role per entity:

```ts
type ConnectivityRole = 'provider' | 'requirement';
type ConnectivityNode = { readonly role: ConnectivityRole; readonly network: StringId };
```

GDD-9.2 names "connectivity provider and requirement" as two components; TDS-8.3 defines one `connectivityNode` store kind. They are reconciled as two roles of one node component (A-01). No new store kind is added, so `encodeStores` gains no key and every existing world hash is unchanged. The `network` id is carried for later rows (inter-location connections, `connected_graph`); binary hub access in this row does not match on it.

### D3 — Connectivity root and binary hub access

- **Root.** An active location carrying a `locationHub` component is the connectivity root of its own location. When a location has no hub, its lowest-ID connectivity provider is the root (GDD-9.9: "these responsibilities are assigned to other entities"). An inactive location has no root.
- **Provider.** An entity with a provider node. A provider at a location with a root is connected to it; no range or adjacency is modeled.
- **Requirer.** An entity with a requirement node. It is connected iff its location has a root and at least one provider. The hub alone does not grant a requirer access; a provider (the connector archetype, GDD-9.11) is required. This is the binary rule of GDD-10.2 with no graded/range connectivity.
- **Group.** The members of a rooted location's group are the root, its providers, and — only when at least one provider is present — its requirers, deduplicated and in ascending entity ID. Groups are emitted in ascending location ID.

Ordering and rounding: locations iterate in ascending location ID, entities in ascending entity ID. No allocation, division, or rounding is involved; every value is an entity ID or a string ID.

### D4 — Derived cache and phase 04

```ts
type ConnectivityGroup = {
  readonly location: EntityId;
  readonly root: EntityId;
  readonly members: readonly EntityId[];
};
type ConnectivityCache = { readonly groups: readonly ConnectivityGroup[] };
```

`buildConnectivityCache(world)` scans the `location` store in ascending location ID and the `transform` store in ascending entity ID, and emits one group per rooted location. `rebuildConnectivityCaches(world)` replaces `world.caches.connectivity` and clears `caches.dirty`. Phase 04 rebuilds both the spatial and the connectivity cache from authoritative state on every tick. Rebuilding unconditionally (rather than only when `dirty`) keeps the two caches consistent, because `dirty` is a single shared flag that a lazy `ensureSpatialCache` can clear before phase 04 runs. `createWorld`, `decodeWorld`, and `cloneWorld` leave `dirty` true, so the first phase-04 run (and the run after every load or clone) rebuilds both caches. `encodeWorld` never encodes `caches`, so the connectivity cache is excluded from saves and hashes. INV-20 holds because the cache is a pure function of the authoritative `location`, `locationHub`, `transform`, and `connectivityNode` state; the property test and the `checkInvariants` INV-20 check both compare a full rebuild with the maintained cache.

### D5 — Block reason integration

`staticBlockReasons` adds `missing_inventory_access` when a producer carries a requirement node and `isConnected` is false, in the existing position (after the recipe/condition checks, before `location_inactive`), alongside the existing missing-input/output-inventory case. The block reason is produced only for producers; resource sources have no block-reason mechanism in this row, so their connectivity gating is deferred (3.5 owns source preconditions).

### D6 — Purity, encoding, and hashes

All new modules are pure: no clock, RNG, global, floating point, async code, or module-level mutable state. A node and the cache are plain canonical data; the node is encoded by the generic store codec and the cache is not encoded. No existing content, fixture, or golden declares a connectivity node, so no golden hash changes.

## Amendments and clarifications to 01–07

- **A-01 (clarification, 02 §3.4 Spatial):** add a sentence for `ConnectionNode` reading "`ConnectionNode` is carried by the `connectivityNode` store kind (TDS-8.3) and holds a role of provider or requirement and a connectivity network (GDD-9.2, GDD-9.9). A location hub is the connectivity root of its location, and binary hub access requires a connectivity provider." This reconciles the two components named in GDD-9.2 with the single store kind of TDS-8.3.
- No other clarification or conflict was found.

## Risks / Trade-offs

- [The hub is the root but not a provider] → a requirer needs a provider (connector) to reach the hub; without range, one provider connects the whole location. This is the deliberate "binary, no graded connectivity" simplification; a later row adds adjacency and working areas.
- [The `network` id is unused by the predicate] → two networks at one location share a group. Acceptable until inter-location connections and `connected_graph`; the id is retained on the node for those rows.
- [The connectivity block reason is only on producers] → resource sources are not gated; 3.5 owns source preconditions.

## Migration Plan

Additive module, an unused store kind becomes used, an `unknown` cache field becomes typed, and phase 04 rebuilds one more cache. No save-format, protocol, or golden artifact changes. Rollback reverts the change; older code ignores the optional node and cache.

## Open Questions

None blocking.
