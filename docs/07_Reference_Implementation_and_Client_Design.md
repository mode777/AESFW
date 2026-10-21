# Abstract Economic Simulation Framework
## Reference Implementation and Client Design

**Version:** 1.0  
**Status:** Design baseline (draft)  
**Companions:** 01–06, Implementation Roadmap (08)

---

## 1. Purpose and Scope

The framework (01–05) is game-agnostic. This document specifies the **reference implementation**, one concrete game built on it. It consists of three separable artifacts:

| Artifact | Package | Kind |
| --- | --- | --- |
| Reference content | `@aesfw-ref/content`, package `ref.tier` | Simulation content (data only) |
| Reference presentation | `@aesfw-ref/content`, package `ref.tier.presentation` | Presentation content (data only) |
| Reference web client | `@aesfw-ref/client-web` | Browser application |

The reference implementation has three jobs:

1. **Proof:** demonstrate that a complete game (01 §23.4, §23.5) can be built from configuration alone.
2. **Playtest vehicle:** make the design ideas of 01 §3 experienceable early and continuously during development.
3. **Integration example:** show how a client uses only the presentation contract (04) and the protocol (05 §22).

It is **equally abstract** as the framework: no setting, fiction, art, or narrative. Resources, tiers, and buildings are codes and geometric shapes. Requirement IDs for this document use the prefix `REF-`.

---

## 2. Separation Rules

These complement 05 §4.3:

1. The reference implementation uses only public framework entry points: content packages through the content loader, and the client through `@aesfw/protocol` and `@aesfw/host-web/client`.
2. The reference content is data only (YAML plus manifest). If it needs a capability the framework lacks, that is a framework change (with a theme-free fixture and test) and never a special case.
3. The reference client never computes mechanics (04 §2.2). Every number it shows comes from a projection, read model, or query, and every mutation is a command.
4. The framework's tests never depend on reference content. Reference tests live in `reference/*/test`.
5. Replacing the reference client with another client, or the reference content with another package, requires no framework change.

---

# Part A — Reference Content (`ref.tier`)

## 3. Identity

- Working title **TIER**, the original concept absorbed by 01 (Appendix A).
- The ID namespace is `ref.tier.*`, for example `ref.tier.resource.p1`, `ref.tier.population.s1`, `ref.tier.entity.refiner_h1`.
- Display names in the presentation package are the **codes** of 01 Appendix B (P1…P8, H1…H6, C1…C12, BM1…BM4, EP, S1…S4, AK1…AK4, T1…T3, regions α and β). There are no thematic names.

## 4. Time and Scale Conventions

Appendix B gives rates per minute of simulated time. The reference content uses:

| Convention | Value | Reason |
| --- | --- | --- |
| Tick duration | 1 tick = 1 simulated second (`tick_duration_ms: 1000`) | Appendix B times (8 s, 60 s, 60–600 s) become integer ticks |
| Base scale | **6000 base units = 1 display unit** for every storable and balance resource | A rate of *r* per minute becomes exactly **100 × r** base units per tick, so every Appendix B rate is an integer per tick |
| Capability scale | 1 (integer) | 1 AK per inhabitant |
| Ratios | Permille | Framework convention (05 §6.1) |

Conversion examples:

| Appendix B value | Content value |
| --- | --- |
| Per-capita demand 0.01 C/min | `quantity_per_population_per_tick: 1` |
| f(t) = 1.5 / 2.25 / 3.40 | `consumption_factor: 1500 / 2250 / 3400` (remainder accumulators, 05 §6.4) |
| Income 0.10 / 0.25 / 0.55 / 1.20 per inhabitant per minute | `rate_per_population_per_tick: 10 / 25 / 55 / 120` |
| Slot extractor 4 P/min | Batch recipe: 15 ticks → 6000 (one unit) |
| Refiner 4 P → 2 H per min | Batch recipe: 30 ticks, 12000 P → 6000 H |
| Combiner → 2 C/min | Batch recipe: 30 ticks → 6000 C |
| Advanced combiner → 1 C/min | Batch recipe: 60 ticks → 6000 C |
| Maintenance 20/min | `interval_ticks: 60`, quantity 120000 |
| Hub throughput 60 t/min, +20 per storage module | 6000 / +2000 base units per tick |
| Hub storage 500 per resource, +300 per module | 3,000,000 / +1,800,000 per resource |
| +1 inhabitant every 8 s | Growth `interval_ticks: 8` |
| −1 inhabitant every 4 s | Emigration `interval_ticks: 4` |
| Z ≥ 0.80 sustained 60 s | `sustained: { ticks: 60 }`, threshold 800 |
| Elasticity −2 % per 100 units within 10 min, recovery 5 %/min | `window_ticks: 600`, `step_quantity: 600000`, `step_change_permille: 20`, `recovery_permille_per_interval: 50`, `recovery_interval_ticks: 60` |
| Connection 60–600 s | `base_duration_ticks: 60–600` |
| Transport speed 1.0 / 0.8 / 0.7 | `speed_permille: 1000 / 800 / 700` |

