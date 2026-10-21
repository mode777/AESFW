# Abstract Economic Simulation Framework
## Simulation Architecture Specification

**Version:** 1.1  
**Status:** Implementation baseline  
**Companion:** Core Game Framework GDD

---

## 1. Architectural Objectives

The runtime must:

1. Execute without a presentation client.
2. Load concrete behavior from configuration packages.
3. Use data-oriented component storage rather than behavior-rich object hierarchies.
4. Preserve deterministic results for identical configuration, seed, commands, and tick order.
5. Decouple definitions from runtime state.
6. Prevent presentation clients from directly mutating simulation state.
7. Support validation, replay, automated tests, save migration, and multiplayer replication.
8. Permit multiple spatial and logistics policies behind stable interfaces.

---

## 2. Layered Architecture

```text
Presentation Clients
  UI, 2D, 3D, audio, text client, tools
        ↓ commands / ↑ snapshots and events
Presentation Adapter
  projections, view models, event translation
        ↓ commands / ↑ query models
Application Layer
  sessions, command validation, queries, save/load
        ↓ authoritative commands / ↑ domain results
Simulation Domain
  component stores, systems, tick loop, domain events
        ↓ definition handles
Content Runtime
  immutable registries, compiled conditions and curves
        ↓ loaded packages
Configuration & Validation
  schemas, references, graphs, migrations
        ↓ infrastructure services
Infrastructure
  serialization, storage, clock, networking, logging
```

Dependencies point downward. Simulation Domain must not reference presentation or assets.

---

## 3. Authoritative Runtime Model

### 3.1 Entity

An entity is a stable runtime identifier.

```text
EntityId = unsigned 64-bit integer
```

Entity IDs are never reused within one simulation session.

### 3.2 Definition handle

Configuration string IDs resolve at load time to compact handles.

```text
DefinitionHandle = unsigned 32-bit integer
```

String IDs remain available for serialization and diagnostics but are not used in hot loops.

### 3.3 Component stores

Components are plain data in typed, contiguous stores. A structure-of-arrays layout is preferred for hot components.

No component may:

- Load an asset
- Format presentation text
- Invoke rendering or audio
- Read wall-clock time
- Execute domain behavior
- Hold unmanaged references to another component

### 3.4 Representative components

#### Identity and lifecycle

```text
DefinitionReference
OwnerReference
LocationReference
LifecycleState
EnabledState
Revision
```

#### Spatial

```text
Position
Orientation
Footprint
WorkingArea
SpatialTags
ConnectionNode
RegionMembership
LocationProperties
```

#### Location and knowledge

```text
EstablishmentState
LocationHub
ThroughputPool
OwnerKnowledgeState      (per owner × location: unknown/discovered/established)
```

#### Inventory

```text
InventoryHeader
InventoryEntries
CapacityRules
AcceptanceRules
ReservationLedger
PurposeLocks
```

#### Production

```text
ResourceSource
SourceSlotBinding
WorkingAreaClaim
RecipeSet
ActiveRecipe
ProcessSlot
ProcessProgress
ProductionStatus
ThroughputAllocation
ModifierSet
```

#### Population

```text
Residence
PopulationGroup
NeedStateSet
SatisfactionState
SatisfactionBandState
SustainedConditionTimers
GrowthState
TransitionState
```

#### Capability

```text
CapabilityProvider
CapabilityConsumer
CapabilityAllocation
```

#### Economy

```text
OwnerAccount
MaintenanceState
DeficitPauseState
```

#### Exchange

```text
ExchangeReference
PriceState
VolumeWindow
```

#### Transport

```text
CargoInventory
CargoSlots
TransportAssignment
TransportRoute
StationCursor
TransportOrderMode
MovementState
HandlingState
```

#### Construction

```text
ConstructionPlan
ConstructionProgress
PlacementState
```

---

## 4. Definition Data and Runtime Data

### 4.1 Definition data

Definition data is immutable after session initialization:

