# Spec Delta

## ADDED Requirements

### Requirement: Presentation package validation
The framework SHALL validate presentation packages against PIC-19. A presentation document whose top-level key is a simulation definition collection SHALL be reported as `presentation_modifies_simulation`. A mapping whose `target_definition` does not resolve in the supplied simulation identifier set SHALL be reported as `presentation_target_missing`. A localization or mapping key that violates the stable identifier rules SHALL be reported as `presentation_invalid_key`. A mapping localization key (`name_key`, `description_key`) or visual key (`model_key`, `icon_key`) absent from the package's localization entries SHALL be reported as `presentation_key_missing` with warning severity. A package without a top-level `fallback` document SHALL be reported as `presentation_fallback_missing` with warning severity. A `controls` entry whose `command` is not in the supplied command-type set SHALL be reported as `presentation_invalid_command`. Target, command, and key-existence checks are skipped when the corresponding input set is not supplied.

Source: PIC-19

#### Scenario: A mapping targeting an absent definition is reported
- **WHEN** a mapping names `target_definition: test.entity.absent` and the simulation set lacks it
- **THEN** validation reports `presentation_target_missing` naming the mapping

#### Scenario: A simulation definition inside a presentation package is reported
- **WHEN** a presentation document declares a `resources` collection
- **THEN** validation reports `presentation_modifies_simulation`

#### Scenario: A malformed localization key is reported
- **WHEN** a localization entry key contains a space
- **THEN** validation reports `presentation_invalid_key` naming the key

#### Scenario: A missing localization key warns
- **WHEN** a mapping's `name_key` has no localization entry
- **THEN** validation reports `presentation_key_missing` with warning severity and the package still passes

#### Scenario: A package without a global fallback warns
- **WHEN** the package declares no top-level `fallback` document
- **THEN** validation reports `presentation_fallback_missing` with warning severity

#### Scenario: An unknown control command is reported
- **WHEN** a `controls` entry names a command outside the supplied command-type set
- **THEN** validation reports `presentation_invalid_command` naming the control

#### Scenario: The reference presentation package validates
- **WHEN** `ref.tier.presentation` is validated against `ref.tier` with the known command set
- **THEN** only fallback-or-key warnings may appear and no error is reported

### Requirement: Presentation validation in the CLI
`aesfw validate` SHALL route packages whose manifest type is `presentation` to the presentation validator instead of the simulation loader, and SHALL accept `--against <dir>` to supply the simulation package for target and key checks. The exit code SHALL be non-zero when any presentation error is present.

Source: PIC-19, TDS-21.2

#### Scenario: The CLI validates a presentation package
- **WHEN** `aesfw validate <presentation-dir> --against <simulation-dir>` runs
- **THEN** presentation diagnostics are reported and errors set a non-zero exit code

#### Scenario: The CLI still rejects presentation packages as simulation content
- **WHEN** a presentation package is loaded without the presentation routing (for example by a scenario)
- **THEN** the manifest type is not a simulation type and the load fails as before
