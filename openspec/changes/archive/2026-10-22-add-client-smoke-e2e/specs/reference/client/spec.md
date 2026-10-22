# Spec Delta

## Purpose

Playwright smoke flows on the reference content and the browser-versus-CLI determinism check (VER-13.2, VER-8.2).

## ADDED Requirements

### Requirement: Smoke flow 1 — load and tick
The client SHALL load the R0 content, become ready, and advance the tick when the run control is used, showing the advancing tick in the top bar.

Source: VER-13.2, REF-11

#### Scenario: The tick advances
- **WHEN** the client has loaded and the run control is used
- **THEN** the top-bar tick increases

### Requirement: Smoke flow 2 — inspect an entity
Selecting an entity SHALL fetch its detail and show the inspector with the entity's definition and state.

Source: VER-13.2, REF-12.3

#### Scenario: Selecting an entity shows the inspector
- **WHEN** an entity item is selected
- **THEN** the inspector shows that entity's definition code

### Requirement: Smoke flow 4 — toggle an entity
The inspector's toggle control SHALL issue `SetEntityEnabled` for the selected entity and the change SHALL appear in the next projection.

Source: VER-13.2, REF-12.3

#### Scenario: Toggling disables the entity
- **WHEN** the toggle control is used on an enabled entity
- **THEN** the entity's `enabled` state becomes `false` in the projection

### Requirement: Smoke flow 6 — save and reload
The client SHALL save the session and reload it, and the reloaded tick SHALL equal the saved tick.

Source: VER-13.2, TDS-21.1

#### Scenario: Save and reload preserves the tick
- **WHEN** the session is saved at tick `N` and reloaded
- **THEN** the reloaded tick is `N`

### Requirement: Browser-versus-CLI determinism
Stepping the client a fixed number of ticks from a fixed seed and content SHALL produce the same state hash as a headless run of the same content, seed, and tick count (VER-8.2).

Source: VER-8.2, TDS-19.4

#### Scenario: Browser and CLI hashes match
- **WHEN** the client steps `20` ticks from seed `[0, 0]` on the R0 content and a headless run does the same
- **THEN** both report the same `fnv1a64-canonical-json-v1` state hash
