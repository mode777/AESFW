# content/conditions Specification

## Purpose
The condition expression language and curves (CONT-7, CONT-8; TDS-14.1, TDS-14.2, TDS-14.4): a typed, side-effect-free expression tree compiled at load time, a pure evaluator, the domain-query table, the curve compiler and evaluator, and the `sustained` temporal operator with its authoritative timers (TDS-14.3).

## Requirements

### Requirement: Condition schema and expression tree
A condition SHALL carry `id` and an `expression`. `compileCondition(definition, registry)` SHALL compile the expression into the typed tree of TDS-14.1, supporting the boolean (`all`, `any`, `not`), comparison (`equal`, `not_equal`, `greater`, `greater_equal`, `less`, `less_equal`), arithmetic (`add`, `subtract`, `multiply`, `divide`, `min`, `max`, `clamp`), aggregation (`sum`, `count`, `average`, `minimum`, `maximum`), and domain-query operators. A node that is not a recognised operator SHALL report `unknown_operator`; a node whose shape is wrong SHALL report `invalid_condition_shape`.

Source: CONT-7.1, CONT-7.2, TDS-14.1

#### Scenario: A comparison compiles
- **WHEN** a condition is `greater_equal: { left: { residence_population: current_entity }, right: 10 }`
- **THEN** it compiles to a comparison node with `resultType` `bool`

#### Scenario: An unknown operator is reported
- **WHEN** an expression uses `telepathy`
- **THEN** compilation reports `unknown_operator`

#### Scenario: A malformed node is reported
- **WHEN** a comparison node lacks `right`
- **THEN** compilation reports `invalid_condition_shape`

### Requirement: Expression type checking
Compilation SHALL type-check operands: boolean operators require boolean operands, arithmetic and comparison operands SHALL be of matching integer or boolean types (`equal` and `not_equal` accept either), and a condition's root type SHALL be `bool` or `int`. A type mismatch SHALL report `condition_type_error`.

Source: CONT-7.1, TDS-14.1

#### Scenario: A boolean operand mismatch is reported
- **WHEN** `not` is applied to an integer literal
- **THEN** compilation reports `condition_type_error`

#### Scenario: A comparison of different types is reported
- **WHEN** `greater` compares a boolean to an integer
- **THEN** compilation reports `condition_type_error`

### Requirement: Expression evaluation
`evaluate(expr, context)` SHALL be pure and return an `Int` or boolean. `all` and `any` SHALL short-circuit; `divide` SHALL floor and SHALL yield `0` when the divisor is `0`; `average` SHALL floor; `clamp` SHALL clamp into `[lo, hi]`; domain queries and aggregations SHALL be resolved through the `EvalContext`.

Source: TDS-14.1

#### Scenario: Boolean operators short-circuit
- **WHEN** `all` is evaluated with a false first operand and a second operand that would throw
- **THEN** the result is false and the second operand is not evaluated

#### Scenario: Division floors and guards zero
- **WHEN** `divide` evaluates `7 / 2` and `1 / 0`
- **THEN** the results are `3` and `0`

#### Scenario: Clamp bounds the value
- **WHEN** `clamp` evaluates with `value 1500`, `lo 0`, `hi 1000`
- **THEN** the result is `1000`

#### Scenario: A domain query is resolved through the context
- **WHEN** a `population_count` query is evaluated with a context that returns `42`
- **THEN** the result is `42`

### Requirement: Domain-query table
The compiler SHALL recognise the initial domain queries of CONT-7.2 (`population_count`, `residence_population`, `need_category_fulfillment`, `aggregate_need_fulfillment`, `satisfaction_band`, `location_property`, `knowledge_state`, `owner_balance`, `owner_net_rate`, `exchange_price`), each returning an `Int`. An unrecognised query name SHALL report `unknown_query`.

Source: CONT-7.2, TDS-14.2

#### Scenario: A known query is recognised
- **WHEN** a condition uses `aggregate_need_fulfillment`
- **THEN** compilation reports no diagnostics and the node's type is `int`

#### Scenario: An unknown query is reported
- **WHEN** a condition aggregates `sum: { selector: { type: global }, of: { weather_forecast: current_entity } }`
- **THEN** compilation reports `unknown_query`

### Requirement: Curve schema, compilation, and evaluation
A curve SHALL carry `id`, a `type` of `constant`, `piecewise_linear`, `step`, or `lookup`, a non-empty list of `[input, output]` points, and an optional `extrapolation` of `clamp`, `linear`, or `error`. `compileCurve` SHALL sort and validate the points, reporting `invalid_curve` for an empty or malformed point list. `evaluateCurve(curve, input)` SHALL interpolate integer points: piecewise-linear uses floored `fx.mulDiv`, step and lookup select the greatest point at or below the input, and extrapolation follows the policy (`clamp` clamps to the end points, `linear` extends the end segments, `error` clamps and reports `curve_extrapolation_error`).

Source: CONT-8, TDS-14.4

#### Scenario: A piecewise-linear curve interpolates
- **WHEN** a curve has points `[[0, 0], [500, 500], [1000, 1200]]` and is evaluated at `750`
- **THEN** the result is `850`