- Resources
- Regions and distribution rules
- World definition (location and connection instances, initial owners)
- Locations and connections
- Establishment rules
- Entity/building definitions
- Services
- Recipes
- Tiers
- Needs and categories
- Satisfaction aggregation and bands
- Growth policies
- Transitions
- Capabilities
- Transport types
- Exchanges and elasticity parameters
- Maintenance and deficit policies
- Unlocks
- Conditions and curves
- Optional-module settings

### 4.2 Runtime data

Runtime data is mutable:

- Entity/component state
- Quantities and reservations
- Purpose locks
- Population, fulfillment, and satisfaction
- Sustained-condition timers
- Process progress
- Route assignments and station cursors
- Movement progress
- Owner knowledge state per location
- Exchange price state and volume windows
- Deficit pause state
- Unlock state
- Pending transactions
- Command history
- Tick and revision

### 4.3 Hot reload

Authoritative sessions must not hot-reload mechanics definitions. Development hot reload requires an explicit migration transaction and invalidates deterministic replay unless the configuration change is recorded as a versioned command.

Presentation mappings may hot-reload independently.

---

## 5. Systems and Fixed Tick Order

### 5.1 Fixed simulation time

The simulation uses integer ticks. Tick duration is chosen at session creation and then immutable.

No authoritative system may use frame delta or wall-clock time.

### 5.2 Required phase order

```text
01 Apply accepted commands
02 Apply optional-module effects (disruptions), if enabled
03 Resolve lifecycle and construction starts
04 Rebuild dirty spatial/connectivity data
05 Rebuild capability supply
06 Allocate capabilities
07 Evaluate resource-source and producer preconditions
08 Calculate population demands
09 Collect internal-logistics throughput requests
10 Allocate internal-logistics throughput
11 Reserve production inputs and output capacity
12 Advance resource sources and production processes
13 Commit completed extraction and production transactions
14 Plan internal logistics, if explicit transport is configured
15 Advance internal logistics
16 Advance inter-location transport and handling
17 Execute exchange trades
18 Resolve arrivals: discovery and establishment
19 Commit transport transactions
20 Allocate services and consume need resources
21 Update need histories, category fulfillment, and satisfaction
22 Update sustained-condition timers and satisfaction bands
23 Update population growth or decline
24 Evaluate and advance tier transitions
25 Evaluate unlocks
26 Apply continuous outputs and maintenance
27 Apply owner deficit policy (pause/resume)
28 Recover exchange prices
29 Evaluate optional-module conditions (scenario objectives), if enabled
30 Finalize lifecycle changes and expired reservations
31 Record metrics and state hash
32 Emit ordered domain events
33 Publish immutable read snapshot
```

System order is framework-owned and not content-configurable.

Phase 07 evaluates resource sources (slot binding, working area, location-property scaling, conditions, capability allocation, connectivity) and producers alike. Phase 08 computes need demand from the population counts of the previous tick. Phase 09 collects every throughput request of the tick before allocation: planned source output, planned producer input and output movement, planned need deliveries from phase 08, and planned handling of transport units already docked at the start of the tick. Phase 10 allocates each location's throughput pool to all these requesters proportionally, using integer division with deterministic remainder distribution by entity ID; phases 11–20 then execute within the granted throughput.

Phase 27 pauses entities in the configured order until the stop condition holds and resumes them in reverse order when the resume condition holds; a paused entity is excluded from phases 07–13 and from maintenance in the following tick.

### 5.3 Parallel execution

Systems may process partitions in parallel only when writes are isolated or accumulated into deterministic command buffers. Commit order must be stable by:

```text
phase → location ID → entity ID → definition handle → transaction sequence
```

---

## 6. Transaction Model

All authoritative quantity mutations occur through transactions.

### 6.1 Transaction types

- Reserve quantity
- Release reservation
- Commit consumption
- Deposit output
- Transfer between inventories
- Generate recomputed capability
- Apply continuous cost/output
- Exchange trade (cargo transfer and balance change as one atomic unit)
- Establish location (consume cargo, create hub and inventory, activate)

### 6.2 Atomicity

