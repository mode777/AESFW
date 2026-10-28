# Spec Delta

## ADDED Requirements

### Requirement: Deterministic world layout
`worldLayout(locations, connections)` SHALL be a pure selector that places every location as an island: regions form clusters in ascending region ID order; locations within a cluster are placed on a fixed ring in ascending location ID order; each island is sized from its grid dimensions. Connection lanes SHALL be drawn once per bidirectional pair with their base duration as a label, enabled lanes solid and disabled lanes dashed. The layout SHALL be stable across reloads and SHALL depend only on projected data.

Source: REF-12.1, REF-10.2

#### Scenario: Regions cluster in order
- **WHEN** the snapshot carries regions α and β with two and one locations
- **THEN** the α cluster precedes the β cluster and each location sits on its region's ring in ascending ID order

#### Scenario: A bidirectional lane is drawn once
- **WHEN** both endpoints carry the same connection id with base duration `120`
- **THEN** one lane is drawn between the islands labelled `120`

### Requirement: Camera and semantic zoom
The client SHALL provide a camera over the world plane: drag on empty space or arrow keys pan; the wheel or `+`/`-` zooms around the cursor (the centre for keys); `Home` recentres on the first established location. The zoom level SHALL select the level of detail per REF-12.1 — world (islands, lanes, transports, fog), location (adds terrain and entity shapes with status markers), detail (adds progress fills, working areas, radius previews, labels). The camera is client-local view state persisted with the view settings.

Source: REF-13.5, REF-12.1, REF-14.5

#### Scenario: Zoom selects the level of detail
- **WHEN** the camera zooms from world level to location level over a known location
- **THEN** its entity shapes mount and the island silhouette gives way to the terrain path

#### Scenario: Home recentres on the start
- **WHEN** `Home` is handled while the camera is over another region
- **THEN** the camera recentres on the first established location

#### Scenario: Camera state persists
- **WHEN** the camera is panned and zoomed and the page is reloaded
- **THEN** the camera restores its position and zoom

### Requirement: World canvas levels of detail
The world canvas SHALL be one SVG with a single root camera transform and layers (sea and lanes, island terrain, overlays, entities, status markers, ghost, selection). Entities SHALL be mounted only for known locations at location level or deeper and inside the viewport; detail-level marks SHALL be mounted only at detail level. Each island's terrain SHALL be one cached path per location. Rendering SHALL happen only when a signal changed, the camera moved, or an interpolation is in progress.

Source: REF-14.3, REF-12.1

#### Scenario: Far zoom mounts no entities
- **WHEN** the camera is at world level
- **THEN** no entity element is mounted and island silhouettes, lanes, transports, and fog clouds are drawn

#### Scenario: Viewport culling applies
- **WHEN** the camera is at location level and a known location lies outside the viewport
- **THEN** that location's entity elements are not mounted

### Requirement: Fog clouds and transports on the canvas
An unknown location SHALL render as a fog cloud showing only its known connections and no attributes (PIC-9.3). Transport units SHALL render as dots interpolated along their lane between the last two authoritative movement states, converging to the authoritative state and never delaying commands. Ownership marks SHALL be shown on owned islands only.

Source: REF-12.1, PIC-9.3, REF-14.3, PIC-14

#### Scenario: A fog cloud leaks no attributes
- **WHEN** a location's knowledge is `unknown`
- **THEN** the canvas draws a fog cloud with its known lanes and no name, region, owner, or grid marks

#### Scenario: Interpolation follows the authoritative path
- **WHEN** a transport unit moves between two locations over `120` ticks
- **THEN** its dot advances along the lane each frame and arrives as the authoritative arrival is published

### Requirement: Minimap
The minimap SHALL render the world layout with the current viewport rectangle; clicking the minimap SHALL move the camera centre to the clicked world point. Below it the client SHALL show population per tier for the viewed location, or for the whole owner when no location is viewed.

Source: REF-11, REF-12.1

#### Scenario: Clicking the minimap moves the camera
- **WHEN** the minimap is clicked at the position of region β
- **THEN** the camera centres on that world point

#### Scenario: The population strip follows the viewed location
- **WHEN** no location is viewed and the owner holds 150 S1 and 12 S2
- **THEN** the strip shows `150` and `12`

## MODIFIED Requirements

### Requirement: Fog-aware grid selection
The world canvas SHALL skip the location level of a location whose snapshot knowledge is `unknown` — its attributes are not received and there is no grid to render — rendering it as a fog cloud instead, and camera focus SHALL fall back to the next known location.

Source: REF-12.2, PIC-9.3

#### Scenario: An unknown location is not shown on the grid
- **WHEN** the camera focuses a location whose snapshot knowledge is `unknown`
- **THEN** the canvas renders a fog cloud instead of a grid

## REMOVED Requirements

### Requirement: World-map view
**Reason:** The separate world map is replaced by the continuous world canvas (redesigned 07 §12.1); there is no map/grid toggle or separate map screen.
**Migration:** Deterministic layout, lanes, transport dots, unknown-location rendering, and activation/explore/establish entry points move to the "Deterministic world layout", "Fog clouds and transports on the canvas", and canvas-selection requirements of this delta.

### Requirement: Map and grid toggle
**Reason:** With one continuous canvas there is nothing to toggle; zoom is the semantic zoom of REF-12.1.
**Migration:** The `M` key is freed; the "Camera and semantic zoom" requirement owns navigation.
