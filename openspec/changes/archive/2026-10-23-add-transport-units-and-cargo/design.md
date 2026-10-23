# Design

## Context

6.2 adds transport entities and cargo. Movement, orders, and handling actions are later rows; this change only makes the runtime state and its invariant representable.

## Decisions

### D1 — Cargo is one component with two representations

`Cargo` is a single plain component:

```ts
type Cargo = {
  readonly policy: 'unrestricted' | 'typed_slots' | 'per_resource';
  readonly slotCapacity: Int;
  readonly slots: readonly { resource: DefinitionHandle | null; quantity: Int }[];
  readonly entries: readonly { resource: DefinitionHandle; quantity: Int }[];
  readonly accepts: readonly DefinitionHandle[];
};
```

`typed_slots` uses `slots`; `unrestricted` and `per_resource` use `entries`. `accepts` is empty for `acceptance: all`, otherwise the ascending handles of resource definitions with `transportable: true`. Resolving that list at instantiation keeps core content-free.

Load order is documented: typed slots fill existing matching slots before empty slots, ascending index; entries are rebuilt in ascending resource-handle order. Unload is the inverse.

### D2 — Transport units attach to ordinary entities

A transport unit is not a separate entity store. `instantiateDefinition` allocates an entity, instantiates its entity-definition components, then looks up a `transportType` definition whose `entity_definition` string id matches. The first match in ascending transport-unit ID order attaches `cargo`, `movement`, `handling`, and optional `maintenance`. This keeps the entity identity, owner, lifecycle, and save encoding uniform.

### D3 — World initial entities

`WorldPlan` gains optional `initialEntities` (`definition`, `locationIndex`, `owner`). `worldPlan` fills it from each owner's `initial_entities`. `@aesfw/app` exposes `instantiateWorldContent(world, registry, worldId)` which instantiates the plan, maps location indices to allocated location entities, and instantiates the declared initial entities. With no initial entities it falls back to the pre-world behaviour of instantiating every entity definition at the first location, so existing fixtures and reference content are unchanged.

### D4 — Endpoints

The location hub's first inventory is the transport endpoint for loading and unloading. No new endpoint store is introduced; 6.4 reads the hub inventory when it executes handling actions.

### D5 — Movement and handling are configuration now

`movement` stores `speedPermille`, `mode` (`physical` or `abstract`), and `allowedConnectionTags`. `handling` stores the two rates. 6.3 extends movement with path progress; 6.4 consumes handling. Storing the configuration now makes save/load and INV-16 complete without pre-empting route behaviour.

## Phases and stores

- No tick phase changes.
- Instantiation writes `definition`, `owner`, `cargo`, `movement`, `handling`, and `maintenance` in ascending entity ID.

## Ordering and rounding

Cargo operations are integer-only and deterministic. Typed slots and entries are ordered as in D1. No division or rounding is introduced.

## Amendments

No amendment to 01–04 is required.

## Risks

- `per_resource` has no resource list in CONT-6.16; this change interprets it as a per-resource capacity applied to every accepted resource. Recorded as a clarification.
- Transport units instantiated without a world definition are not attached because the legacy path instantiates all entity definitions without transport-unit selection; 6.7's scenario uses a world definition.
- `movement.mode` is additive content. No existing content defines it, so existing hashes are unchanged.
