# Abstract Economic Simulation Framework
## Verification Specification

**Version:** 1.0  
**Status:** Implementation baseline (draft)  
**Companions:** 01–05, Reference Implementation and Client Design (07), Implementation Roadmap (08)

---

## 1. Purpose and Scope

This document defines how the framework and the reference implementation are verified. It turns the goal "the game logic is pure simulation and can be fully unit tested" into concrete, checkable rules:

- How requirements are identified and traced to tests
- Which test levels exist, what each covers, and which tools they use
- How each simulation system is unit tested in isolation
- The invariant catalogue that every simulated tick must satisfy
- Property-based, determinism, replay, and persistence testing
- Scenario (golden) tests and their update policy
- Content-validation, projection, protocol, host, and client testing
- Performance verification, coverage and quality gates
- The mapping of every acceptance criterion in 01–04 to a verifying test
- The definition of done for implementation changes

Requirement IDs for this document use the prefix `VER-`.

---

## 2. Verification Principles

1. **Test the pure core exhaustively and the shell thinly.** All behavior lives in pure packages (05 §3.1). Shell code (worker, CLI, DOM) has smoke tests only.
2. **Every requirement is traceable.** A normative statement in 01–05 or 07 is covered by at least one test that names its requirement ID, or it is listed as exempt with a reason.
3. **Determinism is tested on every level.** Every scenario test also checks hash stability, and every property test runs with recorded seeds.
4. **Tests are deterministic themselves.** No test depends on wall-clock time, real randomness, or execution order. fast-check seeds are printed on failure and can be pinned.
5. **Invariants are checked continuously.** Integration, property, and scenario tests run the invariant checker after every tick (Section 6).
6. **Fixtures are minimal and theme-free.** Framework fixtures use `test.*` or `demo.*` IDs. Only reference tests use `ref.*` content.
7. **Goldens change only on purpose.** A changed golden hash is a reviewed, explained event (Section 9.4).

---

## 3. Requirement Identifiers and Traceability

### 3.1 ID scheme

| Document | Prefix | Example |
| --- | --- | --- |
| 01 Core Game Framework GDD | `GDD` | `GDD-12.3` |
| 02 Simulation Architecture | `ARCH` | `ARCH-5.2` |
| 03 Content Configuration Specification | `CONT` | `CONT-11.7` |
| 04 Presentation Integration Contract | `PIC` | `PIC-9.3` |
| 05 Technical Design Specification | `TDS` | `TDS-6.3` |
| 06 Verification Specification | `VER` | `VER-6` |
| 07 Reference Implementation and Client Design | `REF` | `REF-12.2` |
| Invariants (this document, Section 6) | `INV` | `INV-04` |
| Scenarios (this document, Section 9.3) | `SCN` | `SCN-04` |

An ID points to the deepest numbered heading that contains the requirement. When a section has several independently testable statements, a suffix letter MAY be added (`GDD-10.2a`, `GDD-10.2b`); the suffix list is then kept in `tools/trace/suffixes.yaml`.

### 3.2 Tagging tests

Test titles start with the requirement IDs they verify, in square brackets:

```ts
describe('[GDD-12.3] weighted category fulfillment', () => {
  it('[GDD-12.3][GDD-3.5] caps each member at full supply', () => { /* … */ });
  it('[GDD-12.3] reaches equal D_k through breadth or depth', () => { /* … */ });
});
```

OpenSpec scenarios (08 §7) name the same IDs, so a requirement can be followed from document to spec to test.

### 3.3 Trace tool

`pnpm trace` (in `tools/trace`):

1. Extracts candidate requirement IDs from the numbered headings of 01–05 and 07.
2. Removes IDs listed in `tools/trace/exempt.yaml` (non-normative sections such as purpose statements, examples, and Appendix B), each with a reason.
3. Scans test titles in all packages for `[ID]` tags.
4. Writes `docs/traceability.md`, a generated matrix of requirement → tests, and reports untraced IDs.

Untraced IDs are a warning until roadmap milestone M10 and an error afterwards, limited to the sections whose features exist (08 lists the sections per milestone).

---

