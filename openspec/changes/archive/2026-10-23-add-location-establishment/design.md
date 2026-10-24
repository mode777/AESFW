# Design

## Context

8.2 left `establish` orders behind the phase 16 `route`-only gate on purpose. The establishment transaction needs one capability core lacks: creating an entity from an entity definition. The 7.3/7.5 precedent (design D4) applies — app builds an injected system from compiled content and passes it through `TickInput`; core declares the interface and treats absence as "cannot establish".

## Goals / Non-Goals

- Goals: establishment content, establish-order execution, the atomic transaction, exclusive ownership.
- Non-Goals: fog filtering (8.4), SCN-05 (8.5), client flows (8.6), shared ownership (13.4), construction/condition establishment variants.

## Decisions

### D1 — Content shape and plan field

`location_establishments` → core type `'establishment'`, appended after `distribution_rules` (handle space and goldens unchanged). The schema fixes the v1 literals (`transport_cargo`, `on_completion`, `exclusive`) with `Type.Literal` so deviations report `schema_invalid` (a diagnostic, not a silent drop). `templatePlan` resolves the template's `establishment` to a handle (`unresolved_reference` when dangling, mirroring the region handling); `LocationPlan.establishment` is optional and `instantiateWorld` sets `Location.establishment` only when present — the `grid` precedent — so existing encodings are unchanged.

### D2 — EstablishmentSystem injection

Core gains:

```ts
export interface EstablishmentSystem {
  readonly createHub: (
    world: World,
    location: EntityId,
    owner: OwnerHandle,
    establishment: DefinitionHandle,
  ) => EntityId | null;
}
```

`TickInput.establishmentSystem?` → `TickContext.establishmentSystem: EstablishmentSystem | null` (default `null`, like `unlockSystem`). `@aesfw/app` exports the establishment definition data from the content registry and builds the system around the existing `instantiateDefinition` helper (exported from the content module with a narrow wrapper), so a hub gets the full component treatment a placed or initial entity gets.

### D3 — Phase 18 executes the transaction

Phase 14 plans establish orders (gate widened to `route | explore | establish`). Phase 16 leaves establish cursors alone (its station handling stays `route | explore`). Phase 18, per arrival in ascending order: resolve the unit's assignment; require an `establish` order whose current station endpoint is the arrival location; read the location's establishment handle and definition data; evaluate guards (knowledge ≥ `requires_knowledge`, default `discovered`; `location.owner === null` when `requires_unoccupied`, default `true`; cargo covers every cost; a system is injected). All guards are checked before any mutation, so the transaction is atomic by construction.

Failure mapping: occupied target → `establishment_target_occupied`; missing definition, insufficient knowledge, cargo shortfall, or missing system → `origin_unavailable` (GDD-15.7's "resource unavailable"). The failure policies of the order apply through the existing `applyFailure` helper, exported from `orders.ts` for phase 18.

Success path, in order: deduct costs from the cargo entries (resource-handle ascending); `createHub`; set `location.owner` and `location.active = true` (`activation: on_completion`); raise the owner's knowledge to `established` (ascending-location merge as in 8.2); advance the station cursor (reuse the route cursor semantics: next station, repeat → reset, else unassign); emit `LocationEstablished` with `subjects: [location]`, `owner`, `location`, payload `{ owner, location, hub }`.

Phase 18's declared writes grow to `['owners', 'cargo', 'location', 'stationCursor', 'transportAssignment', 'definition', 'owner', 'resourceSource', 'producer', 'capabilityConsumer', 'residence', 'populationGroup', 'growth', 'connectivityNode', 'maintenance', 'modifierSet', 'movement', 'handling']` — everything the transaction and the injected hub instantiation can touch under the write-set guard.

### D4 — Unowned world locations

The 6.1 world plan assigned handle `0` to every location no owner established — the single-owner default. GDD-16.3's `requires_unoccupied` needs locations with *no* owner, so `worldPlan` now maps an unestablished world location to `owner: null` (`LocationPlan.owner` widened to `OwnerHandle | null`), and `instantiateWorld` instantiates it unowned and inactive; the location's inventories still instantiate with the plan-default owner so a founded location's hub finds its inventory. A sim/world spec delta records the amended "World locations and owners" requirement. Shipped fixtures are unaffected: demo-logistics establishes both locations, and every other fixture uses the default single-owner plan.

### D5 — Exclusive ownership

Exclusive ownership is the `location.owner` claim itself: with `requires_unoccupied: true` (the v1 default and the only shipped variant), any subsequent establish attempt fails the occupied guard. The initial locations of an owner are established by scenario setup (world `established_locations`), unchanged. The founding claim also covers the "creates the location inventory" clause of GDD-16.3 in the v1 reading: the template's inventories instantiate with the location at world build and become an owned, active location's inventory on completion; no new inventories are created by the transaction.

## Amendments

- A13 (03 §6.6): an unestablished world location has no owner instead of defaulting to handle `0`; recorded in 05 §26 and applied in `worldPlan` (D4). No shipped fixture or golden is affected.

## Clarifications recorded (no normative amendment)

- The failure-key mapping for non-occupied guard failures is `origin_unavailable` (D3); CONT-9's key set is unchanged.
- `requires_knowledge` defaults to `discovered` and `requires_unoccupied` to `true` when omitted (D3).
- Knowledge of a founded location jumps directly to `established` in the same transaction (D3); no separate discovered transition is emitted for it.

## Risks / Open Questions

- `createHub` allocates a new entity ID inside phase 18; allocation is monotonic and deterministic (INV-10), so save-continue and double-run harnesses hold. The M8 milestone run re-verifies every golden.
- A hub definition with production or residence components becomes fully live on the next tick; no special activation ordering beyond `location.active` is introduced.