A composite operation either commits all required mutations or none. Production completion cannot consume inputs without depositing outputs when output capacity was reserved.

### 6.3 Fixed-point quantities

Resource quantities use signed 64-bit fixed-point units. Each resource definition establishes a display scale, while authoritative operations use base units.

Overflow checks are mandatory. Negative stored quantities are invalid, except for balance resources that declare `allow_negative: true`. A negative balance triggers the owner deficit policy; it never aborts the simulation.

---

## 7. Command Architecture

### 7.1 Command envelope

```yaml
command:
  command_id: 8a2b...
  actor_id: owner.1
  requested_tick: 1000
  expected_session_revision: 42
  type: SetEntityEnabled
  payload:
    entity_id: 8241
    enabled: false
```

### 7.2 Pipeline

```text
Receive
 → Deserialize and schema-check
 → Authenticate actor
 → Validate authorization
 → Validate referenced definitions/entities
 → Validate current state
 → Schedule for tick
 → Apply in stable order
 → Emit accepted/rejected result
```

### 7.3 Core command types

- `PlaceEntityPlan`
- `CancelEntityPlan`
- `CommitConstruction`
- `DeconstructEntity`
- `SetEntityEnabled`
- `SelectRecipe`
- `SetProcessPriority`
- `SetCapabilityPriority`
- `RequestPopulationTransition`
- `CreateTransportOrder` (modes: `route`, `explore`, `establish`, `trade`)
- `ModifyTransportOrder`
- `DeleteTransportOrder`
- `AssignTransport`
- `UnassignTransport`
- `SetInventoryPolicy`
- `SetResourcePurposeLock`
- `ResumeDeficitPausedEntities`
- `ActivateLocation`
- `DeactivateLocation`

Content may expose or hide command availability through unlocks but may not introduce arbitrary executable command code.

### 7.4 Rejection

A rejected command returns:

- Command ID
- Error code
- Machine-readable arguments
- Current revision
- Optional conflicting entity IDs

Presentation text is resolved externally.

---

## 8. Query and Read Model Architecture

Clients do not query live component stores. At tick completion, the simulation publishes immutable projections.

### 8.1 Query examples

- Location summary
- Entity detail
- Inventory contents, reservations, and purpose locks
- Production status and block reasons
- Throughput capacity, demand, and throttling per location
- Population tier/count/capacity
- Need demand/delivery/fulfillment
- Residence satisfaction and current band
- Transition eligibility
- Transport status
- Exchange quotes and price state
- Owner balance: revenue, expenses, net rate, deficit-paused entities
- Chain metrics and supported population per resource
- Available definitions and commands
- Placement validation

### 8.2 Snapshot granularity

The adapter may publish:

- Full initial snapshot
- Incremental snapshots by revision
- Area or location subscriptions
- Entity-detail projections on demand

Read models may contain derived values for clients but must derive them from authoritative state in the application/presentation adapter, never feed them back as authority.

### 8.3 Owner visibility

When fog is enabled, every projection is filtered by the requesting actor's knowledge state. Attributes of locations unknown to that owner (property vector, source slots, region membership, capacity, foreign entities) are omitted, not merely hidden by clients. Filtering happens in the application layer; the simulation itself always holds full state.

---

## 9. Domain Events

Events state what happened, not how to render it.

Core event families:

- Entity planned/constructed/activated/disabled/deconstructed
- Entity paused/resumed by deficit policy
- Resource reserved/released/consumed/produced/transferred
- Purpose lock changed
- Production started/blocked/completed/throttled
- Need demand changed/fulfilled/unfulfilled
- Satisfaction band changed
- Population changed
- Residence emptied/decayed
- Transition eligible/started/completed/cancelled
- Capability allocated/shortage detected
- Transport assigned/loaded/departed/arrived/unloaded/failed
- Location discovered/established
- Trade executed
- Owner balance became negative/non-negative
- Definition unlocked
- Location activated/deactivated
- Optional-module events (scenario result, disruption started/ended)
- Command accepted/rejected

