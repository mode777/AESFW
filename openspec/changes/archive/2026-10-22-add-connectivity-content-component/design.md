# Design — add-connectivity-content-component

## Context

See proposal.md — Why. `add-connectivity-requirement` (3.4, archived 2026-10-22) added the runtime `ConnectivityNode = { role: 'provider' | 'requirement'; network: StringId }` store component in `packages/core/src/sim/connectivity.ts` and the `connectivityNode` store kind (TDS-8.3), but the content schema never accepted a `connectivity` component: `ComponentsSchema` in `packages/content/src/schemas/entity.ts` allows only `resource_source`, `producer`, `residence`, `storage_access`, `construction`, and `placement`, and `instantiateContentEntities` in `packages/app/src/content/instantiate.ts` sets no `connectivityNode`. CONT-6.8 specifies `components.connectivity.requires`. This document records the schema shape and the instantiation wiring only; no runtime semantics change.

## Goals / Non-Goals

**Goals:** the optional `connectivity` component on `entity_definition.components`, its exactly-one-of `requires`/`provides` shape, schema rejection of both or neither, and instantiation of the core `connectivityNode`.

**Non-Goals:** the 3.4 runtime semantics (root, groups, `isConnected`, `missing_inventory_access`), the reference connector content (3.6), the client overlay (3.7), inter-location connections and transport (M6), and network-id reference resolution (the network is a free-form name that 3.4 does not match on).

## Decisions

### D1 — Schema shape: a union, not a typed diagnostic

`ConnectivitySchema` is `Type.Union([Type.Object({ requires: IdSchema }, { additionalProperties: false }), Type.Object({ provides: IdSchema }, { additionalProperties: false })])`, and `ComponentsSchema` gains `connectivity: Type.Optional(ConnectivitySchema)`. Each branch requires exactly its one key and forbids the other, so the TypeBox `anyOf` accepts `{ requires }` and `{ provides }`, and rejects `{ requires, provides }` (each branch sees the other key as unknown) and `{}` (neither branch has its required key). Rejection is therefore a schema-level `schema_invalid` (CONT-11.2), consistent with every other unknown-field rejection; no new diagnostic code or validator pass is added. A discriminated union keyed on a `role` field was rejected because it would restate the runtime shape in content and add a field CONT-6.8 does not specify; a single object with both optional keys plus a separate semantic check was rejected because it would need a new diagnostic and would let an invalid document pass the schema.

### D2 — Instantiation

`instantiateContentEntities` (`@aesfw/app`) gains a `connectivityNodeFrom(component)` helper that returns `{ role: 'requirement', network }` when `requires` is a string, `{ role: 'provider', network }` when `provides` is a string, and `null` otherwise. The `connectivity` block is applied after the existing primary-component chain (so a producer, residence, or source may also require or provide connectivity), writing the core `connectivityNode` store component and, when the definition has no primary component (the connector archetype), the `definition` component. The network id is wrapped with `ids.stringId`, exactly as the 3.4 runtime stores it.

### D3 — No reference resolution and no new collection

The network id is a free-form string name, not a definition id. `resolveReferences` (`@aesfw/content`) gains no `connectivity` check and the collection catalogue (`DEFINITION_COLLECTIONS`) gains no entry, matching 3.4's runtime, which carries the network but does not match on it.

### D4 — Purity, encoding, and hashes

The schema and instantiation code are pure: no clock, RNG, global, floating point, async code, or module-level mutable state. The `connectivity` component is optional and absent from every existing content, fixture, and golden; the `connectivityNode` store kind already exists in the TDS-8.3 catalogue, so `encodeStores` gains no key and no existing world encodes differently. **No golden hash changes** and no versioned algorithm tag is bumped.

## Amendments and clarifications to 01–07

- None. CONT-6.8 already specifies `components.connectivity.requires`; this change implements the existing specification rather than amending it.

## Risks / Trade-offs

- [The schema union reports a generic `schema_invalid` rather than a connectivity-specific code] → this matches every other component rejection and needs no new diagnostic catalogue entry; an author sees the failing path under `components/connectivity`. A dedicated diagnostic can be added later if authoring feedback shows it is needed.
- [The network id is unresolvable] → 3.4 does not match networks for binary access, so a typo cannot be detected; when inter-location connectivity and `connected_graph` arrive (M6, 12.5) a reference kind can be introduced without changing this shape.
- [Instantiation sets only the connectivity node, not a location transform] → placement and transform are owned by 3.3/3.7, not by this gap closure; the requirement covers producing the node with the right role and network.

## Migration Plan

Additive optional schema component and additive instantiation. No save-format, protocol, or golden artifact changes. Rollback reverts the change; older code ignores the optional component.

## Open Questions

None blocking.