This turns legible ratios (01 §3.10) into a property of the reference content: the reference chain of Appendix B.3 resolves to whole entity counts, and its supported population (200 S1 / 133 S2) is exactly what the planning read model shows (06, SCN-18).

## 5. Content Stages

The reference content grows with the roadmap (08) so the game is playable at every stage:

| Stage | Roadmap | Content |
| --- | --- | --- |
| R0 Seed | M2 | One abstract location, one tier (S1), two primary resources, one intermediate, one consumer, one need category, residences, no balance resource. Enough to observe the closed loop. |
| R1 Builder | M3–M5 | One grid location 40×40, construction resource BM1, Credits with maintenance and deficit policy, slot and area extractors, refiner, connector, storage module, throughput |
| R2 Archipelago | M6 | Three locations in one region, connections, T1 transport, routes |
| R3 Prototype | M7–M11a | Appendix B.0 counts: 6 locations (4 α, 2 β) with disjoint suitability, 4 primary, 2 intermediate, 4 consumer, 2 construction resources, EP, 2 tiers (S1, S2), 1 transport class, fog, establishment, one exchange per region, coverage service, purpose locks, unlocks |
| R4 Full | M11b | Appendix B complete: P1–P8, H1–H6, C1–C12, BM1–BM4, S1–S4 with AK1–AK4, categories B1–B4, T1–T3 |

## 6. Package Layout

```text
reference/content/
  ref.tier/
    package.yaml
    resources.yaml        regions.yaml        world.yaml
    locations.yaml        connections.yaml    distribution.yaml
    needs.yaml            population.yaml     satisfaction.yaml
    recipes.yaml          entities.yaml       templates.yaml
    transport.yaml        exchanges.yaml      economy.yaml
    transitions.yaml      unlocks.yaml        conditions.yaml
    curves.yaml           establishment.yaml
  ref.tier.presentation/
    package.yaml
    localization.en.yaml  mappings.yaml       formatting.yaml
  test/
    scenarios/            balance/            (SCN-14, SCN-18 reference half, balance runs)
```

Archetypes (01 §9.11) are expressed as **templates** (`ref.tier.template.slot_extractor`, …) composed into concrete entities (03 §5), so balancing one archetype changes all its instances.

## 7. Appendix B Mapping

| Appendix B | Reference definitions |
| --- | --- |
| B.1 World | `world.yaml`: 6 locations on `framework.spatial.grid` 40×40 with buildable ratio 400–700 permille; seeded `world_generation` stream for masks, slots (0–4 of types V-A to V-F), and suitability (0, 500, 1000); regions α and β with `distribution.yaml` disjoint over `ref.tier.property.suitability_*` and slot types; fog enabled; the player starts with one established α location and knows one adjacent location and the α exchange |
| B.2 Resources | One resource per code; tags `ref.tier.role.{primary,intermediate,consumer,construction,establishment}`; `complexity` 1–4 on consumer resources |
| B.3 Archetypes | Templates with the footprints, capability requirements, and maintenance of B.3; recipes per B.3 using the conversions of Section 4; unlock conditions as population-threshold unlocks |
| B.4 Tiers | `population.yaml`: capacity, AK output (exact matching, no substitutes), income with the satisfaction curve, consumption factor, active categories |
| B.5 Categories | `weighted_score` categories with `required_score_by_tier`; weights equal complexity; B3 uses `spatial_coverage`; B4 members require cross-region inputs |
| B.6 Bands | `satisfaction.yaml`: four bands; decline after 60 ticks of grace; emigration −1 every 4 ticks; residences decay at zero population (`empty_policy: decay`) |
| B.7 Transitions | Advancement with four conditions (occupancy, sustained Z, costs from the location inventory under purpose `population_transition`, population-threshold unlock); decline with `refund_policy: none` and `clamp_to_target_capacity` |
| B.8 Transport | `transport.yaml`: T1–T3 with typed slots (2×50, 4×100, 6×150 units), speeds, construction costs, maintenance |
| B.9 Economy | `while_enabled` maintenance; deficit policy pausing by highest maintenance first until the net rate is ≥ 0, with automatic reverse resume; one exchange per region with the elasticity of Section 4 |
| B.10 Modules | `ref.tier.modules` (optional package, M13): scenario objective and disruption settings |

