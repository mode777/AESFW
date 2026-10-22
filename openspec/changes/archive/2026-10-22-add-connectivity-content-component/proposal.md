# Proposal

## Why

Roadmap 08, M3 item 3.4b (`add-connectivity-content-component`, capability `content/schemas`, size S). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Row 3.4 (`add-connectivity-requirement`, archived 2026-10-22) added the runtime `connectivityNode` provider/requirement component, the location hub as connectivity root, binary hub access, and the `missing_inventory_access` block reason; CONT-6.8 already specifies `components.connectivity.requires` on an entity definition (`connectivity: requires: example.connectivity.hub_network`). But the content schema never implemented the component, so no entity definition can declare a connectivity node and the reference connector archetype (GDD-9.11, roadmap 3.6) cannot be authored as pure content. This change closes that gap: it adds the optional `connectivity` component to `entity_definition.components` and instantiates the core `connectivityNode` store component for entities created from such a definition. It changes no runtime connectivity semantics. Depends on: `add-connectivity-requirement` (3.4) — archived 2026-10-22.

## What Changes

- Add an optional `connectivity` component to `entity_definition.components` carrying exactly one of `requires: <network-id>` (a connectivity requirement node) or `provides: <network-id>` (a connectivity provider node). A definition that declares both or neither SHALL be rejected by schema validation (`schema_invalid`).
- Instantiate the core `connectivityNode` store component (`ConnectivityNode = { role, network }`) for entities created from such a definition in `@aesfw/app` (`instantiateContentEntities`): `requires` → role `requirement`, `provides` → role `provider`, with the network id carried as a `StringId`.
- Extend the entity-definition schema (CONT-6.8) and regenerate the published JSON Schema (`packages/content/schemas/entity_definitions.json`).
- The network id is a free-form string name, not a definition reference: no reference resolution and no new definition collection (matching 3.4's runtime, which does not match networks).
- No **BREAKING** and no **HASH-CHANGING** artifacts: the component is optional and absent from every existing content, fixture, and golden, so no existing entity encodes differently and no golden hash changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `content/schemas`: adds the entity-definition `connectivity` component (the `requires`/`provides` union and its both/neither rejection) and the instantiation contract that produces a `connectivityNode`.

## Impact

- **Packages:** `@aesfw/content` extends `src/schemas/entity.ts` (the `connectivity` component) and its published `schemas/entity_definitions.json`. `@aesfw/app` extends `src/content/instantiate.ts` to set the `connectivityNode` store component. No new runtime dependency is added to any pure package.
- **Tick phases:** none (no new phase behavior). **Store kinds:** `connectivityNode` (already in the TDS-8.3 catalogue) gains a content authoring path. **Commands/events:** none. **Error/diagnostic codes:** none new; rejection reuses `schema_invalid` (CONT-11.2).
- **Verification impact:** new L1 schema tests (the `requires` form, the `provides` form, both/neither rejection) and an instantiation test asserting a `connectivityNode` with the right role and network.
- **Out of scope (later roadmap rows):** the reference connector content itself (3.6 `add-reference-content-builder-stage`); the client connectivity overlay (3.7 `add-client-location-grid`); inter-location connections and transport (M6); the `connected_graph` and `explicit_logistics` inventory-access policies (12.5 `add-alternative-inventory-access-policies`); any change to the 3.4 runtime semantics.
