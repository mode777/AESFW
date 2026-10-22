# Abstract Economic Simulation Framework
## Presentation Integration Contract

**Version:** 1.1  
**Status:** Client integration baseline

---

## 1. Purpose

This contract ensures that visual, textual, audio, and interactive clients remain fully decoupled from the authoritative simulation.

The same simulation must support:

- 2D client
- 3D client
- Text client
- Administrative dashboard
- Automated balancing client
- Headless test runner
- Networked client

Presentation may interpret state but may not determine it.

---

## 2. Responsibilities

### 2.1 Presentation may

- Render locations, entities, transport, and population aggregates
- Display quantities, rates, fulfillment, eligibility, and diagnostics
- Resolve localization
- Map definitions to models, sprites, icons, sounds, and animations
- Interpolate motion between authoritative states
- Convert gestures into application commands
- Maintain non-authoritative view state

### 2.2 Presentation may not

- Calculate authoritative production
- Consume or create resources
- Determine inventory access
- Determine need fulfillment or satisfaction
- Allocate capabilities or throughput
- Advance population or transitions
- Unlock definitions
- Decide final placement validity
- Calculate exchange prices or execute trades
- Reveal location attributes the owner has not discovered
- Modify components or saves directly

---

## 3. Boundary Interfaces

```text
Client → Command Gateway → Application/Simulation
Client ← Command Results
Client ← Definition Metadata
Client ← Immutable Snapshots / Deltas
Client ← Ordered Domain Events
```

The presentation layer never receives mutable domain objects.

---

## 4. Definition Metadata

A client receives mechanically safe metadata:

- Stable definition ID
- Definition type
- Tags permitted for display grouping
- Optional presentation key
- Exposed numeric parameters
- Available commands under current unlock and permissions

Mechanics definitions remain authoritative. Clients must not infer behavior from display categories.

---

## 5. Presentation Package

```yaml
package:
  id: example.presentation
  version: 1.0.0
  schema_version: 1
  type: presentation_content
  dependencies:
    - package: example.game
      version: ">=1.0.0 <2.0.0"
  files:
    - localization.yaml
    - mappings.yaml
    - assets.yaml
    - formatting.yaml
```

A headless server does not load this package.

---

## 6. Presentation Mapping

```yaml
presentation_mapping:
  target_definition: example.entity.producer_c
  localization:
    name_key: example.entity.producer_c.name
    description_key: example.entity.producer_c.description
  visual:
    model_key: example.model.producer_c
    icon_key: example.icon.producer_c
    fallback_shape: box
  audio:
    active_loop_key: example.audio.producer_c.active
    completion_key: example.audio.producer_c.complete
  display:
    category_key: example.category.production
    sort_order: 100
```

Missing mappings are legal. Clients use generic fallbacks.

---

## 7. Localization

```yaml
localization:
  locale: en
  entries:
    example.entity.producer_c.name: "Processor C"
    example.entity.producer_c.description: "Transforms configured input resources."
    framework.error.missing_input: "Missing {resource}: {quantity}"
```

Rules:

- Simulation emits keys and arguments, never localized strings.
- Clients select locale.
- Formatting uses locale-aware number and plural rules.
- Missing entries fall back to the stable key.

---

## 8. Asset Registry

```yaml
assets:
  example.model.producer_c:
    type: model
    uri: assets/models/producer_c.glb
  example.icon.producer_c:
    type: image
    uri: assets/icons/producer_c.png
  example.audio.producer_c.active:
    type: audio
    uri: assets/audio/producer_c_active.ogg
```

Asset URIs have no meaning to the simulation.

---

## 9. Snapshot Contract

### 9.1 Full snapshot

```yaml
snapshot:
  session_id: session.1
  tick: 122400
  revision: 942
  configuration_checksum: abc123

  owners:
    - owner_id: owner.1
      resources:
        example.resource.currency: 500000
      balance:
        revenue_per_interval: 12000
        expenses_per_interval: 9500
        net_per_interval: 2500
        deficit_paused_entities: []

  locations:
    - entity_id: 100
      definition_id: example.location.standard
      owner_id: owner.1
      knowledge: established
      active: true
      properties:
        tags: [example.location.group_a]
        region: example.region.alpha
        values:
          example.property.suitability_p1: 1000
      grid:
        width: 40
        height: 40
        blocked: [0, 1, 40]
      throughput:
        capacity: 60000
        requested: 54000
        throttle_permille: 1000
      inventories:
        - inventory_id: 101
          entries:
            - resource_id: example.resource.a
              stored: 240000
              reserved: 20000
              capacity: 500000
              purpose_locks: [population_transition]

    - entity_id: 200
      knowledge: unknown
      connections: [example.connection.a_b]

  entities:
    - entity_id: 8241
      definition_id: example.entity.producer_c
      location_id: 100
      revision: 42
      lifecycle: active
      spatial:
        logical_position: [10, 12]
        orientation: 1
        footprint: { width: 3, height: 3 }
      connectivity:
        role: requirement
        network: example.connectivity.hub_network
        connected: true
      production:
        recipe_id: example.recipe.c
        state: processing
        progress: 720
        progress_scale: 1000
        block_reasons: []
```

