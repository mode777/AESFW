# Proposal

## Why

Roadmap 08, M5 item 5.2 (`add-storage-providers`). Throughput is now limited, but nothing can expand it or the location inventory, so the over-densification penalty has no counter-play and GDD-9.7's storage provider is absent. This change lets storage entities add inventory capacity and internal-logistics throughput, retiring the R-08 legibility gap that the throughput limit cannot be answered by building.

## What Changes

- Entity definitions gain a `storage_provider` component (CONT-6.8, GDD-9.7): a target inventory reference, optional total and per-resource capacity bonuses, and an optional throughput bonus.
- A storage provider's bonuses apply only while the entity is active (an entity without a lifecycle component counts as active). The component is recorded in the existing `modifierSet` store, so no new store kind and no catalogue-wide hash change.
- Transaction capacity checks and the INV-03 invariant use the effective capacity — base inventory capacity plus active storage-provider bonuses.
- Phase 10 adds active storage-provider throughput to the location's pool capacity.
- Inventory projections report effective capacity, so a client sees the expanded value.
- Theme-free tests for capacity expansion, throughput expansion, active/planned gating, and INV-03 with an expanded inventory.

## Capabilities

### New Capabilities

### Modified Capabilities

- `sim/internal-logistics`: throughput pool capacity includes active storage providers; the storage-provider runtime shape and application helper are added.
- `content/schemas`: the entity definition gains `storage_provider`.
- `app/projections`: inventory DTO capacity is the effective capacity.
- `testkit/harness`: INV-03 compares against effective capacity.

## Impact

- **Packages:** `@aesfw/core` (`sim/internal-logistics/storage.ts`, phase 10, `tx` capacity checks, placement apply), `@aesfw/content` (entity schema), `@aesfw/app` (entity instantiation, inventory projection), `@aesfw/testkit` (INV-03), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 01 `applyCommands` writes `modifierSet` when a storage provider is placed; phase 10 `allocateThroughput` reads `modifierSet` and adds its throughput to the pool. Transactions read `modifierSet` through the effective-capacity helper.
- **Store kinds:** `modifierSet` (already in the v1 catalogue; now populated for storage providers).
- **Commands/events/error codes/diagnostics:** none.
- **Protocol/save format:** no protocol or save-format change; the effective capacity is derived. **HASH-CHANGING** only for content that declares `storage_provider`; existing fixtures declare none, so their goldens are unchanged.
- **Dependencies on archived changes:** 5.1 `add-throughput-allocation` (archived 2026-10-23).

## Out of Scope

- 5.3 `add-golden-throughput-throttling`: the SCN-10 scenario and its golden.
- 5.4 `add-client-throughput-indicators`: the client gauge, overlay, throttle display, and the R1 storage-module content.
- 8.3 `add-location-establishment`: hub establishment and transport endpoints.
- Inventory access-policy changes (`connected_graph`, `explicit_logistics`, 12.5).
- Storage-provider acceptance rules or per-resource inventory creation.
