# Spec Delta

## ADDED Requirements

### Requirement: Validation report formats and knobs on the CLI
`aesfw validate` SHALL render its findings through the shared report builder — text lines ordered errors-then-warnings with severity, code, definition, interpolated message, and file, then a `summary: <N> errors, <M> warnings` line, or a JSON object with `diagnostics` and `summary` — and SHALL accept `--design-intent off|warning|error` (default `off`) and `--economic-diagnostics warning|error` (default `warning`) wired to the loader options of the same names. Report rendering SHALL not change which diagnostics a load produces.

Source: CONT-15, TDS-21.2

#### Scenario: Design-intent findings on demand
- **WHEN** a package is validated with `--design-intent warning`
- **THEN** the report lists the inactive design ideas as warnings and the exit code is zero

#### Scenario: Promoted economic findings fail
- **WHEN** a package with an economic finding is validated with `--economic-diagnostics error`
- **THEN** the exit code is non-zero

#### Scenario: Defaults are unchanged
- **WHEN** a package is validated without the new flags
- **THEN** no design-intent findings appear and economic findings stay warnings
