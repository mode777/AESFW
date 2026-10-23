# Design

## Context

Phase 10 already publishes a `throughputPool` per throughput-limited location. Inventory capacity is authoritative on the `inventory` component and checked in `tx/builder.ts`, in the app inventory projection, and in testkit INV-03. There is no storage-provider component. Adding a new store kind would change `encodeStores` for every world (it writes one array per catalogue kind) and therefore every golden, so the design avoids a new kind.

## Goals / Non-Goals

- Goals: content-declared capacity and throughput expansion; one effective-capacity rule used by transactions, projections, and INV-03; activation gating; no catalogue-wide hash change.
- Non-Goals: client indicators (5.4), the SCN-10 golden (5.3), acceptance rules, new inventories, establishment (8.3).

## Decisions

### D1 — Storage provider stored in `modifierSet`

A storage provider is a modifier of an inventory and a location, so its runtime state lives in the existing `modifierSet` store under a discriminator:

```ts
type StorageProvider = {
  readonly kind: 'storage_provider';
  readonly inventory: EntityId;
  readonly location: EntityId | null;
  readonly capacityTotal: Int;
  readonly capacityPerResource: Int;
  readonly throughput: Int;
};
```

No new `ComponentKind` is added, so the canonical store catalogue and every existing golden are unchanged. A world with storage providers changes only because `modifierSet` now has entries.

### D2 — Derived effective capacity

`effectiveInventoryCapacity(world, inventory, resource)` returns the declared `total`/`perResource` plus the bonuses of active providers whose `inventory` matches. A `null` declared bound stays `null`. The inventory component is never mutated, so deconstruction or disabling a provider needs no reversal transaction and the base save data is stable.

`tx/builder.ts` uses this helper in `capacityAllows`, so reserves, deposits, and transfers all see the same bound. The app inventory projection uses it per entry. INV-03 in the testkit uses it as well; otherwise a legitimate expanded deposit would be reported as an overrun.

### D3 — Active-provider gating

A provider is active when it has no `lifecycle` component (initial content entities) or its lifecycle is `active`, `disabled`, or `blocked`. `planned`, `awaiting_resources`, `constructing`, `cancelled`, and `deconstructed` contribute nothing. This keeps a planned storage module from granting capacity before it is built and removes the bonus automatically when phase 30 tombstones the entity.

### D4 — Throughput expansion

Phase 10 calls `storageThroughputBonus(world, location)` and adds it to the pool capacity before `alloc-v1`. The helper sums `throughput` over active providers at the location. `throughputCapacity` in `sim/internal-logistics` takes the bonus into account so direct callers and tests agree with phase 10.

### D5 — Application points

`applyStorageProvider(world, registry, entity, location)` resolves the entity definition's `storage_provider` through `entityComponentsOf` (the placement helper already used by core), resolves `location.<id>` to the first hub inventory, and writes the `modifierSet` entry. It is idempotent: an existing entry is replaced.

- Initial content entities: `instantiateContentEntities` calls it after writing the entity's components.
- Placed entities: `applyPlaceEntityPlan` calls it after the definition and owner are written, in phase 01. The lifecycle gate (D3) makes the timing safe.
- Deconstruction/removal: no call is needed; the store entry disappears with the entity in phase 30.

## Risks / Trade-offs

- [Scanning `modifierSet` on every capacity check] → small store, and the scan is linear in storage providers only; no per-tick allocation change.
- [A storage provider placed with no construction grants capacity immediately] → consistent with D3's "no lifecycle means active" rule; content that wants construction declares it.
- [The inventory DTO capacity is derived, not stored] → a save/load round-trip reproduces it from the same components; no format change.

## Migration Plan

No save-format or protocol change. Existing content declares no `storage_provider`, so `modifierSet` stays empty and every existing golden is unchanged. New content that opts in changes hashes, which 5.3's new golden covers.

## Open Questions

None.
