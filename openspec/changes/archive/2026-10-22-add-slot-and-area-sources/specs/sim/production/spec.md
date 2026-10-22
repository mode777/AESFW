# Spec Delta

## MODIFIED Requirements

### Requirement: Resource sources
A `resourceSource` SHALL carry a policy of `infinite_rate`, `finite_deposit`, `regenerating_deposit`, `slot_dependent`, `area_dependent`, or `condition_dependent`, an output list of `(resource, rate, remaining)`, and an inventory. An `infinite_rate` source SHALL have `remaining: null` and deposit `rate` per tick. A `finite_deposit` source SHALL deposit `min(rate, remaining)` per tick and reduce `remaining` by the deposited amount, never below `0`. A `regenerating_deposit` source SHALL deposit `min(rate, remaining)`, reduce `remaining` by the deposited amount, and then replenish `remaining` by its regeneration rate, never above its maximum. A `slot_dependent` source SHALL extract like an infinite source but SHALL be blocked unless it holds a matching source slot. An `area_dependent` source SHALL extract its rate scaled by a referenced location property. A `condition_dependent` source SHALL extract like an infinite source but SHALL be blocked while its condition does not hold.

Source: GDD-9.5, GDD-10.4, GDD-6.5

#### Scenario: An infinite source deposits its rate
- **WHEN** an infinite source with rate `1000` advances one tick
- **THEN** `1000` of its resource is deposited into its inventory

#### Scenario: A finite source depletes
- **WHEN** a finite source with rate `1000` and remaining `1500` advances two ticks
- **THEN** it deposits `1000` then `500`, and `remaining` is `0`

#### Scenario: An exhausted finite source deposits nothing
- **WHEN** a finite source with remaining `0` advances
- **THEN** it deposits nothing

#### Scenario: A regenerating deposit replenishes
- **WHEN** a regenerating source with rate `100`, remaining `300`, regeneration `200`, and maximum `500` advances one tick
- **THEN** it deposits `100` and `remaining` is `400`

#### Scenario: A regenerating deposit is capped at its maximum
- **WHEN** a regenerating source with rate `100`, remaining `400`, regeneration `200`, and maximum `500` advances one tick
- **THEN** it deposits `100` and `remaining` is `500`

### Requirement: Process advancement
Phase 12 SHALL increase the progress of every `processing` producer by one. It SHALL compute each source's pending output and reduce a finite or regenerating source's remaining amount; it SHALL replenish a regenerating source by its regeneration rate up to its maximum. It SHALL skip a source that carries any block reason. It SHALL scale an area-dependent source's output by `floor(rate × propertyValue / 1000)`, where `propertyValue` is the referenced location property value in permille, or `0` when the location does not carry the property.

Source: GDD-10.2, GDD-10.4, GDD-9.5, GDD-6.5

#### Scenario: A processing producer advances
- **WHEN** a `processing` producer with progress `3` advances
- **THEN** its progress is `4`

#### Scenario: A blocked source extracts nothing
- **WHEN** a source with block reason `no_source_slot` advances
- **THEN** it deposits nothing

#### Scenario: An area source scales by its property
- **WHEN** an area-dependent source with rate `66` and `scale_by_property` `test.property.suitability` at a location whose property is `500` advances
- **THEN** it deposits `33` of its resource

#### Scenario: An area source without the property extracts nothing
- **WHEN** an area-dependent source with rate `66` and `scale_by_property` `test.property.suitability` at a location without that property advances
- **THEN** it deposits nothing

### Requirement: Block reasons are consistent with processing
A producer with a non-empty block-reason list SHALL NOT be `processing`, and a `processing` producer SHALL have no block reasons other than `throughput_throttled` (INV-22). A source with a non-empty block-reason list SHALL NOT extract and SHALL NOT hold a slot binding or a working-area claim (INV-22).

Source: GDD-10.3, INV-22

#### Scenario: A blocked producer is not processing
- **WHEN** a producer is `blocked` with `missing_input`
- **THEN** its state is not `processing`

#### Scenario: A processing producer has no block reasons
- **WHEN** a producer is `processing`
- **THEN** its block reasons are empty or `['throughput_throttled']`

#### Scenario: A blocked source holds no slot binding or area claim
- **WHEN** a source is blocked with `no_source_slot`
- **THEN** it holds no slot binding and no working-area claim

## ADDED Requirements

### Requirement: Location source slots
A location SHALL carry a finite count of source slots per slot type, possibly zero, ordered ascending by type. A location without `sourceSlots` SHALL have zero slots of every type. The slot count SHALL be the only scarcity of a slot-dependent source: a slot has unlimited operating life.

Source: GDD-9.5, CONT-6.4

#### Scenario: A location reports its slots ascending by type
- **WHEN** a location declares slots `test.slot.b: 0` and `test.slot.a: 2`
- **THEN** its slots are `[{ type: test.slot.a, count: 2 }, { type: test.slot.b, count: 0 }]`

#### Scenario: A location without slots has none
- **WHEN** a location declares no `sourceSlots`
- **THEN** the count of every slot type is `0`

