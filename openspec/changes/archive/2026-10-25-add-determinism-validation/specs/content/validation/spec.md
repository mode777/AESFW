# Spec Delta

## ADDED Requirements

### Requirement: Determinism validation
The content pipeline SHALL validate determinism over raw definition documents before composition (CONT-12 order) and SHALL report error-severity diagnostics for: a condition expression using a wall-clock operator (`now`, `date`, `time`, `clock`) as `wall_clock_expression`; a condition expression using a random operator (`random`, `rng`, `randint`) as `unseeded_random`; a definition number that is not a safe integer as `platform_numeric`; a string inside a condition expression containing executable-code markers (`=>`, `function`, `eval(`, `new Date`) as `executable_script`; and an `optional_module` package defining an ID from the `framework.` namespace or an ID defined by a non-module package in the same load as `module_redefines_core`. Each diagnostic names its package and file.

Source: CONT-11.8

#### Scenario: A wall-clock expression is rejected
- **WHEN** a condition expression uses a `now` operator
- **THEN** validation reports `wall_clock_expression` naming the package, file, and condition

#### Scenario: An unseeded random operator is rejected
- **WHEN** a condition expression uses a `random` operator
- **THEN** validation reports `unseeded_random` naming the package, file, and condition

#### Scenario: A platform-dependent number is rejected
- **WHEN** a definition carries a non-safe-integer number such as `0.1`
- **THEN** validation reports `platform_numeric` naming the package, file, and path

#### Scenario: An embedded script is rejected
- **WHEN** a condition expression string contains `=>` or `eval(`
- **THEN** validation reports `executable_script` naming the package, file, and condition

#### Scenario: A module redefining core content is rejected
- **WHEN** an optional-module package defines a `framework.` ID or an ID owned by a simulation-content package
- **THEN** validation reports `module_redefines_core` naming the module and the ID

#### Scenario: Deterministic content passes
- **WHEN** a package uses only safe integers and known operators
- **THEN** no determinism diagnostic is reported
