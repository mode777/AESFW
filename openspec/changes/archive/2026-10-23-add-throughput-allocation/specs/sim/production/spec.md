# Spec Delta

## MODIFIED Requirements

### Requirement: Process advancement
Phase 12 SHALL increase the progress of every `processing` producer by one, clamped to its effective completion duration. It SHALL compute each source's pending output and reduce a finite or regenerating source's remaining amount; it SHALL replenish a regenerating source by its regeneration rate up to its maximum. It SHALL skip a source that carries any block reason. It SHALL scale an area-dependent source's output by `floor(rate × propertyValue / 1000)`, where `propertyValue` is the referenced location property value in permille, or `0` when the location does not carry the property. It SHALL scale a source's output by the requester's granted throttle permille, or `1000` when the source is unbounded.

Source: GDD-10.2, GDD-10.4, GDD-9.5, GDD-6.5, GDD-15.1

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

#### Scenario: A throttled source reduces its deposit
- **WHEN** a source plans `1000` output and its throughput allocation is `250` permille
- **THEN** phase 12 computes `250` pending output and reduces a finite deposit by `250`

#### Scenario: An unbounded source is not scaled
- **WHEN** a source is at a location without throughput limiting
- **THEN** phase 12 computes its full planned output

### Requirement: Atomic production completion
Phase 13 SHALL, for a batch producer whose progress reached its duration and for a continuous producer each tick, atomically commit the reserved inputs, deposit the outputs, and release the capacity reservations; it SHALL set the producer to `idle` with progress `0`. A throttled completion SHALL commit `floor(input × throttle_permille / 1000)` and deposit `floor(output × throttle_permille / 1000)`, releasing the uncommitted remainder of each input reservation. A producer granted zero throughput SHALL NOT complete: it SHALL remain `processing` at its completion duration with its reservations held. It SHALL deposit a source's pending output. A completion SHALL commit all scaled inputs and deposit all scaled outputs, or neither (INV-15).

Source: GDD-10.4, ARCH-6.2, TDS-12.2, INV-15, TDS-11.3

#### Scenario: A batch producer completes
- **WHEN** a batch producer with duration `10` and progress `10` completes
- **THEN** its inputs are consumed, its outputs are deposited, its reservations are released, and its state is `idle`

#### Scenario: A continuous producer commits each tick
- **WHEN** a continuous producer advances one tick
- **THEN** it commits its per-tick inputs and deposits its per-tick outputs in the same tick

#### Scenario: A source's pending output is deposited
- **WHEN** a source has pending output from phase 12
- **THEN** phase 13 deposits it into the source's inventory

#### Scenario: An unthrottled completion is unchanged
- **WHEN** a producer completes with input `600`, output `400`, and throttle `1000` permille
- **THEN** it commits `600` and deposits `400`

#### Scenario: A throttled completion scales both sides
- **WHEN** a producer completes with input `600`, output `400`, and throttle `500` permille
- **THEN** it commits `300` and deposits `200`

#### Scenario: Zero throttle defers completion
- **WHEN** a batch producer reaches its duration with throttle `0` permille
- **THEN** it remains `processing` and no input is committed