## 4. Test Levels

| Level | Name | Scope | Packages | Tooling | Gate |
| --- | --- | --- | --- | --- | --- |
| L0 | Primitive | `fx`, `det`, ids, codecs | core, protocol | Vitest + fast-check | Every PR |
| L1 | System unit | One system/phase on a hand-built world | core | Vitest, testkit builders, `runPhases` | Every PR |
| L2 | Tick integration | Full `step` on small worlds, several ticks | core | Vitest, invariant checker | Every PR |
| L3 | Content | Loader stages, schemas, composition, compilation, diagnostics | content | Vitest, fixture packages | Every PR |
| L4 | Application | Gateway, projections, read models, deltas, persistence codecs | app | Vitest | Every PR |
| L5 | Property | Invariants under generated content and command streams | core, app | fast-check | Every PR (bounded runs), nightly (extended runs) |
| L6 | Scenario (golden) | Configured scenarios over many ticks with expected metrics and hashes | testkit, fixtures, reference | Scenario runner | Every PR |
| L7 | Determinism matrix | Replays across Node and Chromium, Firefox, WebKit | testkit, host-web | Vitest browser mode, Playwright | Every PR (Chromium), nightly (all engines) |
| L8 | Host and protocol | Worker message flow, CLI commands | host-web, host-node, protocol | Vitest (fake worker), CLI smoke | Every PR |
| L9 | Client view model | Pure selectors from projection to view model | client-web | Vitest | Every PR |
| L10 | Client end-to-end | Browser smoke flows, accessibility checks | client-web | Playwright, axe-core | Every PR (smoke), nightly (full) |
| L11 | Performance | Benchmark scenarios | testkit, host-node | `aesfw bench` | Nightly, trend-tracked |

---

## 5. Kernel Unit Testing (L1)

### 5.1 Pattern

Every system module (05 §11.1) has a test file next to it. Each test:

1. Builds the smallest content and world needed with the testkit builder.
2. Runs exactly the phases under test with `runPhases`.
3. Asserts state, events, outcomes, and journal entries.

```ts
import { content, world } from '@aesfw/testkit';
import { runPhases } from '@aesfw/core/testing';

it('[GDD-10.2][GDD-4.3] does not start a process with an incomplete input set', () => {
  const c = content()
    .resource('test.r.a').resource('test.r.b').resource('test.r.out')
    .recipe('test.recipe.x', { inputs: { 'test.r.a': 2000, 'test.r.b': 1000 }, outputs: { 'test.r.out': 1000 }, duration: 10 })
    .producer('test.e.p', { recipes: ['test.recipe.x'] })
    .abstractLocation('test.loc', { capacity: 10 })
    .build();

  const w = world(c)
    .location('test.loc', { stock: { 'test.r.a': 2000 } })      // test.r.b missing
    .entity('test.e.p', { at: 'test.loc', recipe: 'test.recipe.x' })
    .build();

  const out = runPhases(w, c.registry, [7, 11, 12, 13], noCommands());

  expect(producerStatus(out.world, 'test.e.p')).toEqual({ state: 'idle', blockReasons: ['missing_input'] });
  expect(stock(out.world, 'test.loc', 'test.r.a')).toBe(2000);           // nothing reserved or consumed
  expect(out.events).toContainEqual(eventOfType('ProductionBlocked'));
});
```

### 5.2 Testkit builders

`@aesfw/testkit` provides:

- `content()`: a fluent builder that produces a `CompiledContent` through the real content pipeline (it emits normalized definitions and runs `loadContent`), so tests never bypass validation.
- `world(content)`: places locations, entities, stock, population, owners, knowledge, and timers through public setup paths or `@aesfw/core/testing` store access.
- Query helpers: `stock`, `reserved`, `producerStatus`, `population`, `satisfaction`, `balance`, `knowledge`, `price`, `eventsOfType`, …
- Assertion helpers: `expectInvariants(output)`, `expectHashStable(fn)`, `expectSameState(a, b)`.
- Generators for property tests (Section 7.2).

### 5.3 Required unit coverage per system

For every system, tests MUST cover:

