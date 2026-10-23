# Spec Delta

## ADDED Requirements

### Requirement: Quantity rule targets
A station action SHALL compute its target quantity from its rule. For a load, the rule SHALL measure the origin inventory and the cargo's free capacity; for an unload, it SHALL measure the cargo and the destination inventory. The target SHALL never exceed the available quantity on the acting side.

Source: GDD-15.3

#### Scenario: Fixed uses the configured quantity
- **WHEN** a load uses `fixed` with quantity `30` and the origin holds `100`
- **THEN** the target is `30`

#### Scenario: Up to capacity uses cargo space
- **WHEN** a load uses `up_to_capacity`, cargo has `150` of `200`, and the origin holds `100`
- **THEN** the target is `50`

#### Scenario: All carried unloads the cargo
- **WHEN** an unload uses `all` and cargo holds `40`
- **THEN** the target is `40`

### Requirement: Reserve and deficit rules
`excess_above` and `maintain_origin_minimum` SHALL leave the configured quantity on the acting side. For a load they leave that quantity in the origin inventory; for an unload they leave it in cargo. `deficit_below` and `maintain_destination_target` SHALL move only the quantity needed to reach the configured target: for an unload the destination inventory, and for a load the cargo.

Source: GDD-15.3

#### Scenario: Excess above origin reserve leaves the reserve
- **WHEN** a load uses `excess_above` with quantity `70` and the origin holds `100`
- **THEN** the target is `30`

#### Scenario: Deficit below destination target fills the deficit
- **WHEN** an unload uses `deficit_below` with quantity `70`, the destination holds `50`, and cargo holds `40`
- **THEN** the target is `20`

#### Scenario: Maintain destination target does nothing when already met
- **WHEN** an unload uses `maintain_destination_target` with quantity `70` and the destination holds `80`
- **THEN** the target is `0`

### Requirement: Priority list
`priority_list` SHALL choose the first configured quantity that can be fully moved on the acting side. If no quantity fits, the target SHALL be `0`.

Source: GDD-15.3

#### Scenario: The first fitting quantity wins
- **WHEN** a load lists `[80, 40, 10]`, the origin holds `50`, and cargo free space is `100`
- **THEN** the target is `40`

#### Scenario: No fitting quantity yields zero
- **WHEN** an unload lists `[80, 40]` and cargo holds `20`
- **THEN** the target is `0`