A grid-policy location carries its `grid` (width, height, and the packed indices of its non-buildable cells); a placed entity carries its `spatial.footprint`; an entity that carries a connectivity node exposes its `connectivity` role, network, and derived connected state. (Amended by A9, 05 §26.)

### 9.2 Incremental delta

```yaml
snapshot_delta:
  session_id: session.1
  from_revision: 942
  to_revision: 943
  tick: 122401
  entity_updates:
    - entity_id: 8241
      component: production
      fields:
        progress: 730
  inventory_updates:
    - inventory_id: 101
      resource_id: example.resource.a
      stored: 238000
      reserved: 0
```

Deltas are applied only to the matching base revision. On mismatch, request a new full or partition snapshot.

### 9.3 Owner-filtered visibility

Snapshots, deltas, read models, and events are produced **per actor**. When fog is enabled, a location whose knowledge state is `unknown` for the actor appears only with its ID and known connections (location 200 above); property values, region, grid geometry, connectivity, and foreign entities are omitted by the adapter. (Amended by A10, 05 §26.) Clients therefore cannot leak undiscovered information, even if modified. A `LocationDiscovered` event is followed by the newly visible attributes in the next delta.

---

## 10. Read Models

The adapter may expose purpose-built read models.

### 10.1 Entity detail

- Definition and lifecycle
- Location and owner
- Enabled state, including `paused_by_deficit`
- Available commands
- Production recipe, progress, inputs, outputs
- Block reasons, including throughput throttling
- Capability request/allocation
- Maintenance amount and charge policy
- Inventory contents and purpose locks
- Residence population, needs, satisfaction, and current band
- Transition eligibility with condition breakdown, including sustained-timer progress

### 10.2 Location summary

- Knowledge and active state
- Region and property vector (if discovered)
- Source slots, used and free (if discovered)
- Capacity/topology summary
- Inventory totals
- Population totals by tier
- Capability totals by capability
- Throughput capacity, requested, and throttle factor
- Entity counts
- Connections and endpoints
- Net production/consumption rates

**Delivery.** The location summary is delivered incrementally. Grid topology and the property vector are read from the snapshot (§9.1); the summary reports the aggregates. A field may not be depended on by a client until a roadmap row owns its delivery, and every row that adds a field cites this section (08 §7.4). (Amended by A11, 05 §26.)

### 10.3 Need breakdown

- Need ID
- Demand rate (after tier consumption factor)
- Delivered rate
- Fulfillment history/window
- Current fulfillment
- Category contribution (weight × capped fulfillment)
- Category result versus tier-specific requirement
- Residence satisfaction and band
- Effects after curves

### 10.4 Transport detail

- Assignment and order mode
- Station list and current station
- Connection path
- State
- Cargo by slot
- Loading/unloading/trading progress
- Failure reasons

### 10.5 Planning metrics

The planning read model is mandatory because supported population is the framework's primary planning currency (Core Game Framework GDD, "The planning currency").

For each resource consumed by needs, per location and per owner:

- Net production rate
- Per-capita demand per consuming tier (after consumption factor)
- **Supported population per consuming tier**
- Current consuming population and coverage ratio

For each chain (a selected set of producers, or the producers feeding a resource):

- Output rate
- Entity counts per stage and their integer ratio
- Footprint, capability demand by capability, and maintenance
- Supported population per consuming tier

### 10.6 Owner economy

- Balance and its trend
- Revenue by source (population outputs by tier, exchange sales)
- Expenses by source (entity maintenance, transport maintenance, exchange purchases)
- Idle or blocked entities that still pay maintenance
- Deficit policy state and paused entities in pause order

### 10.7 Exchange quotes

- Exchange and region
- Per good: current buy and sell price, base prices, recent volume, recovery estimate
- Quote validity revision

Quotes are informative. Trades always execute at the authoritative price of the executing tick.

Derived values belong to read models and are never written back as authority.

---

## 11. Domain Event Contract

```yaml
event:
  session_id: session.1
  tick: 122400
  sequence: 18
  type: ProductionCompleted
  subjects: [8241]
  payload:
    recipe_id: example.recipe.c
    consumed:
      - resource_id: example.resource.a
        quantity: 2000
    produced:
      - resource_id: example.resource.c
        quantity: 1000
```