- The nominal path
- Every block reason or rejection code the system can emit
- Boundary values: zero quantities, exact capacity, exactly full reservations, timers at `ticks − 1`, `ticks`, `ticks + 1`
- Ordering: two or more subjects competing for the same pool, verifying the ascending-ID and remainder rules (05 §6.3, §9)
- Inactive location and paused or disabled entity exclusion

### 5.4 Write-set checks

In test builds, `TickContext` wraps stores not listed in a system's `writes` as read-only proxies (05 §11.2). A system that writes outside its declaration fails its own unit tests.

---

## 6. Invariant Catalogue

`checkInvariants(before, output, registry)` in `@aesfw/testkit` evaluates every invariant below. L2, L5, and L6 tests call it after every tick. Each invariant is also a unit-tested function.

| ID | Invariant | Source |
| --- | --- | --- |
| INV-01 | No stored quantity is negative, except balance resources with `allow_negative: true`. | GDD-7.5, ARCH-6.3 |
| INV-02 | For every inventory and resource, active reservations ≤ stored quantity. | GDD-8.3 |
| INV-03 | Stored quantity + capacity reservations ≤ capacity, for every capacity rule. | GDD-8.1, GDD-8.4 |
| INV-04 | Conservation: for every resource, the change in total stored quantity equals deposits − withdrawals − commits per the tick journal, and transfers net to zero. | ARCH-6, TDS-12.4 |
| INV-05 | Capability allocations per pool never exceed supply. A request is satisfied only by its exact capability or an explicit substitute. | GDD-4.7, ARCH-13 |
| INV-06 | Throughput grants per location ≤ capacity. Each grant ≤ its request, and grants differ from exact proportional shares by less than one unit. | GDD-15.1, TDS-6.3 |
| INV-07 | 0 ≤ population ≤ residence capacity, and every population group has exactly one valid tier. | GDD-4.1, GDD-11 |
| INV-08 | Fulfillment, category results, and satisfaction lie in [0, 1000]. | GDD-12 |
| INV-09 | Every residence is in exactly one satisfaction band, and bands cover [0, 1000] without overlap. | GDD-12.6 |
| INV-10 | Entity IDs are unique, and `nextEntityId` exceeds every allocated ID. IDs are never reused. | ARCH-3.1 |
| INV-11 | Entities paused by the deficit policy neither produce nor pay maintenance. | GDD-20.3 |
| INV-12 | Exchange prices stay within `[min_price_permille, max_price_permille] × base`. | GDD-17.3 |
| INV-13 | No sequence of trades within one tick and one exchange yields a profit from buying and reselling the same resource. | GDD-17.3 |
| INV-14 | Knowledge state per owner and location never decreases (unknown < discovered < established) unless the configuration explicitly allows it. | GDD-16.1 |
| INV-15 | A completed production commits all inputs and deposits all outputs, or neither. | ARCH-6.2 |
| INV-16 | Every `typed_slots` cargo slot holds at most one resource type. | GDD-15.4 |
| INV-17 | Purity: stepping a clone and the original with identical input yields identical hashes, events, and outcomes. | TDS-5.2 |
| INV-18 | Persistence: `hash(decode(encode(w))) = hash(w)`, and continuing N ticks from the decoded world matches continuing from the original. | ARCH-15, TDS-19 |
| INV-19 | No projection, delta, read model, or event for an actor contains attributes of a location unknown to that actor. | ARCH-8.3, PIC-9.3 |
| INV-20 | Rebuilding every derived cache from scratch yields the same cache as incremental maintenance. | TDS-8.4 |
| INV-21 | `step` never throws for any accepted command stream on valid content. Rejections are outcomes, not exceptions. | GDD-4.9, TDS-23 |
| INV-22 | Every process with a non-empty block-reason list is not processing, and every processing process has no block reasons except `throughput_throttled`. | GDD-10.3 |
| INV-23 | Owner balance changes only through `account` and `trade` transactions. | GDD-20.2 |
| INV-24 | Store iteration is ascending by entity ID, and no tombstone survives phase 30. | TDS-8.2 |

Invariants that need the journal (INV-04, INV-23) force `journal: true` in the tests that use them.