#### Scenario: A step curve selects the lower point
- **WHEN** a step curve has points `[[0, 0], [500, 500]]` and is evaluated at `750`
- **THEN** the result is `500`

#### Scenario: An empty curve is rejected
- **WHEN** a curve has no points
- **THEN** compilation reports `invalid_curve`

#### Scenario: Clamp extrapolation bounds the result
- **WHEN** a piecewise-linear curve with points `[[0, 0], [1000, 1200]]` and `extrapolation: clamp` is evaluated at `2000`
- **THEN** the result is `1200`

### Requirement: Load-time expression compilation
`compileExpressions(definitions, registry)` SHALL compile every condition and curve definition and return their diagnostics. `loadContent` SHALL call it and include its diagnostics, so an invalid condition or curve fails the load.

Source: TDS-20.2

#### Scenario: An invalid condition fails the load
- **WHEN** a package defines a condition with an unknown operator
- **THEN** `loadContent` returns `null` content and an error-severity diagnostic
### Requirement: Sustained compilation
The compiler SHALL accept a `sustained` node of the shape `{ ticks, condition }` where `ticks` is a positive safe integer and `condition` compiles to a boolean expression, and SHALL report `condition_ticks_invalid` for a non-integer or non-positive `ticks` and the existing shape and type diagnostics for a malformed or non-boolean inner expression. A `sustained` node SHALL compile to a boolean expression.

Source: CONT-7.2, CONT-7.3, TDS-14.1, TDS-14.3

#### Scenario: A sustained node compiles with a deterministic slot
- **WHEN** a condition compiles the expression `all: [sustained: {ticks: 60, condition: true}, sustained: {ticks: 30, condition: true}]`
- **THEN** compilation succeeds and the two nodes carry slots `0` and `1` in pre-order

#### Scenario: A non-positive ticks value is a diagnostic
- **WHEN** a condition compiles `sustained: {ticks: 0, condition: true}`
- **THEN** the diagnostic `condition_ticks_invalid` is reported and no condition is produced

#### Scenario: A non-boolean inner expression is a type error
- **WHEN** a condition compiles `sustained: {ticks: 10, condition: 5}`
- **THEN** the diagnostic `condition_type_error` reporting expected `bool` is reported

### Requirement: Sustained evaluation reads the timer
Evaluating a `sustained` node SHALL return `consecutiveTrueTicks >= ticks` from the timer keyed by `(condition handle, slot, subject)` and SHALL NOT evaluate its inner expression at read time. An absent timer SHALL read as `0` consecutive ticks.

Source: TDS-14.1, TDS-14.3

#### Scenario: A timer at or above the threshold holds
- **WHEN** the timer for `(condition, slot 0, subject)` stores `60` consecutive ticks and the node requires `ticks: 60`
- **THEN** evaluation returns `true`

#### Scenario: A missing timer does not hold
- **WHEN** no timer exists for `(condition, slot 0, subject)` and the node requires `ticks: 1`
- **THEN** evaluation returns `false`

### Requirement: Phase 22 timer updates
Phase 22 SHALL, for every condition definition that contains `sustained` nodes, evaluate each node's inner expression for every subject in the condition's usage scope, in ascending `(condition handle, slot, subject)` order, and set the timer to the previous value plus one when the inner expression holds and to `0` when it does not. In v1 the usage scope of a condition referenced from an entity-definition component field SHALL be the entities carrying that component.

Source: TDS-14.3, ARCH-5.2

#### Scenario: A continuously true inner expression accumulates
- **WHEN** an entity's source condition contains `sustained: {ticks: 3, condition: true}` and the world steps `3` ticks
- **THEN** after the third tick the timer stores `3` consecutive ticks and the sustained read holds

#### Scenario: A false inner expression resets the timer
- **WHEN** an entity's timer stores `5` consecutive ticks and the inner expression evaluates `false` on the next tick
- **THEN** the timer stores `0` consecutive ticks and the sustained read no longer holds

#### Scenario: Subjects are updated in ascending order per condition and slot
- **WHEN** two entities with ids `2` and `1` carry the same condition usage and the phase runs
- **THEN** the timer rows are ordered by `(condition handle, slot, subject)` with subject `1` before subject `2`

### Requirement: Phase 30 timer cleanup
Phase 30 SHALL delete every timer instance whose subject entity no longer exists.

Source: TDS-14.3

#### Scenario: A removed entity's timers are deleted
- **WHEN** an entity with a timer at `4` consecutive ticks is removed
- **THEN** after the next phase 30 the timer row for that subject no longer exists

### Requirement: Timer persistence and determinism
Sustained timers SHALL be authoritative world state: they SHALL be encoded in and decoded from the save document, contribute to the state hash, and survive a save → load → continue run with identical hashes to an uninterrupted run.

Source: TDS-14.3, CONT-7.2, ARCH-15.1

#### Scenario: Save and reload preserves timer progress
- **WHEN** a world with a timer at `7` consecutive ticks is saved, loaded, and stepped once with the inner expression `true`
- **THEN** the reloaded world's timer stores `8` consecutive ticks and its state hash equals the uninterrupted run's hash at the same tick