#### Scenario: A zero count yields no slot
- **WHEN** a location declares `test.slot.a: 0` and a slot-dependent source requires `test.slot.a`
- **THEN** the source is blocked with `no_source_slot`

### Requirement: Slot-dependent extraction binding
Phase 07 SHALL bind exactly one slot-dependent source to one matching slot of a location, in ascending entity-ID order, persisting a `SourceSlotBinding` carrying the slot type and the location. A source SHALL be blocked with `no_source_slot` when its required slot type has no free slot at its location, including when the source names no slot type or its location is absent. A bound slot SHALL have unlimited operating life and SHALL remain bound across ticks while the source stays eligible.

Source: GDD-9.5, ARCH-3.4, ARCH-5.2, CONT-6.8

#### Scenario: The first sources by ascending ID claim the slots
- **WHEN** a location has `2` slots of `test.slot.a` and slot-dependent sources `5`, `6`, and `7` all require `test.slot.a`
- **THEN** sources `5` and `6` each carry a `SourceSlotBinding` and source `7` is blocked with `no_source_slot`

#### Scenario: A bound slot persists across ticks
- **WHEN** a bound slot-dependent source is evaluated again on a later tick
- **THEN** it still carries its `SourceSlotBinding` and has no block reasons

#### Scenario: A source with no matching slot type is blocked
- **WHEN** a slot-dependent source requires `test.slot.b` at a location with `0` slots of `test.slot.b`
- **THEN** it is blocked with `no_source_slot`

#### Scenario: A source without a slot type is blocked
- **WHEN** a slot-dependent source names no slot type
- **THEN** it is blocked with `no_source_slot`

### Requirement: Area-dependent extraction and working-area claims
An area-dependent source SHALL require a working area in addition to its footprint. Phase 07 SHALL assign a `WorkingAreaClaim` carrying the location, the cell count, and the `exclusive` flag, in ascending entity-ID order, when the location's free cells (capacity minus used minus already-claimed cells) are at least the source's working-area cell count. A source SHALL be blocked with `no_working_area` when the free cells are fewer than its working-area cell count, including when it names no working area. Its per-tick output SHALL be `floor(rate × propertyValue / 1000)`, where `propertyValue` is the referenced location property value in permille and is `0` when the property is absent; the scaling SHALL be linear and deterministic.

Source: GDD-9.5, GDD-6.5, ARCH-3.4, ARCH-5.2, CONT-6.8

#### Scenario: An area source claims its working area
- **WHEN** an area-dependent source with `12` working-area cells is evaluated at a location with capacity `100` and used `0`
- **THEN** it carries a `WorkingAreaClaim` with `cells: 12` and `exclusive: true` and has no block reasons

#### Scenario: The first area source by ascending ID claims the area
- **WHEN** a location with capacity `20` and used `0` hosts two area-dependent sources with `12` working-area cells each
- **THEN** the lower-ID source carries a claim and the higher-ID source is blocked with `no_working_area`

#### Scenario: An area source without a working area is blocked
- **WHEN** an area-dependent source names no working area
- **THEN** it is blocked with `no_working_area`

#### Scenario: Area output scales linearly by the property
- **WHEN** an area-dependent source with rate `66` references `test.property.suitability` and the location property is `1000`
- **THEN** its per-tick output is `66`, and at `500` it is `33`

### Requirement: Resource-source preconditions
Phase 07 SHALL set a source's block reasons in ascending entity-ID order: `entity_disabled` when disabled, `paused_by_deficit` when deficit-paused, `location_inactive` when its location is inactive, `missing_inventory_access` when its inventory is absent or when it carries a connectivity requirement but is not connected, `condition_false` when it is condition-dependent and its condition does not hold, `no_source_slot` when it is slot-dependent and cannot bind a slot, and `no_working_area` when it is area-dependent and cannot claim an area. A source with any block reason SHALL NOT extract and SHALL carry the block reasons; a source with no block reason SHALL carry no block reasons and SHALL extract.

Source: GDD-10.3, GDD-10.2, GDD-9.5, ARCH-5.2

#### Scenario: A disabled source is blocked
- **WHEN** a disabled source is evaluated in phase 07
- **THEN** its block reasons are `['entity_disabled']` and it deposits nothing

#### Scenario: A deficit-paused source is blocked
- **WHEN** a deficit-paused source is evaluated in phase 07
- **THEN** its block reasons include `paused_by_deficit`

#### Scenario: A source at an inactive location is blocked
- **WHEN** a source at an inactive location is evaluated
- **THEN** its block reasons include `location_inactive`

#### Scenario: A source without inventory access is blocked
- **WHEN** a source has no inventory, or carries a connectivity requirement and is not connected
- **THEN** its block reasons include `missing_inventory_access`

#### Scenario: A condition-dependent source is blocked while its condition is false
- **WHEN** a condition-dependent source whose condition does not hold is evaluated
- **THEN** its block reasons include `condition_false`

#### Scenario: A clean source is not blocked
- **WHEN** an enabled, connected, active source with a free slot is evaluated
- **THEN** it carries no block reasons and extracts

#### Scenario: Block reasons are ordered
- **WHEN** a disabled source at an inactive location is evaluated
- **THEN** its block reasons are `['entity_disabled', 'location_inactive']`
