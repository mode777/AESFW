# Spec Delta

## ADDED Requirements

### Requirement: Location grid cell model
`gridCells(location)` SHALL return the grid geometry of a grid-policy location as `{ width, height, cells }`, where each cell carries its `x`, `y`, and `blocked` flag and the cells are ordered by ascending packed index (`y * width + x`). It SHALL return `null` for a location without a grid.

Source: REF-12.2, PIC-9.1, PIC-10.2

#### Scenario: A grid exposes its cells and blocked set
- **WHEN** a location has a grid with `width` `4`, `height` `3`, and blocked cells `[1, 6]`
- **THEN** `gridCells` returns `12` cells, the cell at `x` `1`, `y` `0` is blocked, and the cell at `x` `2`, `y` `1` is blocked

#### Scenario: An abstract location has no grid
- **WHEN** a location has no `grid`
- **THEN** `gridCells` returns `null`

### Requirement: Shape grammar
`shapeGrammar(archetype)` SHALL map every REF-10.2 archetype to its shape kind and interior encoding, and SHALL map an unknown archetype to a plain square (`box`).

Source: REF-10.2

#### Scenario: A connector is a line
- **WHEN** `shapeGrammar('connector')` is computed
- **THEN** the shape kind is `line` and the interior encoding is `none`

#### Scenario: A residence is a circle
- **WHEN** `shapeGrammar('residence')` is computed
- **THEN** the shape kind is `circle`

#### Scenario: A slot extractor is a triangle on a slot ring
- **WHEN** `shapeGrammar('slot_extractor')` is computed
- **THEN** the shape kind is `triangle_ring` and the interior encoding is `progress_rise`

#### Scenario: An unknown archetype falls back to a box
- **WHEN** `shapeGrammar('unknown')` is computed
- **THEN** the shape kind is `box`

### Requirement: Entity archetype derivation
`archetypeOf(metadata)` SHALL derive the shape archetype from mechanically safe definition metadata, without computing mechanics: a `residence` component is a residence, a `producer` component is a refiner, a slot-dependent `resource_source` is a slot extractor, an area-dependent `resource_source` is an area extractor, a `connectivity` component that `provides` is a connector, and any other definition is `unknown`.

Source: REF-10.2, PIC-4

#### Scenario: A slot-dependent source is a slot extractor
- **WHEN** an entity definition has a `resource_source` component with policy `slot_dependent`
- **THEN** its archetype is `slot_extractor`

#### Scenario: An area-dependent source is an area extractor
- **WHEN** an entity definition has a `resource_source` component with policy `area_dependent`
- **THEN** its archetype is `area_extractor`

#### Scenario: A residence is a residence
- **WHEN** an entity definition has a `residence` component
- **THEN** its archetype is `residence`

#### Scenario: A producer is a refiner
- **WHEN** an entity definition has a `producer` component
- **THEN** its archetype is `refiner`

#### Scenario: A connectivity provider is a connector
- **WHEN** an entity definition has a `connectivity` component that provides a network
- **THEN** its archetype is `connector`

#### Scenario: A definition with no known component is unknown
- **WHEN** an entity definition has no recognised component
- **THEN** its archetype is `unknown`

### Requirement: Entity shapes
`entityShapes(location, entities, archetypes)` SHALL return one shape per entity that carries spatial data, ordered by ascending entity ID, carrying its cell position, its footprint dimensions after orientation, its shape kind and interior, and its state encoding. It SHALL omit entities with no spatial data.

Source: REF-12.2, REF-14.3, PIC-9.1

#### Scenario: A placed entity is drawn at its logical position
- **WHEN** an entity at logical position `[10, 12]` with footprint `{ width: 2, height: 3 }` and orientation `0` is placed on a location
- **THEN** its shape is at `x` `10`, `y` `12`, `width` `2`, `height` `3`

#### Scenario: Orientation swaps the footprint axes
- **WHEN** an entity with footprint `{ width: 2, height: 3 }` and orientation `1` is placed
- **THEN** its shape `width` is `3` and its `height` is `2`

#### Scenario: An unplaced entity is omitted
- **WHEN** an entity has no `spatial` object
- **THEN** `entityShapes` returns no shape for it

### Requirement: State encoding
`stateEncoding(entity)` SHALL encode the REF-10.3 visual state from the entity's lifecycle, production state, and block reasons: a not-yet-active lifecycle is `planned` and dashed, a throughput block is `throttled` with glyph `T`, another block reason is `blocked` with a reason glyph, a processing producer is `processing` with a progress permille, and an idle producer is `idle`.

Source: REF-10.3

#### Scenario: A constructing entity is planned
- **WHEN** an entity has lifecycle `constructing`
- **THEN** its state is `planned` and it is dashed

#### Scenario: A missing input is blocked with an input glyph
- **WHEN** an entity has block reason `missing_input`
- **THEN** its state is `blocked` and its glyph is `I`

#### Scenario: A throughput block is throttled
- **WHEN** an entity has block reason `throughput_throttled`
- **THEN** its state is `throttled` and its glyph is `T`

#### Scenario: A processing producer reports progress
- **WHEN** an entity is processing with `progress` `500` and `progress_scale` `1000`
- **THEN** its state is `processing` and its progress permille is `500`

### Requirement: Connectivity overlay
`connectivityOverlay(entities)` SHALL return one entry per entity that carries connectivity, ordered by ascending entity ID, carrying the entity ID, the network, the role, and the `connected` flag. It SHALL omit entities with no connectivity.

Source: REF-12.2, PIC-10.2

#### Scenario: A connected requirement is listed
- **WHEN** an entity carries a `requirement` node for network `test.connectivity.hub` with `connected` `true`
- **THEN** the overlay has an entry with that network, role `requirement`, and `connected` `true`

#### Scenario: An entity without connectivity is omitted
- **WHEN** an entity carries no connectivity
- **THEN** the overlay has no entry for it

### Requirement: Suitability overlay
`suitabilityOverlay(location, propertyId)` SHALL return the suitability value of the selected property from the location's property values, and SHALL return `null` when the location or property value is absent.

Source: REF-12.2, PIC-9.1, PIC-10.2

#### Scenario: A suitability property is read
- **WHEN** a location has property `test.property.suitability` with value `1000`
- **THEN** `suitabilityOverlay(location, 'test.property.suitability')` returns `1000`

#### Scenario: A missing property returns null
- **WHEN** a location has no value for `test.property.suitability`
- **THEN** `suitabilityOverlay(location, 'test.property.suitability')` returns `null`

### Requirement: Grid overlay view state
The client SHALL keep the active grid overlay (connectivity or suitability, or none) in client-local view state, toggled by the `C` and `S` keys, and discarding it SHALL not affect the session.

Source: REF-12.2, REF-13.2, PIC-16

#### Scenario: The connectivity key selects the connectivity overlay
- **WHEN** the active overlay is none and the `C` key is handled
- **THEN** the active overlay is `connectivity`

#### Scenario: The suitability key selects the suitability overlay
- **WHEN** the active overlay is none and the `S` key is handled
- **THEN** the active overlay is `suitability`

#### Scenario: The same key clears the overlay
- **WHEN** the active overlay is `connectivity` and the `C` key is handled
- **THEN** the active overlay is none