Event ordering follows system commit ordering. Events include session ID, tick, sequence, involved entities, definition handles/IDs, and numeric payload.

---

## 10. Content Runtime

### 10.1 Registry

At startup, all packages are merged into immutable registries by definition type. References resolve to handles. The runtime stores:

- String ID to handle map
- Handle to compiled definition array
- Tag indexes
- Dependency indexes
- Compiled expressions and curves

### 10.2 Compiled conditions

Configuration expressions compile to a typed internal expression tree or bytecode. Compilation validates types, scopes, references, and deterministic operators. No string parsing occurs in simulation hot loops.

### 10.3 Curves

Configured effects use deterministic piecewise-linear or lookup curves. Unsupported arbitrary functions are rejected.

---

## 11. Spatial Policy Interface

The simulation domain uses an abstraction:

```text
ISpatialPolicy
  ValidatePlacement(definition, location, transform)
  AddEntity(entity, footprint)
  RemoveEntity(entity)
  QueryDistance(a, b, metric)
  QueryCoverage(provider, consumer)
  QueryConnections(entity)
  QueryLocationCapacity(location)
```

Implementations may provide:

- Rectangular grid
- Hex grid
- Navigation graph
- Abstract capacity bins

Spatial-policy output is authoritative and deterministic.

---

## 12. Inventory Access Policy

Production and needs use:

```text
IInventoryAccessPolicy
  FindAccessibleInventories(requester, resource, purpose)
  RequestReservation(...)
  RequestCapacityReservation(...)
```

Implementations:

- Shared location
- Throughput-limited shared location
- Connected graph
- Explicit logistics only

Every access request carries a purpose. Quantities locked for that purpose (purpose locks) are treated as unavailable to the request but remain available for all other purposes.

This decouples economic mechanics from one logistics-detail level.

---

## 13. Capability Allocation Architecture

Each tick:

1. Clear recomputed capability pools.
2. Evaluate providers.
3. Aggregate by scope.
4. Sort or group consumer requests by configured model.
5. Allocate deterministically.
6. Publish allocation components.

Capability output does not enter normal storable inventories unless explicitly defined as storable.

Matching is exact by definition handle. A request is satisfied only from the pool of the referenced capability or from pools listed in an explicit substitution list. No implicit tier ordering exists.

Internal-logistics throughput uses the same pool mechanism with a proportional allocation model (phase 10).

---

## 14. Transport Architecture

### 14.1 Physical transport

Physical transport entities use path connections and handling states. Movement progress is deterministic and independent of rendered interpolation.

Traversal time of a connection for a unit is `ceil(base_duration_ticks × 1000 ÷ speed_permille)`, where `base_duration_ticks` belongs to the connection (time at reference speed 1000) and `speed_permille` to the transport unit.

### 14.2 Abstract transport

Abstract transport creates scheduled transfer instances with departure, arrival, cargo, and connection path. It emits the same load/depart/arrive/unload events.

### 14.3 Route planner

Path selection is stable for equal-cost paths using connection ID ordering. Replanning occurs only when the path becomes invalid or a command changes route policy.

### 14.4 Order modes and stations

A route is an ordered station list. A `StationCursor` holds the current station index; the unit advances it after all station actions complete or fail according to policy. Typed cargo slots are assigned to resources at load time in stable resource-handle order and freed when empty.

- Any arrival of an owner's transport unit at a location sets that owner's knowledge state to at least `discovered` (phase 18). `explore` mode is simply an order whose only purpose is that arrival.
- `establish` executes the establishment transaction on arrival if the target is unoccupied and the cargo covers the cost.
- `trade` actions execute against the exchange's current price state in phase 17, respecting price and quantity limits.

### 14.5 Exchange price state

Each exchange holds, per resource, a current buy price, a current sell price, and a rolling volume window. Trades update the window and adjust prices by fixed-point steps; phase 28 applies recovery toward base prices. With multiple owners, all owners share one price state per exchange.

---

## 15. Save and Load

### 15.1 Save header

