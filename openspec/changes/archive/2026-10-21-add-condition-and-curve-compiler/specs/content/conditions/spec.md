# content/conditions — Spec Delta

## Purpose

The condition expression language and curves (CONT-7, CONT-8; TDS-14.1, TDS-14.2, TDS-14.4): a typed, side-effect-free expression tree compiled at load time, a pure evaluator, the domain-query table, and the curve compiler and evaluator. `sustained` timers belong to `add-sustained-conditions` (7.1) and are out of scope here.

## ADDED Requirements

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