---

## 7. Property-Based Testing (L5)

### 7.1 Properties

| ID | Property | Generators |
| --- | --- | --- |
| P-01 | `fx` operations match a `BigInt` reference implementation or throw `ArithmeticOverflow` exactly when the reference result is outside the safe range. | Integers near the safe-range boundaries |
| P-02 | `alloc-v1` grants sum to `min(C, R)`, each grant ≤ request, the result is independent of input array order once sorted by ID, and the algorithm is deterministic. | Capacities and request vectors |
| P-03 | Rate accumulators deliver totals within one unit of the exact rational total over any number of ticks. | Rates, multipliers, tick counts |
| P-04 | `canonicalStringify` is invariant under object key insertion order and round-trips through `JSON.parse`. | Arbitrary JSON-safe values |
| P-05 | RNG streams are reproducible from seed and stream name, and streams are independent of each other's consumption. | Seeds, stream names, draw sequences |
| P-06 | All invariants of Section 6 hold for every tick of random command streams on generated minimal content. | Content generator × command-stream generator |
| P-07 | INV-17 (purity) holds for generated worlds and inputs. | World generator |
| P-08 | INV-18 (persistence) holds when a save is taken at a random tick. | Scenario × random tick |
| P-09 | INV-19 (fog safety) holds for generated multi-location worlds with mixed knowledge states. | World generator with fog |
| P-10 | Applying `diffProjection(p_n, p_{n+1})` to `p_n` yields `p_{n+1}` exactly. | Projections from random runs |
| P-11 | Content composition is associative for includes, and resolved definitions are independent of file order. | Definition sets with includes |
| P-12 | Registry handles and checksum are independent of package file order. | Shuffled file lists |
| P-13 | The interpreted and the optional closure-compiled condition evaluation agree. | Expression generator |

### 7.2 Generators

`@aesfw/testkit/arbitraries` provides:

- `arbMinimalContent`: valid content in the shape of 01 §23.1 (one or more resources, recipes, tiers, needs), optionally with additional locations and connections (01 §23.2)
- `arbCommandStream(world)`: commands drawn from the 05 §16.2 catalogue, with entity references biased toward existing entities and a configurable share of invalid commands
- `arbWorld(content)`: a world advanced by a random number of ticks with a random command stream

### 7.3 Run budgets

- PR runs: `numRuns: 100` per property and at most 200 ticks per run.
- Nightly runs: `numRuns: 2000` and up to 5,000 ticks.
- A failure prints the seed and the shrunk counterexample. Fixed counterexamples are added as regression unit tests.

---

## 8. Determinism, Replay, and Persistence (L5–L7)

### 8.1 Harnesses

| Harness | Check |
| --- | --- |
| Double-run | Run the same scenario twice in fresh processes or contexts, then compare every hash checkpoint. |
| Clone-run | INV-17 at every tick of a scenario. |
| Save-continue | Save at tick T, load, run to tick T + N, and compare with the uninterrupted run. Required for N ≥ 10,000 in SCN-13 (ARCH-21). |
| Replay | Record the command log, replay it from the starting snapshot, and compare checkpoints. |
| Journal toggle | Run with and without journal and hashing, and compare final hashes. |
| Ambient trap | Pure-package tests run with `Math.random`, `Date.now`, `performance.now`, and `crypto.getRandomValues` replaced by throwing functions (TDS-5.5). |

### 8.2 Cross-environment matrix

The replay corpus (SCN-01 to SCN-14 plus nightly random replays) runs in:

- Node LTS on Linux and Windows
- Vitest browser mode or Playwright in Chromium, Firefox, and WebKit

All environments MUST produce identical hash checkpoints.

### 8.3 Migration tests

For every save format or content major version that ships with a migration (03 §13), a fixture save of the old version is loaded, migrated, validated, and continued. The test asserts the migrated state's documented differences and the absence of silently discarded state (03 §13.3).

---

## 9. Scenario (Golden) Tests (L6)

### 9.1 Scenario file