```text
Framework version
Schema version
Content package IDs and semantic versions
Configuration checksum
Session ID
Simulation tick
Tick duration
Seed and deterministic stream states
State hash algorithm version
```

### 15.2 Authoritative state

Save:

- Entity allocator state
- All authoritative components
- Inventories, reservations, and purpose locks
- Pending transactions
- Unlock state
- Owner knowledge state
- Exchange price state and volume windows
- Deficit pause state and order
- Sustained-condition timers
- Transport orders, routes, and station cursors
- Pending transitions
- Optional-module state and random-stream positions
- Accepted future commands
- Metrics required for need windows

Do not mix presentation state into the authoritative save.

### 15.3 Snapshot procedure

At a tick boundary, create an immutable copy-on-write or serialized snapshot. Saving may then proceed asynchronously. On failure, the previous valid save remains intact.

### 15.4 Migration

Migration is explicit and versioned:

```text
old schema + old package versions
 → schema migration
 → definition ID migration
 → state migration
 → validation
 → new save
```

A missing required definition is a load error unless a migration or fallback definition is provided by package metadata.

---

## 16. Determinism and Replay

### 16.1 Determinism rules

- Integer ticks only
- Fixed-point authoritative quantities
- Stable iteration and commit order
- Seeded random streams only, if used by a configuration extension or optional module (e.g. disruptions)
- Fixed-point exchange price arithmetic
- No wall-clock reads
- No unordered-container iteration affecting state
- No platform-dependent floating-point authority
- Versioned algorithms and state hashes

### 16.2 Replay

A replay consists of:

- Configuration checksum and package versions
- Initial seed and starting snapshot
- Ordered accepted command stream

Replaying must reproduce periodic state hashes.

---

## 17. Networking Readiness

The architecture supports host-authoritative or deterministic lockstep operation.

Network messages distinguish:

- Proposed commands
- Accepted command schedule
- Snapshot chunks
- Incremental projections
- Domain-event stream
- State-hash checkpoints

Presentation clients cannot submit state mutations outside commands.

---

## 18. Performance Model

Optimization principles:

- Aggregate population by residence or configured population group
- Structure-of-arrays for hot components
- Dirty flags for spatial/connectivity rebuilds
- Definition handles instead of strings in hot loops
- Batch resource transactions
- Incremental need-window statistics
- Partition by location
- Pool temporary command buffers
- Avoid per-tick allocation

Performance targets belong to configured products, not the framework GDD, but benchmark scenarios must be supported.

---

## 19. Error Handling and Diagnostics

Every blocked state exposes structured diagnostics. The framework maintains traceability for:

- Resource source and sink
- Reservations and purpose locks
- Process block reasons
- Throughput throttling
- Capability shortages
- Need demand and delivery
- Satisfaction and band changes
- Transition-condition results
- Transport failures
- Trades and price changes
- Deficit pauses and resumes
- Unlock-condition results

Developer diagnostics must allow tracing a resource quantity through production and transport transactions.

---

## 20. Required Debug and Tooling Interfaces

- Pause and step N ticks
- Inspect entity components
- Inspect definition references
- Inspect inventory and reservation ledger
- Inspect capability providers, requests, and allocations
- Inspect compiled conditions
- Inspect process state and block reasons
- Inspect transport path and order state
- Export state snapshot
- Export transaction journal
- Compare state hashes
- Execute headless scenario
- Validate packages
- Visualize dependency graphs through a separate tool

Tooling uses queries and privileged commands, not direct component mutation in production builds.

---

## 21. Architectural Acceptance Criteria

- A headless runner can execute a full progression and logistics scenario.
- A headless runner can execute exploration, establishment, trade, and a deficit loss spiral with recovery.
- Replaying the same command stream produces matching hashes.
- A presentation client can be removed without affecting the simulation.
- A resource, recipe, tier, need, building, location, region, exchange, and transport type can be added without new simulation code.
- All external state changes use commands.
- All client state reads use projections or queries.
- Save/load reproduces uninterrupted state after at least 10,000 ticks.
- Configuration validation prevents unresolved references and known deadlocks.
