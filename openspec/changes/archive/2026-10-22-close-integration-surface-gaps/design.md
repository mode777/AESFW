# Design

## Context

See proposal.md — Why. M3 delivered rows 3.1–3.8 plus three gap-closure rows (3.4b, 3.6b, 3.7b). The gaps all sat at layer seams the roadmap did not assign, and two normative documents were themselves incomplete:

- `docs/03` §6.8 shows the entity `connectivity` requirement form but never the provider form, though GDD-9.2 and the R1 connector require both.
- `docs/04` §9.1's snapshot example carries neither grid geometry, entity footprint, nor connectivity, while §9.3 assumes source slots and capacity are snapshot attributes.
- `docs/04` §10.2 lists more location-summary fields than any row implements, with no delivery mapping.
- `docs/08` §7 does not require a change to enumerate the integration surfaces (content schema, projection/read model, protocol, host, client) it must update.

This design records the exact document changes and the new drafting rule. There is no code change.

## Goals / Non-Goals

**Goals:** close the documentation defects that produced the three M3 gaps, and add a roadmap rule and acceptance criterion that make the class of gap visible at propose time.

**Non-Goals:** re-planning the remaining `docs/04` §10.2 fields onto specific future rows, and any change to simulation, protocol, persistence, or client behavior.

## Decisions

### D1 — Record amendments to 02–04 in the 05 §26 table

`docs/05` §26 is the amendment register for documents 02–04. The `docs/03` and `docs/04` edits are added there as A8–A12, and each affected document is updated in this same change with a note referencing the table, as §26 requires.

### D2 — Make the snapshot contract match what a client may read

`docs/04` §9.1 gains the fields the grid view needs and the projection already exposes (3.6b): a location `grid` (width, height, blocked cells), an entity `spatial.footprint`, and an entity `connectivity` (role, network, connected). §9.3's omitted-attribute list is corrected to the fields the snapshot actually carries, so §9.1 and §9.3 agree.

### D3 — Make the location summary's delivery explicit

`docs/04` §10.2 keeps its target field list but gains a delivery note: fields are delivered incrementally, grid topology and the property vector are read from the snapshot (§9.1) rather than the summary, and a field may not be depended on by a client until a roadmap row owns it. This removes the ambiguity that let 3.7's data dependency go unowned without fabricating future row assignments.

### D4 — Name the spatial projection fields in the TDS

`docs/05` §18.4 lists the read models but not the spatial fields the projection must expose. Add a sentence naming grid geometry, transform/footprint, and connectivity.

### D5 — Reconcile the client design with the implemented data source

`docs/07` §12.2 says the grid view's data is "location summary (04 §10.2), entity snapshots". The implementation reads `location.grid`, `entity.spatial`, `entity.connectivity`, and `location.properties.values` from the snapshot. Update §12.2 to name those fields.

### D6 — Add an integration-surface rule to the roadmap drafting guide

`docs/08` §7 gains §7.4 "Integration surfaces": a surface checklist and three rules. The §7.1 worked example gains a `Surfaces:` line and the §7.2 proposal Impact row is extended to require it. The rule is the durable prevention: a change that introduces state, a command, a query, or a content field must either update the dependent surface in the same change or name the owning row in **Depends on**, and a client/content row must depend on the rows that expose its data.

### D7 — Record the root cause and add a coverage acceptance criterion

`docs/08` §11 M3 log gains a gap-closure paragraph naming the three rows and the root cause. `docs/08` §10 gains an acceptance bullet requiring that every field of `04` §9/§10/§12 and every `03` §6 component referenced by a milestone row has an owning row (per §7.4).

## Amendments to 01–07

### A8 — `docs/03` §6.8 (entity definition)

Add the provider form of the `connectivity` component. After the existing entity-definition examples, add:

```yaml
entity_definition:
  id: example.entity.connector
  components:
    connectivity:
      provides: example.connectivity.hub_network
```

and the sentence: "`connectivity` declares exactly one of `requires` (the entity needs the named connectivity network) or `provides` (the entity extends the named connectivity network, for example the connector archetype of 01 §9.11). A definition that declares both or neither is invalid."

### A9 — `docs/04` §9.1 (full snapshot)

Add to the location example, after `properties`:

```yaml
      grid:
        width: 40
        height: 40
        blocked: [0, 1, 40]
```

Add to the entity example, inside `spatial`, a `footprint`, and add a sibling `connectivity`:

```yaml
      spatial:
        logical_position: [10, 12]
        orientation: 1
        footprint: { width: 3, height: 3 }
      connectivity:
        role: requirement
        network: example.connectivity.hub_network
        connected: true
```

and the sentence: "A grid-policy location carries its `grid` (width, height, and the packed indices of its non-buildable cells); a placed entity carries its `spatial.footprint`; an entity that carries a connectivity node exposes its `connectivity` role, network, and derived connected state."

### A10 — `docs/04` §9.3 (owner-filtered visibility)

Replace the omitted-attribute list "property values, source slots, region, capacity, and foreign entities are omitted by the adapter" with "property values, region, grid geometry, connectivity, and foreign entities are omitted by the adapter", so the list names only attributes the snapshot carries.

### A11 — `docs/04` §10.2 (location summary)

After the field list, add: "Delivery. The location summary is delivered incrementally. Grid topology and the property vector are read from the snapshot (§9.1); the summary reports the aggregates. A field may not be depended on by a client until a roadmap row owns its delivery, and every row that adds a field cites this section (08 §7.4)."

### A12 — `docs/04` §20 (integration acceptance criteria)

Extend the "Every displayed mechanic can be traced to snapshot/query data" criterion to: "Every displayed mechanic can be traced to snapshot/query data. A value absent from §9, §10, or §12 SHALL NOT be displayed; extending a view therefore extends the contract and its owning roadmap row first (08 §7.4)."

### A13 — `docs/05` §18.4 (projections)

Add: "The projection exposes each grid-policy location's grid geometry (`grid`: width, height, blocked cells), each placed entity's logical transform and footprint (`spatial`), and each connectivity node (`connectivity`: role, network, connected)."

### A14 — `docs/07` §12.2 (location grid)

Change the **Data** line from "location summary (04 §10.2), entity snapshots." to "entity and location snapshots (04 §9.1: `location.grid`, `location.properties.values`, `entity.spatial`, `entity.connectivity`), plus the location summary (04 §10.2) for aggregates."

### A15 — `docs/08` §7 (drafting guide) and §10–§11

Add §7.4 "Integration surfaces" with the checklist and rules; add a `Surfaces:` line to the §7.1 example; extend the §7.2 proposal Impact row; add the §10 coverage criterion; add the §11 M3 gap-closure note. (Exact text applied in this change.)

## Risks / Trade-offs

- [The §7.4 rule adds proposal overhead] → It is a short checklist, and it is the specific control that would have caught all three M3 gaps at propose time.
- [D2 adds snapshot fields already exposed but not previously specified] → The fields are already implemented (3.6b) and covered by `app/projections` spec requirements; the amendment only makes the contract match reality.

## Migration Plan

Documentation only. Rollback reverts the edits; no runtime artifact depends on them.

## Open Questions

None blocking.