```yaml
scenario:
  id: test.scenario.basic_loop
  requirements: [GDD-23.1, CONT-14, SCN-01]
  content:
    packages: [fixtures/content/demo-basic-loop]
  setup:
    seed: [1, 2]
    tick_duration_ms: 1000
    world: null
  commands:
    - { tick: 50, actor: owner.default, type: SetEntityEnabled, payload: { entity: "@demo.entity.producer#1", enabled: false } }
    - { tick: 80, actor: owner.default, type: SetEntityEnabled, payload: { entity: "@demo.entity.producer#1", enabled: true } }
  run:
    ticks: 600
    hash_interval: 1
    invariants: all
  expect:
    - at: 49
      metric: { population: { tier: demo.population.tier_1 } }
      greater_equal: 2
    - at: 79
      event_count: { type: ProductionBlocked, reason: entity_disabled }
      greater: 0
    - at: 600
      metric: { satisfaction: { entity: "@demo.entity.residence#1" } }
      greater_equal: 800
  golden:
    hashes: fixtures/scenarios/basic_loop.hashes.json
```

- Entity references use `@<definition>#<n>`, meaning the n-th entity of that definition in ID order.
- Expectations target metrics and events, not internal stores, so scenarios survive refactoring.
- Golden hash files store `{ tick: hash }` checkpoints together with the algorithm versions they depend on.

### 9.2 Runner

The scenario runner (`@aesfw/testkit/scenario`) is pure: it takes the parsed scenario and compiled content and returns a report. The CLI (`aesfw run`) and Vitest (`fixtures/scenarios/*.test.ts`) both use it.

### 9.3 Required scenarios

| ID | Scenario | Demonstrates | Milestone (08) |
| --- | --- | --- | --- |
| SCN-01 | Basic economic loop (03 §14) | GDD-23.1, closed loop, growth | M1 |
| SCN-02 | Logistics loop: a resource available at only one of two locations | GDD-23.2, GDD-4.5 | M6 |
| SCN-03 | Progression loop: two tiers with an advancement transition | GDD-23.3, GDD-13.1 | M7 |
| SCN-04 | Deficit loss spiral and recovery | GDD-3.7, GDD-20.3 | M4 |
| SCN-05 | Exploration and establishment through transported cargo | GDD-16 | M8 |
| SCN-06 | Exchange trade and elasticity; repeated sales lower the price, which then recovers | GDD-17 | M9 |
| SCN-07 | Pyramid trade-off: advancing all residences starves primary production | GDD-3.4, GDD-4.7 | M7 |
| SCN-08 | Breadth versus depth: equal category fulfillment from two different member sets | GDD-3.5, GDD-12.3 | M7 |
| SCN-09 | Coverage-based need satisfied by geometry | GDD-3.6, GDD-12.2 | M7 |
| SCN-10 | Throughput throttling under over-densification | GDD-15.1 | M5 |
| SCN-11 | Asymmetric decline: no refund, population clamp | GDD-13.4 | M7 |
| SCN-12 | Purpose lock pacing advancement | GDD-8.5 | M7 |
| SCN-13 | Save and load after 10,000 ticks continues identically | ARCH-21 | M2 (basic), M12 (full content) |
| SCN-14 | Complete game: reference prototype content runs 7,200 ticks without invariant violation and reaches tier 2 with a scripted strategy | GDD-23.4, GDD-23.5 | M11 |
| SCN-15 | Two owners share an exchange's elasticity state; exclusive establishment | GDD-21 | M13 |
| SCN-16 | Seeded disruptions reproduce exactly under replay | GDD-21 | M13 |
| SCN-17 | Scenario objective emits a result and the session continues | GDD-21 | M13 |
| SCN-18 | Supported-population read model matches the hand calculation for the GDD Appendix B reference chain (200 S1 / 133 S2) | GDD-3.8, GDD-10.6, PIC-10.5 | M4 (framework fixture), M11 (reference content) |

Framework scenarios SCN-01 to SCN-13 and SCN-15 to SCN-17 use theme-free fixtures in `fixtures/`. SCN-14 and the reference half of SCN-18 live in `reference/content/test`.

### 9.4 Golden update policy

