# Design — add-client-inspector-and-tables

## Context

2.4 (read models) and 2.8 (client shell) are archived. REF-12.3, REF-12.4, and REF-15 define the inspector, tables, and table mode. This document records the selector/query boundary.

## Goals / Non-Goals

**Goals:** the entity inspector, need rows, inventory and population tables, table mode, and the enable/recipe commands.

**Non-Goals:** the grid, placement, world map, and other drawer views (3.7–3.8, 4.7, 5.4, 6.8–6.9); full table-mode completeness and accessibility (11.4).

## Decisions

### D1 — Selectors are pure

`src/selectors/index.ts` holds `entityInspector(detail, i18n)`, `needRows(breakdown, i18n)`, `inventoryRows(location, i18n)`, and `populationRows(summaries, i18n)`. Each returns a plain view model and does no DOM work, so it is the unit-tested surface (06 §13.1). Sorting is by string ID using code-unit order.

### D2 — Worker query handler

The worker `query` handler dispatches on `request.query.kind`: `entity_detail` → `entityDetail`, `need_breakdown` → `needBreakdown`, `location_summary` → `locationSummary`, `definition_metadata` → `definitionMetadata`. The result is posted as `{ [kind]: value }`. The handler is synchronous (read models are pure).

### D3 — Views

`views/inspector.ts` renders the inspector from the selected entity's detail (fetched with a query) and issues `SetEntityEnabled`/`SelectRecipe` through the client. `views/inventory-table.ts` and `views/population-table.ts` render from the current projection's locations and the location summaries. Table mode toggles the table container.

### D4 — Selection and queries

Selecting an entity sets `view.selection` and sends an `entity_detail` and `need_breakdown` query; the responses populate a signal the inspector subscribes to.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [Queries are not pushed] → the client re-queries on selection and on each published tick while the inspector is open; a query push model can replace this later.
- [DOM views are not unit-tested locally] → selectors carry the tests; DOM is covered by Playwright (2.10).

## Migration Plan

Additive client and host modules. No framework or golden change. Rollback is reverting the change.

## Open Questions

None blocking.