## 8. Balancing Targets (Non-Normative)

These are product goals for R3 and R4. They are measured with the headless balance runner (`aesfw run` on scripted strategies in `test/balance`):

| Target | Goal |
| --- | --- |
| Start state | No deadlock. The initial stock allows building the first S1 chain without trade. |
| First advancement (S1 → S2) | Reachable by a competent scripted strategy within 15–25 simulated minutes |
| Pyramid pressure | Advancing more than 60 % of S1 residences in the start location starves primary production (SCN-7-style check on reference content) |
| Trade share | At equilibrium in the scripted strategy, exchange sales account for less than 20 % of revenue |
| Loss spiral | A scripted overexpansion strategy enters deficit, pauses entities, declines, and recovers without player input within 30 simulated minutes once expansion stops |
| Design intent | All design-intent diagnostics (03 §11.7) are clean with strict promotion (06 §10.3) |

---

# Part B — Reference Web Client (`@aesfw-ref/client-web`)

## 9. Design Principles of the Minimalist Aesthetic

1. **Mechanics are the art.** Every visible mark encodes simulation state. Nothing is decorative (the decoration test of 01 §3.1, applied to pixels).
2. **Numbers first.** Planning in this genre is arithmetic (01 §3.10). Rates, ratios, and supported population are first-class UI, set in tabular figures.
3. **Ink on paper.** A near-monochrome palette. Color is reserved for **attention**: blocked, throttled, short, in deficit. When everything works, the screen is calm and grey.
4. **Geometry over icons.** Archetypes are distinguished by shape, state by fill, outline, dash, and hatch. No raster assets are required (04 §6 fallback shapes are the primary representation).
5. **One gesture, one command.** Every mutation is a visible, named command (04 §15). There are no hidden automations in the client.
6. **Calm motion.** Only transport moves continuously. UI transitions are short and suppressed under reduced-motion settings.
7. **Text is a full client.** Every view has a tabular or text equivalent (04 §17).

## 10. Visual Language

### 10.1 Design tokens

Defined once as CSS custom properties in `src/style/tokens.css`. A dark theme inverts the tokens.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#f7f7f4` | `#121212` | Background |
| `--ink` | `#151515` | `#ececec` | Primary marks, text |
| `--ink-2` | `#5c5c5c` | `#a6a6a6` | Secondary text, inactive marks |
| `--ink-3` | `#a3a3a3` | `#5e5e5e` | Grid lines, disabled |
| `--rule` | `#dedede` | `#2a2a2a` | Dividers, cell boundaries |
| `--accent` | `#d9480f` | `#ff7a3d` | Attention only: blocked, shortage, deficit, invalid placement |
| `--focus` | `#1c6dd0` | `#6aa8ff` | Keyboard focus and selection only |
| `--font-ui` | `system-ui, sans-serif` | same | Labels |
| `--font-num` | `ui-monospace, monospace` (tabular) | same | All numbers |
| `--size-1…4` | 11 / 13 / 16 / 20 px | same | Type scale |
| `--space-n` | n × 4 px | same | Spacing scale |
| `--stroke-1…3` | 1 / 1.5 / 2 px | same | Rules / shapes / selection |
| `--motion` | 120 ms ease-out | same | UI transitions (0 ms when reduced motion is on) |

Text contrast is at least 7:1 against `--paper`. State is never encoded by color alone (Section 10.3).

### 10.2 Shape grammar