- `pnpm golden:update <scenario>` regenerates golden hashes. It is never run by CI.
- A change that updates goldens MUST state in its OpenSpec proposal or design why hashes changed (new phase behavior, algorithm version bump, content change), and the reviewer confirms that the change was intended.
- Changes to versioned algorithms (`alloc-v1`, `rng-xoshiro128ss-v1`, `fnv1a64-canonical-json-v1`, phase semantics in TDS-11.3) bump the version tag recorded in the golden files.

---

## 10. Content Validation Verification (L3)

### 10.1 Pipeline stages

Each loader stage (05 §20.2) has unit tests on in-memory `PackageSource`s, covering valid input, every diagnostic code the stage emits, and determinism of its output (P-11, P-12).

### 10.2 Diagnostic fixtures

- Every diagnostic code has exactly one minimal **invalid** fixture: `fixtures/content/invalid/<code>/`, with an `expect.yaml` that lists the expected diagnostics (code, severity, definition, path).
- The diagnostic catalogue (`packages/content/src/diagnostics/catalogue.ts`) and the fixture directory are cross-checked by a test: every code has a fixture, and every fixture has a code.
- Design-intent diagnostics (03 §11.7) additionally have **valid** fixtures that activate the idea, to prove the absence of false positives.

### 10.3 Reference content gate

`@aesfw-ref/content` packages are validated in CI with `--strict`, with design-intent diagnostics promoted to errors from milestone M11 (GDD-3.2: all seven scarcities active).

---

## 11. Application and Projection Contract Tests (L4)

| Area | Tests |
| --- | --- |
| Gateway | Schema rejection, unknown actor, unknown entity or definition, revision rules (TDS-18.3), scheduling to `max(requested, tick + 1)`, submission sequence order, phase-01 re-validation and `CommandRejected` events |
| Error codes | Every code in the registry is produced by at least one test, and its arguments match the declared schema |
| Projections | Full snapshot shape matches the protocol types; field names are `snake_case`; quantities are base units |
| Fog | INV-19 unit tests per read model and event type, plus P-09 |
| Deltas | P-10; delta rejected on base-revision mismatch; resync path (PIC-18) |
| Read models | Each 04 §10 read model has unit tests against hand-built worlds; planning metrics match hand calculations (SCN-18) |
| Presentation independence | Loading a presentation package or changing mappings and localization leaves the configuration checksum and state hashes unchanged (PIC-20) |
| Persistence codecs | Header fields complete (ARCH-15.1); package or checksum mismatch produces `content_mismatch`; canonical output byte-stable |

---

## 12. Host and Protocol Tests (L8)

- **Protocol codecs:** round-trip and rejection tests for every DTO and worker message, and a `protocol_version` mismatch test.
- **Worker host:** runs against an in-process fake `MessagePort` and a fake clock injected through the host's composition root. Tests cover init → ready → subscribe → snapshot, command → result, control (pause, speed, step), coalescing (several ticks yield one delta with all events), save and load through a fake storage adapter, and the error path after an `InvariantViolation`.
- **CLI:** `validate`, `run`, `replay`, and `bench` smoke tests on fixtures, with exit codes and JSON output checked.

The shell's only untested surface is real browser APIs (Worker construction, IndexedDB, timers). L10 covers these through Playwright.

---

## 13. Client Verification (L9–L10)

### 13.1 View-model selectors (L9)

The client separates **selectors** (pure functions `projection × viewState → viewModel`) from **DOM components** (07 §14). Selectors are unit tested with protocol DTO fixtures:

- Formatting of base units to display units with the resource scale
- Sorting and grouping rules
- Fog presentation (unknown locations show only an outline and the known connections)
- State encoding: which shape, fill, outline, and accent each entity state maps to (07 §10)
- Command construction: every UI action produces the correct command envelope

### 13.2 DOM and end-to-end (L10)

- A small set of DOM component tests in Vitest with happy-dom, covering keyed updates and event wiring.
- Playwright smoke flows on the reference content:
  1. Load, start, and see the tick advance
  2. Inspect an entity
  3. Place a building with preview and confirm
  4. Toggle an entity
  5. Create a route
  6. Save and reload
