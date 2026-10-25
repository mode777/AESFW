# Spec Delta

## ADDED Requirements

### Requirement: Diagnostic message catalogue
Every diagnostic code in the catalogue SHALL have a message template. `messageFor(diagnostic)` SHALL return the template interpolated with the diagnostic's args, the definition ID when present, and the diagnostic code as fallback for unknown codes. Templates SHALL be plain English data (no `Intl`, no locale state).

Source: CONT-15

#### Scenario: Every catalogue code has a message
- **WHEN** the message table is cross-checked against the diagnostic catalogue
- **THEN** every code has a non-empty template

#### Scenario: Args are interpolated
- **WHEN** a diagnostic carries `{ resource: 'test.resource.a' }` and its template references the resource
- **THEN** `messageFor` returns a sentence containing `test.resource.a`

#### Scenario: An unknown code falls back
- **WHEN** `messageFor` receives a code outside the catalogue
- **THEN** it returns a sentence containing the raw code

### Requirement: Validation report formats
The validation report SHALL render diagnostics in a deterministic order — errors before warnings, then by catalogue order — for both text and JSON formats. The text report SHALL print one line per diagnostic with severity, code, definition or package, interpolated message, and file, followed by a `summary: <N> errors, <M> warnings` line. The JSON report SHALL be an object with `diagnostics` (each carrying code, severity, message, definition, path, file, and args) and `summary.errors`/`summary.warning` counts. Report rendering SHALL not change which diagnostics a load produces.

Source: CONT-15, TDS-21.2

#### Scenario: The text report groups and summarises
- **WHEN** a load produces one error and one warning
- **THEN** the text report lists the error first, interpolates both messages, and ends with `summary: 1 error, 1 warning`

#### Scenario: The JSON report carries messages and counts
- **WHEN** `--format json` is used
- **THEN** the report contains `diagnostics[].message` and `summary.errors`/`summary.warning`

#### Scenario: Reports do not change results
- **WHEN** the same package is validated with either format
- **THEN** the diagnostic code sets are identical

### Requirement: Validation knobs on the CLI
`aesfw validate` SHALL accept `--design-intent off|warning|error` (default `off`) and `--economic-diagnostics warning|error` (default `warning`), wired to the loader options of the same names, and SHALL report the resulting design-intent inactivity findings in the report.

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
