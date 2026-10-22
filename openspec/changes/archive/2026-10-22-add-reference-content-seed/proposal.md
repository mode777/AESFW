# Proposal

## Why

Roadmap 08, M2 item 2.7 (`add-reference-content-seed`, capability `reference/content`, size S). M2's demo is the first playtest of the closed loop, which needs concrete content. This row delivers the R0 seed content package and the presentation-package skeleton. Depends on: `add-golden-basic-loop` (1.15) — archived 2026-10-21.

## What Changes

- Add the reference simulation content package `ref.tier` at `reference/content/ref.tier` with the R0 seed of 07 §5: one abstract location, one tier (`S1`), two primary resources (`P1`, `P2`), one intermediate (`H1`), one consumer (`C1`), one need category, residences, and no balance resource.
- Add the reference presentation-package skeleton `ref.tier.presentation` (localization, mappings, formatting) per 07 §6 and PIC-5.
- The R0 content validates with `aesfw validate --strict` and runs the closed loop headlessly.
- No **BREAKING** changes; no **HASH-CHANGING** framework artifacts.

## Capabilities

### New Capabilities

- `reference/content`: the R0 reference content and presentation skeleton.

## Impact

- **Packages:** `reference/content/ref.tier/**` and `reference/content/ref.tier.presentation/**` (data only). No framework package changes.
- **Tick phases:** none. **Commands:** none. **Events:** none. **Error codes:** none.
- **Out of scope:** R1 content (3.6), R2 (6.8), R3/R4 (11.1, 11.5), reference scenarios and balance runs (11.2, 11.3).
- **Verification impact:** `aesfw validate reference/content/ref.tier --strict` passes; no framework test changes.
