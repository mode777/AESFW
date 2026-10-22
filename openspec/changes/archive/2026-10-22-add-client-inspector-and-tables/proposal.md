# Proposal

## Why

Roadmap 08, M2 item 2.9 (`add-client-inspector-and-tables`, capability `reference/client`, size M). M2's demo needs the client to show an entity's state and the location's inventory and population, and to issue the enable and recipe commands. This row delivers the inspector, the inventory and population tables, table mode, and the read-model queries they need. Depends on: `add-client-shell` (2.8) and `add-core-read-models` (2.4) — both archived 2026-10-22.

## What Changes

- Add pure client selectors for the entity inspector, the need breakdown, the inventory table, and the population table.
- Add the inspector and table views, and table mode.
- Issue `SetEntityEnabled` and `SelectRecipe` from the inspector through the session client.
- Extend the worker host's `query` handler to answer read-model queries (`entity_detail`, `need_breakdown`, `location_summary`, `definition_metadata`) using the 2.4 read models.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### Modified Capabilities

- `reference/client`: extended with the inspector and tables.
- `host/web`: the query handler answers read-model queries.

## Impact

- **Packages:** `@aesfw-ref/client-web` gains `src/selectors/**` and `src/views/**`; `@aesfw/host-web` extends the worker query handler.
- **Tick phases:** none. **Commands:** `SetEntityEnabled`, `SelectRecipe`. **Events:** none. **Error codes:** none.
- **Out of scope:** the location grid and placement (3.7–3.8); the world map (6.8); the economy, planning, and logistics views (4.7, 5.4, 6.9); full table-mode completeness and accessibility (11.4).
- **Verification impact:** `pnpm test` gains selector tests and a host query test.