| Archetype (01 §9.11) | Shape | Interior encoding |
| --- | --- | --- |
| Location hub | Square with inner square | Storage fill level as a horizontal bar |
| Connector | Thin cell-filling line segment | None |
| Slot extractor | Triangle on a slot marker (small ring) | Process progress as a fill rising from the base |
| Area extractor | Triangle with dotted working-area outline | Progress fill; suitability shown as working-area dot density |
| Refiner | Square | Progress as a clockwise outline sweep |
| Combiner / advanced combiner | Square with 2 or 3 input notches | Progress sweep |
| Residence | Circle | Occupancy as fill ratio; tier as concentric rings (S1 = 1 … S4 = 4) |
| Coverage service | Diamond | Coverage radius as a hairline circle on hover or selection |
| Storage module | Square with three horizontal bars | None |
| Transport unit | Small filled dot | Cargo slots as tiny segments around the dot |
| Location (world map) | Large circle | Region pattern: α = solid hairline, β = double hairline; unknown = dashed outline |
| Connection | Line | Duration label at midpoint; enabled solid, disabled dashed |

### 10.3 State encoding

| State | Encoding |
| --- | --- |
| Active, processing | Ink outline; progress fill or sweep |
| Idle (nominal, waiting for a batch) | Ink outline, no fill |
| Blocked | `--accent` outline plus a small block-reason glyph letter (I = input, C = capability, A = access, O = output, T = throttled) |
| Throttled | Ink outline with an accent tick mark; throttle shown as permille in the inspector |
| Disabled by player | `--ink-3` outline, diagonal hatch |
| Paused by deficit | `--accent` diagonal hatch |
| Planned or constructing | Dashed outline; construction progress as dash fill |
| Selected | `--focus` 2 px outer ring |
| Invalid placement ghost | `--accent` dashed outline, reasons listed next to the cursor |

## 11. Layout

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│ TIER  ▸ tick 12 345  ▸ ×4  ‖ ▷ ▷▷   │ Credits 1 204.50 (+3.20/min)  │ ⚠ 2 blocked │  top bar
├──────────────┬─────────────────────────────────────────────────┬──────────────────┤
│ NAVIGATOR    │                                                 │ INSPECTOR        │
│ World ▾      │                 CANVAS                          │ (selection)      │
│  α  L1 ●     │   world map  │  location grid                   │  definition      │
│     L2 ○     │                                                 │  state, reasons  │
│     L3 ◌     │                                                 │  inputs/outputs  │
│  β  L5 ◌     │                                                 │  commands        │
│ Build ▾      │                                                 │                  │
│  palette     │                                                 │                  │
├──────────────┴─────────────────────────────────────────────────┴──────────────────┤
│ DRAWER  [Inventory] [Population] [Economy] [Planning] [Logistics] [Exchange] [Log]│
└───────────────────────────────────────────────────────────────────────────────────┘
```

- Desktop first, minimum width 1024 px. The drawer and inspector are resizable and collapsible.
- The canvas shows either the **world map** or one **location grid**. Double-click or Enter on a location opens its grid. Escape returns to the world map.

## 12. Views

Each view lists the read models it uses (04 §10) and the commands it can issue (05 §16.2).

### 12.1 World map

- **Shows:** locations laid out by region clusters (deterministic layout from location IDs), connections with durations, transport dots interpolated along connections, fog states, ownership marks.
- **Data:** snapshot locations and connections, transport detail (04 §10.4).
- **Commands:** `ActivateLocation`, `DeactivateLocation`; starting explore or establish orders (opens the logistics view prefilled).
- **Fog:** unknown locations show only a dashed outline and known connections. No attributes are rendered because none are received (04 §9.3).

### 12.2 Location grid

- **Shows:** a 40×40 SVG grid with non-buildable cells hatched, slot markers, entities as shapes (Section 10.2), working areas, coverage radii on demand, and connectivity to the hub on demand (overlay key `C`).
- **Data:** location summary (04 §10.2), entity snapshots.
- **Commands:** `PlaceEntityPlan` (placement mode, Section 13.3), `CancelEntityPlan`, `CommitConstruction`, `DeconstructEntity`, `SetEntityEnabled`.
- **Overlays:** suitability per selected property, coverage, connectivity, throughput pressure, and block reasons. Overlays are client-local view state.

### 12.3 Inspector

- **Entity:** definition code, lifecycle, enabled or paused state, recipe and progress, inputs and outputs per minute, block reasons, capability request and allocation, maintenance and charge policy (04 §10.1). Commands: `SetEntityEnabled`, `SelectRecipe`, `SetProcessPriority`, `SetCapabilityPriority`.
- **Residence:** tier, population/capacity, need breakdown (04 §10.3) with demand, delivery, and fulfillment per need, category contributions, Z and band, transition eligibility with a per-condition checklist including sustained-timer progress. Command: `RequestPopulationTransition`.
- **Transport unit:** order, station list with cursor, cargo by slot, state, failure reasons (04 §10.4). Commands: `AssignTransport`, `UnassignTransport`.

### 12.4 Drawer views

| View | Shows | Read models | Commands |
| --- | --- | --- | --- |
| Inventory | Per location: stored, reserved, capacity, purpose locks, net rate per resource | Location summary | `SetInventoryPolicy`, `SetResourcePurposeLock` |
| Population | Tier pyramid per location and owner (horizontal bars), capability supply versus demand per AK, Z distribution histogram | Location summary, entity detail | — |
| Economy | Balance, trend sparkline, revenue and expenses by source, idle-but-paying entities, deficit-paused entities in pause order | Owner economy (04 §10.6) | `ResumeDeficitPausedEntities` |
| Planning | Per consumed resource: net rate, per-capita demand per tier, **supported population per tier**, coverage ratio; chain table with stage counts and integer ratios | Planning metrics (04 §10.5) | — |
| Logistics | Transport orders and units; route editor (station list, actions, quantity rules, price limits) | Transport detail | `CreateTransportOrder`, `ModifyTransportOrder`, `DeleteTransportOrder`, `AssignTransport`, `UnassignTransport` |
| Exchange | Per exchange: buy and sell price versus base, recent volume, recovery estimate | Exchange quotes (04 §10.7) | Opens a trade order in the logistics view |
| Log | Domain events as text lines, filterable by type, location, and entity; clicking selects the subject | Events | — |

### 12.5 Debug overlay

Toggled with `` ` ``. Shows tick, revision, last state hash, protocol version, content checksum, worker tick time, and frame time. Offers step-N and export of the save or replay. It is a client of the same protocol and has no privileged access (02 §20).

