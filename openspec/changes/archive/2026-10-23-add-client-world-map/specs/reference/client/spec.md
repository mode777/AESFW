# Spec Delta

## ADDED Requirements

### Requirement: World-map view
The client SHALL provide a world map that lays locations out deterministically from their entity ids, draws every connection with its base duration, marks inactive and unknown locations, and shows ownership. It SHALL show transport dots at each transport unit's current location and move a dot to its new location with an interpolation that never delays authoritative state.

Source: REF-12.1, REF-14.3

#### Scenario: Locations are laid out deterministically
- **WHEN** the snapshot has locations `1` and `3`
- **THEN** the map places location `1` before location `3` in the id-derived grid

#### Scenario: A bidirectional connection is drawn once
- **WHEN** both endpoints carry the same connection id
- **THEN** the map draws one connection line with its duration

#### Scenario: A transport dot follows the authoritative location
- **WHEN** a transport entity's `location_id` changes from location `1` to `3`
- **THEN** its dot moves to location `3` with a transform transition

#### Scenario: Unknown locations are dashed
- **WHEN** a location's knowledge is `unknown`
- **THEN** the map draws it with a dashed outline

### Requirement: Map and grid toggle
The client SHALL switch between the location grid and the world map with a visible toggle and the `M` key, preserving the current location selection.

Source: REF-12.1, REF-13.2

#### Scenario: The M key toggles the map
- **WHEN** the user presses `M`
- **THEN** the world map replaces the grid and pressing `M` again restores the grid