- axe-core accessibility checks on the main views. Keyboard-only navigation of the smoke flows (07 §16).
- Visual regression screenshots are optional and non-gating.

---

## 14. Performance Verification (L11)

- Benchmark scenarios: `bench.small`, `bench.reference`, and `bench.large` (TDS-24), plus the reference client frame-time scenario (07 §14.6).
- `aesfw bench` reports the median and p95 tick time over a fixed number of ticks after warm-up and writes JSON results.
- Nightly CI stores the results and compares them with the rolling baseline. A regression above 20 % opens a failing check. From milestone M12 it blocks merges.

---

## 15. Coverage and Quality Gates

### 15.1 Coverage thresholds (Vitest v8 coverage)

| Package | Lines | Branches |
| --- | --- | --- |
| `@aesfw/core` | ≥ 95 % | ≥ 90 % |
| `@aesfw/content` | ≥ 90 % | ≥ 85 % |
| `@aesfw/app` | ≥ 90 % | ≥ 85 % |
| `@aesfw/protocol` | ≥ 90 % | ≥ 85 % |
| `@aesfw-ref/client-web` selectors | ≥ 85 % | ≥ 75 % |
| Shell code (hosts, DOM) | Not gated | Not gated |

Thresholds are enforced per package from the milestone in which the package first ships features (08).

### 15.2 Mutation testing

Mutation testing (Stryker) runs nightly on `fx`, `det`, `tx`, and the allocation models, with a target mutation score of at least 80 %. It is non-gating until M12.

### 15.3 CI pipeline

```text
install (frozen lockfile)
 → format check → lint (incl. purity and theme-free rules) → dependency-cruiser
 → type-check (tsc --build)
 → L0–L4, L8, L9 unit tests with coverage
 → L5 property tests (PR budget)
 → L6 scenario tests (goldens)
 → L7 Chromium determinism replay
 → content validation of reference packages (strict)
 → build client → L10 smoke
 → trace report (warning or error per Section 3.3)
nightly: extended L5, L7 all engines, L10 full, L11 bench, mutation tests
```

---

## 16. Acceptance Criteria Mapping

### 16.1 Core Game Framework GDD (01 §25)

| Criterion | Verified by |
| --- | --- |
| A configured population creates visible and traceable demand. | SCN-01; need-breakdown read-model tests (PIC-10.3); journal trace test |
| Every delivered resource has a source, path, and sink. | INV-04; journal trace test in SCN-02 |
| Higher tiers can require more complex chains without engine changes. | SCN-03 and SCN-14 use content only; theme-free lint |
| A required resource can be isolated spatially and restored through transport configuration. | SCN-02 |
| Every location and region can be made non-self-sufficient by a distribution rule. | Distribution-rule validation fixtures (CONT-11.5); self-sufficiency diagnostic fixtures |
| Lower tiers remain necessary through exact capability matching. | SCN-07; INV-05; pyramid-bypass diagnostic fixture |
| The same category fulfillment can be reached through breadth or depth. | SCN-08; weighted-score unit tests |
| At least one need can be satisfied by coverage geometry. | SCN-09 |
| Idle entities can keep paying maintenance. | Maintenance charge-policy unit tests (GDD-20.1) |
| A deficit resolves through a recoverable loss spiral, not defeat. | SCN-04; INV-21 |
| Decline can be strictly more expensive than advancement. | SCN-11 |
| Advancement can be paced by purpose locks. | SCN-12 |
| Internal logistics is limited by throughput without carrier entities. | SCN-10; INV-06 |
| Unknown locations can be explored and established using transported resources. | SCN-05 |
| Exchanges trade without opponents and cannot be exploited for unbounded income. | SCN-06; INV-12; INV-13; arbitrage diagnostic fixture |
| Supported population is derivable for every consumed resource. | SCN-18; planning read-model tests |
| All seven scarcities can be active at once and traced to configuration. | Scarcity-coverage diagnostic on reference content (strict, M11) |
| Advancement and decline use the generic transition engine. | Transition-engine unit tests parameterized for both directions; SCN-03; SCN-11 |
| All terminology can be replaced without code changes. | Theme-free lint; presentation-independence tests |
| The same configuration runs headlessly and through multiple clients. | SCN-14 headless; L10 client smoke on the same content; text-table view (07 §16) |
| A new complete gameplay definition can be created without engine changes. | Reference content contains no code; fixture packages for SCN-01 to SCN-17 |