## 13. Interaction Model

### 13.1 Modes

`inspect` (default), `place`, `route-edit`. The current mode is always shown in the top bar. Escape returns to `inspect`.

### 13.2 Keyboard map (excerpt)

| Key | Action |
| --- | --- |
| Space | Pause or resume |
| 1–5 | Speed ×1, ×2, ×4, ×8, ×16 |
| `.` | Step one tick while paused |
| B | Open build palette (place mode) |
| R | Rotate the placement ghost |
| E | Toggle the selected entity (`SetEntityEnabled`) |
| Tab / Shift+Tab | Cycle focusable items in the active panel |
| Arrows | Move the grid cursor (keyboard placement and selection) |
| Enter | Confirm (place, open, apply) |
| Ctrl+K | Command palette (every command and view, by name) |
| C, V, S, T | Overlays: connectivity, coverage, suitability, throughput |

### 13.3 Placement flow

1. Choose a definition in the palette. Only unlocked definitions are listed, as given by definition metadata (04 §4).
2. A ghost footprint follows the cursor. On every cell change (debounced to one per animation frame) the client sends a `placement_query` (04 §12.1) and draws the ghost as valid (ink dashed) or invalid (accent dashed, with reasons listed).
3. Click or Enter submits `PlaceEntityPlan`. The ghost stays until the command result arrives. An accepted command shows a planned entity in the next delta, and a rejection shows the localized reason.
4. The client never decides placement validity itself (04 §14).

### 13.4 Feedback

- Command rejections and phase-01 `CommandRejected` events appear as a short, localized toast with the error code arguments, and are kept in the log.
- No optimistic state changes. The only speculative visual is the placement ghost.

## 14. Client Architecture

### 14.1 Modules

```text
reference/client-web/src/
  main.ts                 composition root: creates the worker, SessionClient, store, views
  session/                SessionClient wiring (@aesfw/host-web/client), subscription
  store/
    mirror.ts             authoritative mirror: snapshot + deltas by revision, resync (04 §18)
    view-state.ts         client-local state: selection, mode, overlays, open panels, locale (04 §16)
    signals.ts            ~100-line signal/computed implementation
  selectors/              PURE: (mirror, viewState, presentation) → view models
  views/                  DOM/SVG components: mount(el), update(vm), dispose()
  dom/                    tiny helpers: h(), svg(), keyed list reconciliation
  input/                  keyboard map, pointer handling, command palette
  i18n/                   localization lookup with key fallback, number formatting by resource scale
  style/                  tokens.css, base.css
```

### 14.2 Data flow