Presentation can animate, log, aggregate, or ignore an event. Dropping an event must not corrupt authoritative state; the next snapshot restores truth.

---

## 12. Command Submission

```yaml
command:
  command_id: client-generated-uuid
  actor_id: owner.1
  expected_session_revision: 942
  type: PlaceEntityPlan
  payload:
    definition_id: example.entity.producer_c
    location_id: 100
    logical_transform:
      position: [20, 15]
      orientation: 0
```

### 12.1 Placement preview

Clients request authoritative validation:

```yaml
placement_query:
  definition_id: example.entity.producer_c
  location_id: 100
  logical_transform:
    position: [20, 15]
    orientation: 0
```

Response:

```yaml
placement_result:
  valid: false
  revision: 942
  reasons:
    - code: insufficient_capacity
      arguments:
        required: 10
        available: 8
```

A preview may use local cached checks for responsiveness, but confirmation always uses authoritative validation.

---

## 13. Command Results

Accepted:

```yaml
command_result:
  command_id: client-generated-uuid
  status: accepted
  scheduled_tick: 122402
```

Rejected:

```yaml
command_result:
  command_id: client-generated-uuid
  status: rejected
  current_revision: 944
  errors:
    - code: state_revision_mismatch
      arguments:
        expected: 942
        actual: 944
```

Error codes are stable machine identifiers. Text is localized client-side.

---

## 14. Rendering and Interpolation

Authoritative positions are logical. Visual interpolation:

- May smooth between snapshots
- May animate event consequences
- Must converge to authoritative state
- Must not delay command submission
- Must not substitute visual collision for placement validation

Visual citizens, vehicles, particles, and animations are non-authoritative unless a configured transport entity is represented by authoritative movement state.

---

## 15. UI Interaction Contract

A generic client should support these framework interactions:

- Inspect location
- Inspect entity
- Inspect inventory
- Inspect production and block reasons
- Inspect residence, needs, satisfaction, and transition eligibility
- Inspect planning metrics (supported population per chain)
- Inspect owner economy and exchange quotes
- Place/cancel/construct/deconstruct entity
- Enable/disable entity
- Resume entities paused by deficit policy
- Select recipe
- Set priorities and inventory policies
- Lock/unlock a resource for a purpose (e.g. pacing advancement)
- Request transition
- Create/edit/delete transport order (route, explore, establish, trade)
- Assign/unassign transport
- Activate/deactivate location

The framework does not prescribe screen layout, input device, camera, art style, or terminology.

---

## 16. Presentation State

Client-local state includes:

- Camera or viewport
- Selection
- Open panels
- Filters
- Pins
- Overlay preferences
- Animation settings
- Locale
- Accessibility settings

It is stored separately from authoritative saves. Shared collaborative UI state, if desired, must use explicit non-simulation channels.

---

## 17. Accessibility and Alternate Clients

Because mechanics are independent from assets, clients can provide:

- Screen-reader-friendly text projections
- High-contrast or pattern overlays
- Keyboard-only command navigation
- Tabular economy views
- Reduced-motion visuals
- Sonification
- Command-line interfaces

All clients use the same query and command semantics.

---

## 18. Failure and Resynchronization

Clients must handle:

- Missing presentation mappings
- Unknown optional event types
- Delta revision mismatch
- Connection loss
- Command rejection
- Definition package mismatch

Resynchronization:

1. Stop applying deltas after mismatch.
2. Request full or partition snapshot.
3. Replace local projection.
4. Resume from returned revision.

---

## 19. Presentation Validation

Validation checks:

- Target simulation definition exists
- Referenced asset keys exist
- Localization keys are syntactically valid
- No presentation package attempts to modify simulation definitions
- Fallback representation exists globally
- Command controls reference valid command types

Missing nonessential assets produce warnings and fallbacks, not simulation load failures.

---

## 20. Integration Acceptance Criteria

- The authoritative simulation runs with no presentation package.
- Two different clients can display the same session concurrently.
- Replacing all models, icons, names, and sounds does not alter state hashes.
- A missed domain event is corrected by the next snapshot.
- Every user mutation maps to a validated command.
- Every displayed mechanic can be traced to snapshot/query data. A value absent from §9, §10, or §12 SHALL NOT be displayed; extending a view therefore extends the contract and its owning roadmap row first (08 §7.4). (Amended by A12, 05 §26.)
- Supported population per chain can be displayed for every consumed resource.
- No projection exposes attributes of locations unknown to the requesting owner.
- Missing mappings use generic fallbacks.
- Presentation state can be discarded without losing simulation state.
