# Design — add-entity-definition-references

## Context

2.4 (read models) and 2.6 (worker host) are archived. `readWorld.definition`, `project`, and `entityDetail` already read the `definition` component, but instantiation never sets it, so the fallback `entity.<id>` is used. This document records the fix and the hash change.

## Goals / Non-Goals

**Goals:** populate `definition` at instantiation and add the disable-lowers-satisfaction integration test.

**Non-Goals:** entity construction/deconstruction (3.2); location definition components (locations expose their template).

## Decisions

### D1 — Where the component is set

`instantiateContentEntities` (now in `@aesfw/app`) sets `world.stores.get('definition').set(entity, { definition: definition.handle })` for each entity it creates from `registry.definitionsOf('entity')`. Locations keep deriving `definition_id` from their `location.template` component; inventories have no definition handle and are not projected as entities.

### D2 — No core change

`instantiateWorld` and the `WorldPlan` type are unchanged. The `definition` component value is the plain `{ definition: DefinitionHandle }` shape read by `readWorld`.

### D3 — Hash change

Adding a component to each instantiated entity changes `encodeWorld` and therefore the state hash. The `basic_loop` scenario golden is regenerated with `pnpm golden:update basic_loop`; the empty-world browser golden has no entities and is unchanged. This is the intended, reviewed change of 06 §9.4: entity identity is now authoritative. No versioned algorithm tag changes.

### D4 — Disable integration test

The test builds a small content with a source → producer → residence chain (the testkit content builder), advances to a steady state, disables the producer through the core command path (`runPhases` with a `SetEntityEnabled` command), and asserts the producer is blocked with `entity_disabled` and the residence's need fulfillment falls. It runs in `@aesfw/testkit` (which may depend on app, content, core, protocol).

## Amendments and clarifications to 01–07

- None. This implements TDS-8.3 as written.

## Risks / Trade-offs

- [Golden change] → explained in D3; only the content-entity component set changes.
- [Test placement] → the disable test is an integration test in testkit, not a new system unit test, because it exercises phases 01→07→20→21 together.

## Migration Plan

Additive component at instantiation and one regenerated golden. Rollback is reverting the change and the golden.

## Open Questions

None blocking.
