# Spec Delta

## ADDED Requirements

### Requirement: Presentation validation in the CLI
`aesfw validate` SHALL route packages whose manifest type is `presentation` to the presentation validator instead of the simulation loader, and SHALL accept `--against <dir>` to supply the simulation package for target and key checks. The exit code SHALL be non-zero when any presentation error is present.

Source: PIC-19, TDS-21.2

#### Scenario: The CLI validates a presentation package
- **WHEN** `aesfw validate <presentation-dir> --against <simulation-dir>` runs
- **THEN** presentation diagnostics are reported and errors set a non-zero exit code

#### Scenario: Simulation loading is unchanged
- **WHEN** a simulation package is validated
- **THEN** the loader path is unchanged from the graph-validation rows