```text
worker ──snapshot/delta/events──▶ mirror (signal)
                                     │
             viewState (signal) ─────┼──▶ selectors (computed, pure) ──▶ view models ──▶ views.update()
                                     │
user input ──▶ input handlers ──▶ command envelope ──▶ SessionClient.submit()  (no local mutation)
```

- **Mirror:** applies deltas only to the matching base revision. On mismatch it requests a full snapshot (04 §18). The mirror is replaced, never patched by the client's own logic.
- **Selectors:** contain all formatting, sorting, grouping, and state-to-shape decisions. They are the unit-tested surface (06 §13.1).
- **Views:** imperative, minimal, and keyed. A view updates only the attributes that changed. No virtual DOM, no framework.

### 14.3 Rendering

- One `requestAnimationFrame` loop. Rendering happens only when a signal changed or an interpolation is in progress.
- **SVG layering** per location grid: background `<path>` (one path for all cell rules and hatches), overlay layer, entity layer (one `<g>` per entity, keyed by entity ID), ghost layer, selection layer.
- **Interpolation:** transport positions interpolate between the last two authoritative movement states, converge to the authoritative state, and never delay commands (04 §14).

### 14.4 Presentation package use

- `mappings.yaml` maps definitions to `fallback_shape` (Section 10.2), display category, and sort order. Missing mappings fall back to a plain square labelled with the string ID's last segment (04 §6).
- `localization.en.yaml` holds codes and short descriptions. Missing keys display the key itself (04 §7).
- `formatting.yaml` declares display scale per resource (6000), decimals, and rate unit (`/min`, converted from per-tick rates using `tick_duration_ms`).

### 14.5 Client-local persistence

View settings (theme, overlays, panel sizes, locale, keyboard preferences) are kept in `localStorage` under `aesfw-ref.client.v1`. Game saves are managed by the host (05 §21.1). Discarding client-local data never affects a game (04 §16).

### 14.6 Performance budgets

| Measure | Budget (mid-range laptop, Chromium) |
| --- | --- |
| Frame time while panning a 40×40 grid with 300 entities | ≤ 8 ms p95 |
| Delta application + selector recomputation per published tick | ≤ 2 ms p95 |
| Worker tick time on R4 content at ×16 | ≤ 2 ms median (05 §24 `bench.reference`) |
| Time to first interactive frame (cold, R3 content) | ≤ 2 s |

## 15. Accessibility

- Every interactive element is reachable and operable by keyboard. Focus is always visible (`--focus`).
- SVG entities have `role="img"` with localized `aria-label`s (code, state, block reasons). The grid supports arrow-key cursor navigation with announcements.
- State encoding never relies on color alone: hatch, dash, glyph letters, and fill all carry the meaning as well (Section 10.3).
- `prefers-reduced-motion` disables interpolation easing and UI transitions. Transport then jumps between authoritative positions.
- **Table mode:** the canvas can switch to a tabular text projection of the current location or world (04 §17). It also serves as the second, simpler client for 04 §20 ("two different clients").

## 16. Testing Hooks

- Every interactive element carries a stable `data-testid` derived from its role and the subject's string ID or entity ID.
- Selectors are exported from `src/selectors/index.ts` for unit tests (06 §13.1).
- The composition root accepts an injected `SessionClient`, so Playwright can run against a real worker and component tests against a fake.

## 17. Non-Goals (v1)

- Raster art, 3D, audio, music, and sonification
- Mobile and touch-first layouts
- Multiplayer UI (the multiple-owners module, M13, gets a minimal owner switcher for testing only)
- Tutorials or narrative onboarding. Contextual hints derived from block reasons are allowed.
- Any client-side calculation of mechanics, including "previews" other than authoritative placement queries

## 18. Acceptance Criteria

- The reference content validates in strict mode with all design-intent diagnostics clean at stage R3 and above (06 §10.3).
- SCN-14 passes on the reference content, and the reference half of SCN-18 reproduces 200 S1 / 133 S2 for the Appendix B.3 chain.
- The client imports only `@aesfw/protocol` and `@aesfw/host-web/client` from the framework (enforced by dependency-cruiser).
- Every 04 §15 interaction is reachable by mouse and by keyboard.
- Every on-screen number traces to a projection, read model, or query field (selector unit tests).
- Replacing `ref.tier.presentation` with an empty presentation package still yields a usable client with fallback shapes and key labels.
- The budgets of Section 14.6 hold in the L11 performance scenarios.
