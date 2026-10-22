# Proposal

## Why

Milestone M3 (space and construction) surfaced three framework gaps that no roadmap row owned:

1. The entity-definition `connectivity` component (required by `docs/03` §6.8 and by the R1 connector) had no content schema, reference resolution, or instantiation (closed by row 3.4b).
2. Grid geometry, entity footprint, and connectivity were absent from the per-actor projection, so the client grid had no data (closed by row 3.6b).
3. The read-only `placement_query` was implemented at the application layer but not routed by the web host, so the client could not obtain authoritative placement validation (closed by row 3.7b).

The M3 rows themselves were implemented as specified. The gaps were at layer seams: the milestone slice skipped its "projection" and "content-schema" legs (08 §2.3), the one-capability-per-row rule left the integration work without a spec home, the drafting guide (08 §7.2) never required a change to enumerate the surfaces it must also update, and the presentation contract (`docs/04` §9.1/§9.3) and entity schema (`docs/03` §6.8) were themselves incomplete. This change closes the documentation defects and adds a roadmap rule so the same class of gap cannot recur.

This is a documentation and process amendment; no simulation, protocol, save, or client behavior changes. It therefore sets `skip_specs: true` (no spec-level behavior change).

## What Changes

- **`docs/03` §6.8**: specify the `connectivity` entity component's provider form (`provides`) alongside the requirement form (`requires`); exactly one is required.
- **`docs/04` §9.1**: add the missing snapshot fields — location `grid` (width, height, blocked cells), entity `spatial.footprint`, and entity `connectivity` (role, network, connected) — and reconcile §9.3's omitted-attribute list with the fields the snapshot actually carries.
- **`docs/04` §10.2**: state that the location summary is delivered incrementally, that grid topology and the property vector are read from the snapshot (§9.1), and that a field may not be depended on until a roadmap row owns it.
- **`docs/04` §20**: require that a displayed value be traceable to §9, §10, or §12, and that extending a view first extends the contract and its owning row.
- **`docs/05` §18.4**: name the spatial fields the projection exposes.
- **`docs/07` §12.2**: reconcile the grid view's data source with the snapshot fields.
- **`docs/08` §7**: add §7.4 "Integration surfaces" — a checklist and rules that a change must enumerate and update the content-schema, projection/read-model, protocol, host, and client surfaces it touches, and that a client/content row must depend on the framework rows that expose its data.
- **`docs/08` §10 and §11**: add a coverage acceptance criterion and record the M3 root cause and this amendment in the milestone log.

## Capabilities

### New Capabilities

- None. This change alters the normative design documents and the roadmap drafting guide only; no system behavior changes, so `skip_specs: true` is set.

### Modified Capabilities

- None.

## Impact

- **Documents:** `docs/03`, `docs/04`, `docs/05`, `docs/07`, `docs/08`. No code, spec, content, fixture, golden, save format, or protocol version changes.
- **Verification:** `pnpm verify` and `pnpm trace` remain green; no test or trace tags change. `openspec validate` passes with `skip_specs: true`.
- **Out of scope:** re-planning the remaining `docs/04` §10.2 fields onto specific future rows; the process rule added in 08 §7.4 makes that ownership explicit when each future row is proposed.
