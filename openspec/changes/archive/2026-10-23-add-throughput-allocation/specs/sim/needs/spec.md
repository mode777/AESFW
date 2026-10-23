# Spec Delta

## MODIFIED Requirements

### Requirement: Need delivery
Phase 20 SHALL, for each residence in ascending entity ID, deliver each need from the inventories accessible through `shared_location`. A `resource_consumption` need SHALL consume the delivered amount from those inventories; a `resource_availability` need SHALL test availability without consuming. The delivered amount SHALL NOT exceed the demand. When the residence is at a throughput-limited location, the delivered amount SHALL be `floor(availableDelivery × throttle_permille / 1000)`, using the residence's granted throughput. It SHALL append the delivered amount to the need window and trim the window to its length.

Source: GDD-12.2, GDD-12.4, ARCH-12, GDD-15.1

#### Scenario: A consumption need consumes its resource
- **WHEN** a residence demands `20` and its location holds `50`
- **THEN** `20` is consumed, `30` remains, and the window records `20`

#### Scenario: Delivery is limited by availability
- **WHEN** a residence demands `20` and its location holds `5`
- **THEN** `5` is consumed and the window records `5`

#### Scenario: An availability need does not consume
- **WHEN** an availability need is delivered
- **THEN** the inventory quantity is unchanged

#### Scenario: A throttled need delivery consumes less
- **WHEN** a residence can receive `400` and its throughput throttle is `250` permille
- **THEN** phase 20 delivers and consumes `100`

#### Scenario: An unthrottled need delivery is unchanged
- **WHEN** a residence is at a location without throughput limiting and can receive `400`
- **THEN** phase 20 delivers and consumes `400`