### 16.2 Simulation Architecture (02 §21)

| Criterion | Verified by |
| --- | --- |
| A headless runner executes a full progression and logistics scenario. | `aesfw run` on SCN-03, SCN-02, SCN-14 |
| A headless runner executes exploration, establishment, trade, and a deficit loss spiral with recovery. | `aesfw run` on SCN-05, SCN-06, SCN-04 |
| Replaying the same command stream produces matching hashes. | Replay harness; L7 matrix |
| A presentation client can be removed without affecting the simulation. | Dependency rules; headless scenario suite |
| Content types can be added without new simulation code. | Fixture packages; P-06 generated content |
| All external state changes use commands. | `WorldReader` is read-only (type tests); client import ban |
| All client state reads use projections or queries. | Client import ban (TDS-4.3 rule 4) |
| Save and load reproduce uninterrupted state after at least 10,000 ticks. | SCN-13; INV-18 |
| Validation prevents unresolved references and known deadlocks. | Diagnostic fixtures (CONT-11.3, CONT-11.5) |

### 16.3 Content Configuration Specification (03 §15)

| Criterion | Verified by |
| --- | --- |
| An author can create a new game definition without source changes. | Fixture and reference packages; P-06 |
| The validator gives actionable errors and reports inactive design ideas. | Diagnostic fixture suite (Section 10.2); design-intent fixtures |

### 16.4 Presentation Integration Contract (04 §20)

| Criterion | Verified by |
| --- | --- |
| The simulation runs without a presentation package. | All framework scenarios (no presentation packages loaded) |
| Two clients display the same session concurrently. | Host test with two subscribers (graphical and text-table projections) |
| Replacing models, icons, names, and sounds leaves hashes unchanged. | Presentation-independence test |
| A missed event is corrected by the next snapshot. | Event-drop test in host and client selector tests |
| Every user mutation maps to a validated command. | Selector command-construction tests; import ban |
| Every displayed mechanic traces to snapshot or query data. | Selectors take only DTOs (type-level) |
| Supported population per chain is displayable for every consumed resource. | SCN-18; client planning-view selector tests |
| No projection exposes unknown locations. | INV-19; P-09 |
| Missing mappings use generic fallbacks. | Client selector tests with an empty presentation package |
| Presentation state can be discarded without losing simulation state. | Save tests (no presentation fields); client reload smoke test |

---

## 17. Definition of Done for an Implementation Change

A change (one OpenSpec change, 08 §7) is done when:

1. Its OpenSpec requirements and scenarios are implemented, and each scenario has a test tagged with the requirement IDs.
2. New or changed systems have L1 unit tests covering Section 5.3.
3. Affected invariants are added to or updated in the checker, and L2 tests run them.
4. Relevant scenarios exist or are extended, and goldens are updated only under Section 9.4.
5. Lint, purity, theme-free, and dependency rules pass, and coverage thresholds hold.
6. Determinism harnesses (double-run, clone-run, save-continue) pass for the affected scenarios.
7. Documentation is updated: amendments to 01–05 or 07 where behavior was clarified, and new diagnostic or error codes in their catalogues.
8. `pnpm trace` reports no new untraced IDs in the sections the change claims.

---

## 18. Acceptance Criteria

- Every test level of Section 4 exists in CI with its gate.
- Every invariant of Section 6 is implemented in `checkInvariants` and runs after every tick in L2, L5, and L6.
- Every scenario of Section 9.3 exists by the milestone listed and passes with stable goldens.
- Every diagnostic code has an invalid fixture, and every error code is produced by a test.
- The cross-environment matrix reproduces identical hashes.
- Every acceptance criterion of 01–04 maps to at least one passing test (Section 16).
- The traceability report has no untraced normative requirement for implemented features.
