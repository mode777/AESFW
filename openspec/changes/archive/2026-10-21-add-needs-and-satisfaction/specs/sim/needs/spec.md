# Spec Delta

## Purpose

The need framework: per-residence need demand, delivery from accessible inventories, fulfillment measured over a window, category aggregation under every mode, and residence satisfaction `Z`, all bounded to `[0, 1000]` (GDD-12, INV-08).

## ADDED Requirements

### Requirement: Need and category specification
A residence SHALL carry its needs and categories. A need SHALL carry its category, type (`resource_consumption` or `resource_availability`), resource, per-capita per-tick demand, measurement window length, and target ratio. A category SHALL carry its mode (`all`, `any`, `count`, `weighted_score`, `average`, or `minimum`), its required score, and its weighted members.

Source: GDD-12.1, GDD-12.3

#### Scenario: A residence carries its needs and categories
- **WHEN** a residence with one resource-consumption need and one weighted-score category is created
- **THEN** reading it returns the need and the category

### Requirement: Need state and satisfaction state
A `needStates` component SHALL carry, per need in ascending need handle, the demanded amount and a delivery window of the last `measurement_window_ticks` delivered amounts. A `satisfaction` component SHALL carry the fulfillment of every active category and the residence satisfaction `Z`.

Source: GDD-12.4, GDD-12.5

#### Scenario: Need state starts empty
- **WHEN** a residence with a need is created
- **THEN** its need state has demand `0` and an empty window

### Requirement: Population demand
Phase 08 SHALL, for each residence in ascending entity ID, compute each need's raw demand as `floor(quantity_per_population_per_tick × count × consumption_factor / 1000)` and store it in the need state.

Source: GDD-12.4, GDD-4.2

#### Scenario: Demand scales with population
- **WHEN** a residence with count `10`, per-capita demand `2`, and consumption factor `1000` is evaluated
- **THEN** its demand is `20`

#### Scenario: The consumption factor scales demand
- **WHEN** the same residence has consumption factor `2000`
- **THEN** its demand is `40`

### Requirement: Need delivery
Phase 20 SHALL, for each residence in ascending entity ID, deliver each need from the inventories accessible through `shared_location`. A `resource_consumption` need SHALL consume the delivered amount from those inventories; a `resource_availability` need SHALL test availability without consuming. The delivered amount SHALL NOT exceed the demand. It SHALL append the delivered amount to the need window and trim the window to its length.

Source: GDD-12.2, GDD-12.4, ARCH-12

#### Scenario: A consumption need consumes its resource
- **WHEN** a residence demands `20` and its location holds `50`
- **THEN** `20` is consumed, `30` remains, and the window records `20`

#### Scenario: Delivery is limited by availability
- **WHEN** a residence demands `20` and its location holds `5`
- **THEN** `5` is consumed and the window records `5`

#### Scenario: An availability need does not consume
- **WHEN** an availability need is delivered
- **THEN** the inventory quantity is unchanged

### Requirement: Fulfillment and category aggregation
Phase 21 SHALL compute each need's fulfillment as `min(1000, floor(1000 × Σwindow / (demand × window length)))`, or `1000` when the demand or window is empty. It SHALL aggregate each active category under its mode: `all` takes the minimum member fulfillment, `any` the maximum, `average` the mean, `minimum` the minimum, `count` the proportion of members at or above the target ratio up to `required_score`, and `weighted_score` the weighted sum divided by the required score, capped at `1000`.

Source: GDD-12.3, GDD-12.4

#### Scenario: A fully supplied category scores 1000
- **WHEN** every member need of an `all` category is fully delivered
- **THEN** the category fulfillment is `1000`

#### Scenario: Weighted score rewards breadth and depth
- **WHEN** a `weighted_score` category with required score `2000` has one member at fulfillment `1000` with weight `2000`
- **THEN** the category fulfillment is `1000`

#### Scenario: An unmet need lowers the category
- **WHEN** an `all` category has one member at fulfillment `500`
- **THEN** the category fulfillment is `500`

### Requirement: Residence satisfaction
Phase 21 SHALL set residence satisfaction `Z` from the active category fulfillments under the configured aggregation: `average` (the arithmetic mean, the default) or `minimum` (the weakest category).

Source: GDD-12.5

#### Scenario: Satisfaction averages active categories
- **WHEN** two active categories have fulfillments `1000` and `500` under `average`
- **THEN** `Z` is `750`

#### Scenario: Minimum aggregation takes the weakest
- **WHEN** two active categories have fulfillments `1000` and `500` under `minimum`
- **THEN** `Z` is `500`

### Requirement: Fulfillment values are bounded
Every need fulfillment, category fulfillment, and residence satisfaction SHALL lie in `[0, 1000]` (INV-08).

Source: INV-08, GDD-12

#### Scenario: Fulfillment is capped at 1000
- **WHEN** a need's delivered amount exceeds its demand over the window
- **THEN** its fulfillment is `1000`
