# Spec Delta

## MODIFIED Requirements

### Requirement: World-map view
The client SHALL provide a world map that lays locations out deterministically from their entity ids, draws every connection with its base duration, marks inactive and unknown locations, and shows ownership. It SHALL show transport dots at each transport unit's current location and move a dot to its new location with an interpolation that never delays authoritative state. An unknown location SHALL render as a dashed outline with its ID and no owner mark. Clicking a location SHALL select it and open a map action bar that issues `ActivateLocation`/`DeactivateLocation` for a known location and opens the logistics drawer prefilled with an explore or establish order for the location.

Source: REF-12.1, REF-14.3, REF-13.2

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
- **THEN** the map draws it with a dashed outline, its ID as the label, and no owner mark

#### Scenario: Selecting a known location offers activation and expansion
- **WHEN** the user clicks a discovered location
- **THEN** the action bar offers deactivate-or-activate, explore, and establish, and the explore and establish buttons open the logistics drawer with a prefilled single-station draft of the matching mode

#### Scenario: Selecting an unknown location offers only expansion
- **WHEN** the user clicks an unknown location
- **THEN** the action bar offers explore and establish only

## ADDED Requirements

### Requirement: Explore and establish drafts
The logistics selectors SHALL build single-station drafts with no actions for `explore` and `establish` modes, the draft validator SHALL accept an action-less station exactly when the draft mode is `explore` or `establish`, and the logistics editor SHALL open with a prefilled draft.

Source: REF-12.1, GDD-15.5

#### Scenario: An explore draft validates and serializes
- **WHEN** `exploreDraft(4)` is built and converted to a command payload
- **THEN** the draft is valid with one action-less station and the payload carries `mode: explore` with `stations: [{ endpoint: 4, actions: [] }]`

#### Scenario: A route draft still requires actions
- **WHEN** a `route` draft has a station without actions
- **THEN** the draft is invalid

### Requirement: Fog-aware grid selection
The location grid SHALL skip a location whose snapshot knowledge is `unknown` — its attributes are not received and there is no grid to render — falling back to the next known location.

Source: REF-12.2, PIC-9.3

#### Scenario: An unknown location is not shown on the grid
- **WHEN** the selected location's snapshot knowledge is `unknown`
- **THEN** the grid renders no location instead of an empty frame
