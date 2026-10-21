# kernel/world-state Specification

## Purpose

The authoritative world state substrate: the `World` record, component stores with deterministic ascending iteration and tombstones, monotonic entity and reservation allocation, the owners table, and the canonical encode/decode/clone/hash operations that make state reproducible across environments (TDS-8, ARCH-3, ARCH-4.2).

## Requirements

### Requirement: World record initialization
`createWorld(registry, setup)` SHALL return `ok(world)` with a `World` whose `formatVersion` is `1`, whose `tick` is `0`, whose `nextEntityId` and `nextReservationId` are `1`, whose stores, owners, ledger, accumulators, timers, exchanges, command queue, and metric windows are empty, whose enabled modules are the `WorldSetup.enabledModules`, and whose derived caches are present and dirty. The `WorldSetup` fields SHALL be `seed`, `tickDurationMs`, `world`, and `enabledModules` (TDS-10.1). Authoritative state SHALL be plain, canonical data; derived caches SHALL be excluded from saves and hashes (TDS-8.4).

Source: TDS-8.1, TDS-8.4, TDS-10.1, ARCH-4.2

#### Scenario: An empty world is initialized
- **WHEN** `createWorld(registry, { seed: [1, 2], tickDurationMs: 1000, world: null, enabledModules: [] })` is evaluated
- **THEN** the result is `ok` with `formatVersion` `1`, `tick` `0`, `nextEntityId` `1`, `nextReservationId` `1`, no owners, no reservations, and `caches.dirty` true

#### Scenario: Enabled modules are recorded
- **WHEN** `createWorld` is called with `enabledModules: ['test.module.b', 'test.module.a']`
- **THEN** the world's enabled modules are `['test.module.a', 'test.module.b']` in code-unit order

### Requirement: Entity and reservation allocation
`allocateEntity(world)` SHALL return the current `nextEntityId` and advance `nextEntityId` by one; `allocateReservation(world)` SHALL do the same for `nextReservationId`. Identifiers SHALL never be reused, and `nextEntityId` SHALL exceed every allocated entity ID (INV-10).

Source: TDS-7, TDS-8.1, ARCH-3.1, INV-10

#### Scenario: Entity allocation is monotonic
- **WHEN** `allocateEntity` is called twice on a fresh world
- **THEN** the results are `1` and `2`, and `nextEntityId` is `3`

#### Scenario: Reservation allocation is monotonic
- **WHEN** `allocateReservation` is called twice on a fresh world
- **THEN** the results are `1` and `2`, and `nextReservationId` is `3`

### Requirement: Component store iteration and tombstones
A `ComponentStore` SHALL support `has`, `get`, `getOrThrow`, `set`, `markRemoved`, `ids`, and `size`. `ids()` SHALL return live entity IDs in ascending order and SHALL exclude tombstoned entities. `markRemoved` SHALL tombstone an entity so that `has` is false, `get` returns `undefined`, and `size` excludes it, while the storage is compacted in phase 30 (INV-24). `getOrThrow` SHALL throw an `InvariantViolation` for an unknown or removed entity.

Source: TDS-8.2, INV-24

#### Scenario: Store iteration is ascending by entity ID
- **WHEN** a store receives entity `2` and then entity `1`
- **THEN** `ids()` is `[1, 2]` and `size()` is `2`

#### Scenario: Tombstones are excluded from iteration
- **WHEN** entity `1` is removed from a store holding entities `1` and `2`
- **THEN** `ids()` is `[2]`, `has(1)` is false, `get(1)` is `undefined`, and `size()` is `1`

#### Scenario: Reading an unknown component is an invariant violation
- **WHEN** `getOrThrow` is called for an entity with no value
- **THEN** it throws an `InvariantViolation`

### Requirement: Owners table
The world SHALL hold an owners table indexed by ascending `OwnerHandle`, where each owner state carries its knowledge entries, account entries, purpose locks, unlock state, and deficit-pause state as plain data. Knowledge entries SHALL be ordered by ascending location ID and account entries by ascending resource handle.

Source: TDS-8.1, ARCH-3.4

#### Scenario: Owner state is stored by ascending handle
- **WHEN** two owners are added to the table
- **THEN** iterating the table yields them in ascending `OwnerHandle` order

### Requirement: Canonical encode and decode
`encodeWorld(world, registry)` SHALL produce a canonical state with string definition IDs (resolved through the registry), ascending entity order, and sorted keys, and SHALL NOT include derived caches. `decodeWorld(registry, state)` SHALL reconstruct the world and leave caches dirty. `decodeWorld(encodeWorld(world))` SHALL reproduce the authoritative state (INV-18), and decode SHALL return `err(diagnostics)` rather than throw for malformed input.

Source: TDS-8.4, TDS-8.5, TDS-19.3, INV-18

#### Scenario: An empty world round-trips through encode and decode
- **WHEN** an empty world is encoded and decoded
- **THEN** the decoded world equals the original, and `caches.dirty` is true

#### Scenario: Store entries round-trip with ascending entity order
- **WHEN** a store holds entities `1` and `2` with canonical values and the world is encoded and decoded
- **THEN** the decoded store yields the same values for `1` and `2`, and the encoded store lists `1` before `2`

#### Scenario: Definition handles are encoded as string IDs
- **WHEN** a reservation references a resource handle that the registry maps to `test.r.a` and the world is encoded
- **THEN** the encoded reservation carries `test.r.a`, and decoding maps it back to the handle

#### Scenario: Derived caches are excluded from the encoding
- **WHEN** a world with dirty caches is encoded
- **THEN** the encoded state has no cache field

#### Scenario: Malformed state decodes to an error
- **WHEN** `decodeWorld` is given a state with a missing required field
- **THEN** it returns `err` with a `Diagnostic` whose code is `invalid_canonical_state`

### Requirement: World cloning
`cloneWorld(world)` SHALL return a deep copy whose authoritative state equals the original and whose caches are dirty. Mutating the clone SHALL NOT change the original (INV-17 support).

Source: TDS-8.5, TDS-5.2

#### Scenario: Clone is independent of the original
- **WHEN** a store value is changed in a clone
- **THEN** the original still holds its previous value, and the clone's caches are dirty

### Requirement: World hash
`hashWorld(world, registry)` SHALL equal `fnv1a64(canonicalStringify(encodeWorld(world, registry)))`, using algorithm `fnv1a64-canonical-json-v1`. The hash SHALL be stable across clones of the same state and SHALL change when authoritative state changes.

Source: TDS-8.5, TDS-19.4

#### Scenario: Clone and original hash identically
- **WHEN** `hashWorld` is evaluated on a world and on its clone
- **THEN** both results are equal

#### Scenario: Hash changes with authoritative state
- **WHEN** a world is hashed, then its tick is advanced, then it is hashed again
- **THEN** the two hashes differ
