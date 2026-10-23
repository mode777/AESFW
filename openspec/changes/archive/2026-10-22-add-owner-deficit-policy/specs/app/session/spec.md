# Spec Delta

## Purpose

The session command mapper accepts the `ResumeDeficitPausedEntities` command (TDS-16.1, PIC-12).

## ADDED Requirements

### Requirement: Resume deficit command mapping
`mapCommand` SHALL map a `ResumeDeficitPausedEntities` envelope to a core command carrying either the payload's `entities` array of entity IDs or the literal `all`, and SHALL reject a payload that is neither with `unknown_command`.

Source: TDS-16.1, TDS-16.2, PIC-12

#### Scenario: An entity list maps to the command
- **WHEN** a `ResumeDeficitPausedEntities` envelope carries `entities: [1, 2]`
- **THEN** the mapped command is `{ type: 'ResumeDeficitPausedEntities', entities: [1, 2] }`

#### Scenario: The all form maps to the command
- **WHEN** a `ResumeDeficitPausedEntities` envelope carries `entities: all`
- **THEN** the mapped command is `{ type: 'ResumeDeficitPausedEntities', entities: 'all' }`

#### Scenario: A malformed payload is rejected
- **WHEN** a `ResumeDeficitPausedEntities` envelope carries `entities: 5`
- **THEN** the mapper rejects it with `unknown_command`
