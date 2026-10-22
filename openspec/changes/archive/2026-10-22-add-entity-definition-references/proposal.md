# Proposal

## Why

M2 milestone verification found a gap: content instantiation never populates the `definition` component (TDS-8.3), so projections and read models fall back to `entity.<id>` for `definition_id`. The entity inspector therefore shows a synthetic ID instead of the real definition code, and the 2.10 smoke flow 2 cannot assert the reference content's IDs. This change closes that gap and adds the missing verification of the M2 exit criterion "disabling a producer visibly lowers satisfaction".

Source: TDS-8.3, PIC-9.1, PIC-10.1, GDD-10.3, GDD-12.4

## What Changes

- Content-to-world instantiation (`instantiateContentEntities`) SHALL set each content entity's `definition` component to its definition handle.
- Projections and read models SHALL expose the real `definition_id` for entities that have the component.
- Add an integration test that disabling a producer blocks it and lowers the residence's need fulfillment and satisfaction.
- **HASH-CHANGING:** the `definition` component changes the encoded world, so the `basic_loop` scenario golden is regenerated with an explanation (06 §9.4).

## Capabilities

### Modified Capabilities

- `kernel/world-state`: the `definition` component is populated at instantiation and exposed through projections.

## Impact

- **Packages:** `@aesfw/app` (`src/content/instantiate.ts`); goldens in `fixtures/scenarios/`.
- **Tick phases:** none new (phase 01 already stamps `revision`; `definition` is set at instantiation, before any tick). **Commands:** none new. **Events:** none. **Error codes:** none.
- **Out of scope:** entity construction/deconstruction (3.2) and location definition components (locations already expose their template).
- **Verification impact:** `pnpm test` gains a definition-reference test and a disable-lowers-satisfaction integration test; `fixtures/scenarios/basic_loop.hashes.json` is regenerated.
