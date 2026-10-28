# Abstract Economic Simulation Framework
## Technical Design Specification

**Version:** 1.0  
**Status:** Implementation baseline (draft)  
**Companions:** Core Game Framework GDD (01), Simulation Architecture (02), Content Configuration Specification (03), Presentation Integration Contract (04), Verification Specification (06), Reference Implementation and Client Design (07), Implementation Roadmap (08)

---

## 1. Purpose and Scope

Documents 01–04 define *what* the framework does and its abstract architecture. This document binds them to a concrete technology and code structure. It defines:

- The technology baseline
- The repository, package, and dependency structure
- The purity model of the simulation and how it is enforced
- The numeric, identity, randomness, ordering, and hashing rules that make determinism achievable in TypeScript
- The concrete runtime data model, kernel API, and tick pipeline
- The application layer, persistence, content pipeline, hosts, and wire protocol
- Error handling, performance approach, and coding conventions
- Deliberate deviations from 02–04 (Section 26) and the decision log (Section 27)

Normative keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are used as in RFC 2119. Requirement IDs for this document use the prefix `TDS-` followed by the section number (see 06, Section 3).

Precedence: 01 defines behavior, 02–04 define architecture and contracts, this document defines implementation. When this document conflicts with 01–04, the conflict is a defect: it is either listed as an amendment in Section 26 or must be resolved before implementation proceeds.

---

## 2. Technology Baseline

| Concern | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript 5.x, `strict` | One language for framework, hosts, and client |
| Target | ES2022 modules | No down-levelling of `BigInt`, classes, or private fields required |
| Runtime (headless) | Node.js LTS (≥ 22) | CLI, CI, benchmarks |
| Runtime (browser) | Evergreen Chromium, Firefox, WebKit | Simulation runs in a dedicated Web Worker |
| Package manager | pnpm workspaces (via `corepack enable`) | Strict dependency isolation prevents accidental imports |
| Build | `tsc --build` (project references) for libraries; Vite for the client | Libraries ship ESM + `.d.ts` |
| Unit and integration tests | Vitest | Same runner for Node and browser mode |
| Property-based tests | fast-check | Seeds recorded on failure |
| End-to-end tests | Playwright | Smoke tests and cross-engine determinism |
| Lint and format | ESLint (typescript-eslint, flat config), Prettier | Purity rules in Section 5.5 |
| Architecture rules | dependency-cruiser | Package boundary enforcement |
| Content parsing | `yaml` (pure JS) | Content package only |
| Content schemas | TypeBox | Single source for static types, runtime checks, and published JSON Schema |

Adding a runtime dependency to a pure package (Section 4.2) requires a decision-log entry (Section 27). `@aesfw/core` has **zero** runtime dependencies.

---

## 3. Architectural Principles

### 3.1 Functional core, imperative shell

The system is split into a **pure core** that computes and an **imperative shell** that performs effects.

```text
            ┌───────────────────────── imperative shell ─────────────────────────┐
            │  host-web (Worker, timers, IndexedDB)   host-node (fs, CLI, stdout)│
            │  reference client (DOM, input, localStorage)                       │
            └───────────────┬───────────────────────────────▲────────────────────┘
                 strings,   │ commands, ticks               │ DTOs, events, hashes
                 envelopes  ▼                               │
            ┌──────────────────────────── pure core ─────────────────────────────┐
            │  app (session, gateway, projections, persistence codecs)           │
            │  content (parse, compose, validate, compile)                       │
            │  core (world state, systems, tick pipeline)                        │
            │  protocol (DTO types, codecs)                                      │
            └────────────────────────────────────────────────────────────────────┘
```

All behavior that can be tested without a clock, file system, network, or DOM lives in the pure core. The shell is kept thin enough that it needs only smoke tests.

### 3.2 Framework and reference implementation are separate products

The **framework** (`packages/*`) is theme-free and game-agnostic. The **reference implementation** (`reference/*`) is one concrete, equally abstract game (content packages) plus one browser client. The reference implementation consumes the framework only through public package entry points. The framework never imports, names, or special-cases anything from the reference implementation (Section 4.3).

### 3.3 Data at the boundaries

Every boundary carries plain, serializable data: content files in, commands in, DTOs/events/hashes out, saves in and out. No boundary passes functions, class instances, or mutable references to internal state.

### 3.4 Determinism is a design property, not a test result

Determinism follows from construction rules (integer arithmetic, explicit ordering, seeded streams, no ambient inputs). Tests (06) confirm the rules hold; they do not replace them.

---

## 4. Repository and Package Structure

### 4.1 Layout

```text
/
├── AGENTS.md
├── README.md
├── 01_…08_*.md                     specification set
├── openspec/                       OpenSpec specs and changes
├── package.json                    workspace root (scripts only)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── .dependency-cruiser.cjs
├── packages/                       FRAMEWORK (theme-free)
│   ├── core/          @aesfw/core        simulation kernel
│   ├── content/       @aesfw/content     package loading, schemas, validation, compilation
│   ├── app/           @aesfw/app         sessions, commands, projections, persistence codecs
│   ├── protocol/      @aesfw/protocol    client-facing DTO types and codecs (doc 04 in TypeScript)
│   ├── testkit/       @aesfw/testkit     builders, invariant checker, harnesses, generators
│   ├── host-web/      @aesfw/host-web    Web Worker host and main-thread session client
│   └── host-node/     @aesfw/host-node   CLI: validate, run, replay, bench
├── reference/                      REFERENCE IMPLEMENTATION
│   ├── content/       @aesfw-ref/content     data-only packages (ref.tier, ref.tier.presentation)
│   └── client-web/    @aesfw-ref/client-web  minimalist browser client
├── fixtures/                       framework test fixtures (theme-free)
│   ├── content/                    valid and invalid content packages
│   └── scenarios/                  golden scenario files
└── tools/                          repository tooling (trace, golden update)
```

### 4.2 Packages

| Package | 02 layer | Purity | Environment | May depend on |
| --- | --- | --- | --- | --- |
| `@aesfw/core` | Simulation Domain, Content Runtime (registry types, compiled conditions, curves) | Pure | Any ES2022 | — |
| `@aesfw/content` | Configuration & Validation | Pure | Any ES2022 | core, `yaml`, TypeBox |
| `@aesfw/protocol` | Presentation contract types | Pure | Any ES2022 | — |
| `@aesfw/app` | Application Layer, Presentation Adapter | Pure | Any ES2022 | core, content, protocol |
| `@aesfw/testkit` | Test infrastructure | Pure | Node, browser test mode | core, content, app, protocol, fast-check |
| `@aesfw/host-web` | Infrastructure (browser) | Shell | Browser | app, content, protocol (worker side); protocol only (client side) |
| `@aesfw/host-node` | Infrastructure (Node) | Shell | Node | app, content, protocol, testkit |
| `@aesfw-ref/content` | Content | Data only | — | none (YAML files + manifest) |
| `@aesfw-ref/client-web` | Presentation Client | Shell | Browser | protocol, `@aesfw/host-web/client` |

`@aesfw/host-web` exposes two entry points:

- `@aesfw/host-web/worker`: the worker script that runs a session.
- `@aesfw/host-web/client`: the main-thread `SessionClient` proxy, which depends only on `@aesfw/protocol`.

### 4.3 Dependency rules

```text
reference/client-web ──▶ host-web/client ──▶ protocol
                     └──────────────────────▶ protocol
host-web/worker ──▶ app ──▶ content ──▶ core
host-node ───────▶ app       └────────▶ protocol
testkit ─────────▶ app, content, core, protocol
```

Rules (all enforced by dependency-cruiser in CI):

1. `packages/**` MUST NOT import from `reference/**` or `fixtures/**` (tests may read `fixtures/**` as data).
2. `@aesfw/core` MUST NOT import any other package.
3. `@aesfw/protocol` MUST NOT import any other package. It is the only framework package the client needs for types.
4. `reference/client-web` MUST NOT import `@aesfw/core`, `@aesfw/content`, or `@aesfw/app`. It sees the simulation only through protocol DTOs.
5. Pure packages MUST NOT import shell packages.
6. Cross-package imports use package entry points only (no deep imports into `src/`), except `@aesfw/core/testing` (Section 10.3), which only `@aesfw/testkit` and tests may import.
7. Framework source and framework fixtures MUST be theme-free. They MUST NOT contain reference IDs (`ref.`), reference codes (P1, AK1, S1, …), or setting terminology. Fixtures use the `test.` or `demo.` namespace.

### 4.4 Package internal layout (core)

```text
packages/core/src/
  index.ts                 public API (Section 10)
  testing.ts               test-only API (runPhases, store access)
  fx/                      fixed-point arithmetic, allocation, accumulators
  det/                     canonical encoding, hash, rng, stable sort
  ids/                     branded identifiers, allocators
  registry/                compiled definition types (produced by @aesfw/content)
  world/                   World record, component stores, tables, encode/decode
  expr/                    compiled condition AST evaluation, curves
  policies/                spatial, inventory access, capability allocation, route planning
  tx/                      transactions, reservation ledger, journal
  systems/                 one module per phase: phase-01-apply-commands.ts … phase-31-metrics-hash.ts
  pipeline/                phase table, TickContext, step()
  events/                  domain event union and writer
  errors/                  invariant violations, error codes
```

---

## 5. Purity Model

### 5.1 Definition

A function is **pure** in this framework when:

1. Its result is fully determined by its explicit arguments.
2. It performs no I/O and reads no ambient state (clock, randomness, environment, globals, locale).
3. It leaves no observable state behind other than its result and the arguments it is explicitly permitted to mutate (Section 5.2).
4. Its result does not depend on object identity, property enumeration of objects used as maps, engine-specific behavior, or floating-point rounding.

### 5.2 Owned mutation

Copying the whole world every tick is not affordable, so the kernel uses **owned mutation**:

- `step(world, registry, input)` takes ownership of `world`. It MAY mutate it in place and return the same reference as `output.world`.
- After calling `step`, the caller MUST NOT use the input reference except through `output.world`.
- Code that needs the previous state (tests, branch-and-compare, the replay verifier) calls `cloneWorld` first.
- The `registry` is deeply frozen and MUST NOT be mutated.
- Inside a tick, a system mutates only the stores it declares in `writes` (Section 11.2).

Observable behavior is the same as a pure function `World × Registry × TickInput → World × TickOutput`. The purity tests in 06 verify this through the clone-and-compare property.

### 5.3 Forbidden in pure packages

Pure packages MUST NOT use:

- `Math.random`, `crypto.*`, `Date`, `performance`, `setTimeout`, `setInterval`, `queueMicrotask`, `requestAnimationFrame`
- `console` (diagnostics are returned as data)
- `Intl`, `toLocaleString`, `localeCompare` (string comparison uses code-unit order, Section 9.4)
- `globalThis`, `window`, `self`, `process`, `fetch`, `import()` with computed specifiers
- `async`/`await` and Promises in `@aesfw/core` (the kernel is synchronous; `@aesfw/content` and `@aesfw/app` are also synchronous)
- Floating-point arithmetic on authoritative values (Section 6)
- `for…in`, `Object.keys/values/entries` over objects used as maps in authoritative paths (use arrays or `Map`s with defined insertion order, Section 9.4)
- `WeakMap`/`WeakRef`/`FinalizationRegistry` for authoritative state
- Module-level mutable state (`let` at module scope, mutable singletons, caches outside `World` or `Registry`)
- `Array.prototype.sort` without an explicit total-order comparator

### 5.4 Effects as data

Everything the shell may act on is returned as data:

| Effect | Returned as |
| --- | --- |
| Something happened | `DomainEvent[]` (02 §9, 04 §11) |
| Command outcome | `CommandOutcome[]` |
| Quantity mutation trace | `Transaction[]` journal (optional, Section 12.4) |
| Desync detection | `StateHash` at configured intervals |
| Diagnostics | `Diagnostic[]` |
| Metrics | `TickMetrics` |

### 5.5 Enforcement

| Mechanism | What it enforces |
| --- | --- |
| `tsconfig` for pure packages: `"lib": ["ES2022"]`, `"types": []` | No DOM or Node globals type-check |
| ESLint `no-restricted-globals`, `no-restricted-properties`, `no-restricted-syntax` | Section 5.3 list, `for…in`, comparator-less `sort` |
| ESLint `no-restricted-imports` + dependency-cruiser | Section 4.3 |
| Theme-free lint rule (literal pattern check) | Section 4.3 rule 7 |
| Vitest setup file for pure packages | Replaces `Math.random`, `Date.now`, `performance.now`, `crypto.getRandomValues` with functions that throw |
| Deep freeze of `Registry` in test builds | No definition mutation |
| Clone-and-compare and double-run harnesses (06) | Hidden state, identity dependence |

---

## 6. Numeric Model

### 6.1 Quantity representation

All authoritative numbers are **integers** stored in JavaScript `number`s and restricted to the safe-integer range `[-(2^53 − 1), 2^53 − 1]`.

- Resource quantities are fixed-point base units (03 §6.1 `quantity.scale`). With the common scale 1000 the range is about ±9 × 10^12 display units, far above any configured economy.
- Ratios use **permille** (1000 = 1.0): fulfillment, satisfaction, multipliers, throttle factors, elasticity steps.
- Ticks, durations, counts, and IDs are non-negative safe integers.

This is a deliberate narrowing of the signed 64-bit quantities in 02 §6.3 (amendment A1, Section 26). `BigInt` is used only internally for intermediate products that may exceed the safe range (Section 6.2); it never appears in state.

### 6.2 Checked arithmetic

All authoritative arithmetic goes through the `fx` module:

```ts
type Int = number; // safe integer by contract

fx.add(a: Int, b: Int): Int            // throws ArithmeticOverflow if the result is not safe
fx.sub(a: Int, b: Int): Int
fx.mul(a: Int, b: Int): Int
fx.mulDiv(a: Int, b: Int, c: Int, mode: Rounding): Int   // a*b/c with exact intermediate (BigInt fallback)
fx.div(a: Int, b: Int, mode: Rounding): Int
fx.permille(value: Int, permille: Int, mode: Rounding): Int   // mulDiv(value, permille, 1000)
fx.clamp(v: Int, lo: Int, hi: Int): Int
fx.min / fx.max / fx.sum(values: readonly Int[]): Int

type Rounding = 'floor' | 'ceil' | 'trunc' | 'half_up';
```

Rules:

- `Math.floor(a / b)` is exact for safe integers and MAY be used inside `fx`. Outside `fx`, raw `/` on authoritative values is a lint error.
- An overflow is a framework or content defect, not a game state. It throws `ArithmeticOverflow` (an `InvariantViolation`, Section 23). Content validation (03 §11.6) SHOULD reject configurations whose bounded maxima can overflow.
- Rounding defaults to `floor` for amounts taken from a pool or produced, and `ceil` for durations (02 §14.1 traversal time). Every other rounding choice is named at the call site.
- `half_up` rounds to the nearest integer and rounds a tie away from zero (Java `RoundingMode.HALF_UP`).
- `fx.div` and `fx.mulDiv` throw `InvariantViolation` code `division_by_zero` on a zero divisor; the condition evaluator of Section 14.1 guards this case and yields 0 plus a diagnostic counter instead.

(Amendments: the last two bullets are A-02, added by roadmap row 0.3; the condition-evaluator clause is a clarification, not a conflict.)

### 6.3 Proportional allocation (algorithm `alloc-v1`)

Proportional allocation is used for internal-logistics throughput (02 §5.2 phase 10) and proportional capability models (01 §14.2):

```text
input:  capacity C ≥ 0, requests r_i ≥ 0 for requesters i (sorted by entity ID ascending)
R = Σ r_i
if R ≤ C: grant g_i = r_i
else:
  g_i   = floor(C × r_i / R)
  rem_i = (C × r_i) mod R
  L     = C − Σ g_i
  give +1 to the L requesters with the largest rem_i, ties broken by ascending entity ID,
  never exceeding r_i
throttle_permille_i = (r_i = 0) ? 1000 : floor(1000 × g_i / r_i)
```

Weighted proportional allocation uses `r_i × w_i` as the key, with the same remainder rule. Algorithms are versioned; changing one changes state hashes and requires a version bump (Section 19.4).

### 6.4 Rate accumulators

Many configured rates are not whole numbers per tick, for example demand `population × per_capita × consumption_factor / 1000`. To keep long-run totals exact (01 §3.10, legible ratios), every recurring fractional product uses a **remainder accumulator** stored in the world:

```text
numerator   = base_rate × multiplier_permille + carry
amount      = floor(numerator / 1000)
carry'      = numerator mod 1000
```

Accumulators are authoritative state (saved and hashed), keyed by `(subject entity, purpose, resource)`. Over N ticks the delivered total differs from the exact rational total by less than one base unit.

### 6.5 Floating point

Floating point MAY be used only in shells and presentation: interpolation, layout, display formatting. A value computed in floating point MUST NOT flow back into a command payload except as a value that the command validation re-quantizes (for example a grid cell index).

---

## 7. Identity and Handles

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type EntityId         = Brand<number, 'EntityId'>;          // safe integer ≥ 1, never reused (02 §3.1)
type DefinitionHandle = Brand<number, 'DefinitionHandle'>;  // dense index per definition type (02 §3.2)
type OwnerHandle      = Brand<number, 'OwnerHandle'>;
type ReservationId    = Brand<number, 'ReservationId'>;
type Tick             = Brand<number, 'Tick'>;
type StringId         = Brand<string, 'StringId'>;          // namespace.category.name (03 §4)
```

- `EntityId`s come from a monotonic allocator stored in the world (`nextEntityId`). Locations, entities, inventories, and transport orders all share this ID space. This is an amendment to 02 §3.1 (A1).
- Definition handles are assigned during compilation in **ascending code-unit order of the string ID within each definition type**. Handles therefore do not depend on file or package load order.
- String IDs exist in the registry for serialization and diagnostics. Hot loops use handles only.
- Saves store string IDs for definitions (not handles), so handles may change between content versions without breaking saves (Section 19).

---

## 8. World State Model

### 8.1 World record

```ts
interface World {
  readonly formatVersion: 1;
  tick: Tick;
  nextEntityId: EntityId;
  nextReservationId: ReservationId;
  rng: RngStreams;                       // Section 15
  owners: OwnerTable;                    // accounts, knowledge, purpose locks, unlock state, deficit state
  stores: ComponentStores;               // Section 8.2, keyed by component kind
  ledger: ReservationLedger;             // Section 12
  accumulators: AccumulatorTable;        // Section 6.4
  timers: SustainedTimerTable;           // Section 14.3
  exchanges: ExchangePriceTable;         // 02 §14.5
  commandQueue: ScheduledCommand[];      // accepted future commands, ordered (Section 16.3)
  modules: ModuleState;                  // optional modules (02 §15.2)
  metrics: MetricWindows;                // need windows and other metrics needed by rules
  caches: DerivedCaches;                 // NOT saved, NOT hashed (Section 8.4)
}
```

Everything except `caches` is **authoritative** and is saved and hashed. The session revision is application state (Section 18.3), not world state.

### 8.2 Component stores

```ts
interface ComponentStore<T> {
  readonly kind: ComponentKind;
  has(e: EntityId): boolean;
  get(e: EntityId): T | undefined;
  getOrThrow(e: EntityId): T;
  set(e: EntityId, value: T): void;           // insert or replace
  markRemoved(e: EntityId): void;             // effective at phase 30
  ids(): readonly EntityId[];                 // ascending, excluding removed
  size(): number;
}
```

Rules:

- **Iteration is always in ascending `EntityId` order.** Because IDs are monotonic, inserts append and the dense array stays sorted. Removal marks a tombstone and compaction happens in phase 30. Iteration order is therefore identical before and after save/load.
- Component values are plain objects or tuples of integers, strings, booleans, and arrays of these. No class instances, functions, `undefined` fields, `Date`s, or `Map`s inside components.
- v1 stores values as dense arrays of records (array-of-structures). Hot stores MAY move to structure-of-arrays typed arrays behind the same interface (02 §18) without changing encode order or hashes.

### 8.3 Component catalogue mapping

The representative components of 02 §3.4 map to stores as follows. Each store has one owning module; other systems access it read-only unless declared in `writes`.

| 02 component group | Store kinds (v1) | Primary writers (phase) |
| --- | --- | --- |
| Identity and lifecycle | `definition`, `owner`, `location`, `lifecycle`, `enabled`, `revision` | 01, 03, 27, 30 |
| Spatial | `transform`, `footprint`, `workingArea`, `connectivityNode`, `regionMembership`, `locationProperties` | 01, 03, 04 |
| Location and knowledge | `establishment`, `locationHub`, `throughputPool`; owner×location knowledge in `owners` | 10, 18 |
| Inventory | `inventory` (header, entries, capacity, acceptance); reservations in `ledger`; purpose locks in `owners` | 11–20 via transactions |
| Production | `resourceSource`, `sourceSlotBinding`, `producer` (recipe set, active recipe, slots, progress, status), `throughputAllocation`, `modifierSet` | 07, 10–13 |
| Population | `residence`, `populationGroup`, `needStates`, `satisfaction`, `bandState`, `growth`, `transition` | 08, 20–24 |
| Capability | `capabilityProvider`, `capabilityConsumer`, `capabilityAllocation` | 05, 06 |
| Economy | `maintenance`, `deficitPause`; owner accounts in `owners` | 26, 27 |
| Exchange | `exchangeRef`; price state in `exchanges` | 17, 28 |
| Transport | `cargo`, `transportAssignment`, `transportOrder`, `route`, `stationCursor`, `movement`, `handling` | 01, 14–19 |
| Construction | `constructionPlan`, `constructionProgress`, `placement` | 01, 03 |

### 8.4 Derived caches

Spatial indexes, connectivity groups, tag lookups over entities, and route tables are **derived caches**:

- They are stored in `world.caches`, excluded from saves and hashes, and rebuilt from authoritative state.
- Each cache has a `dirty` flag set by the systems that change its inputs. It is rebuilt in phase 04 (or lazily before first use within a tick, using the same deterministic algorithm).
- `decodeWorld` and `cloneWorld` leave caches dirty.
- A testkit property (06, INV-20) verifies that a fully rebuilt cache equals the incrementally maintained one.

### 8.5 Encode, decode, clone

```ts
encodeWorld(world: World, registry: Registry): CanonicalState;   // JSON-safe, canonical ordering
decodeWorld(registry: Registry, state: CanonicalState): Result<World, Diagnostic[]>;
cloneWorld(world: World): World;                                 // deep copy, caches dirty
```

`CanonicalState` uses string definition IDs, ascending entity order, and sorted keys. It is the input to both persistence (Section 19) and hashing (Section 19.4).

---

## 9. Ordering Rules

### 9.1 Global commit order

Whenever a system processes several subjects, it processes them in the key order of 02 §5.3:

```text
phase → location ID → entity ID → definition handle → transaction sequence
```

If a system iterates directly over a component store, ascending entity ID order is sufficient, because location IDs are entities too and sorting by location first is only needed where results interact across locations. Systems that group by location MUST iterate locations in ascending location ID.

### 9.2 Owners, exchanges, and trades

Owners iterate by ascending `OwnerHandle` (assigned in world-definition order, which is canonical content order). Trades are ordered by `(tick, exchange entity ID, owner handle, transport unit entity ID)` (01 §17.4).

### 9.3 Commands

Commands for one tick apply in phase 01 ordered by `(scheduled tick, actor handle, submission sequence)`. The submission sequence is assigned by the application layer when it accepts a command (Section 18.2) and is recorded in the command log and replays.

### 9.4 Collections and strings

- Authoritative collections are arrays with a documented order, or `Map`s whose insertion order is itself deterministic and documented. Plain objects are not used as maps.
- String comparison uses code-unit order (`a < b ? -1 : a > b ? 1 : 0`) through `det.compareStrings`. Locale-aware comparison is forbidden.
- `det.stableSort(array, comparator)` MUST receive a comparator that defines a total order (no ties without a tie-breaker).

---

## 10. Kernel API (`@aesfw/core`)

### 10.1 Public API

```ts
// world lifecycle
createWorld(registry: Registry, setup: WorldSetup): Result<World, Diagnostic[]>;
step(world: World, registry: Registry, input: TickInput): TickOutput;

// state utilities
cloneWorld(world: World): World;
encodeWorld(world: World, registry: Registry): CanonicalState;
decodeWorld(registry: Registry, state: CanonicalState): Result<World, Diagnostic[]>;
hashWorld(world: World, registry: Registry): StateHash;

// read access for the application layer (no mutation)
readWorld(world: World, registry: Registry): WorldReader;
evaluatePlacement(world: World, registry: Registry, q: PlacementQuery): PlacementResult;

interface WorldSetup {
  seed: Seed;                          // two uint32 words
  tickDurationMs: number;              // immutable for the session (02 §5.1)
  world: StringId | null;              // world definition (03 §6.6) or default instantiation
  enabledModules: readonly StringId[];
}

interface TickInput {
  commands: readonly ScheduledCommand[];   // scheduled for exactly world.tick + 1
  options: { journal: boolean; hash: boolean };
}

interface TickOutput {
  world: World;                            // same reference as input (Section 5.2)
  tick: Tick;
  events: readonly DomainEvent[];
  outcomes: readonly CommandOutcome[];     // applied or rejected in phase 01
  journal: readonly Transaction[] | null;
  hash: StateHash | null;
  metrics: TickMetrics;
}
```

Turning journaling or hashing on or off MUST NOT change authoritative state.

### 10.2 WorldReader

`WorldReader` is a read-only facade the application layer uses to build projections and read models. It exposes typed accessors (`entity(id)`, `inventory(id)`, `location(id)`, `owner(handle)`, `knowledge(owner, location)`, …) and never returns mutable references; returned objects are frozen copies or readonly views.

### 10.3 Test API (`@aesfw/core/testing`)

```ts
runPhases(world: World, registry: Registry, phases: readonly PhaseId[], input: TickInput): TickOutput;
stores(world: World): ComponentStores;        // direct store access for test setup
phaseTable: readonly PhaseDescriptor[];       // for introspection and documentation tests
runSystem(descriptor: SystemDescriptor, world: World, registry: Registry, input: TickInput): TickOutput;  // one descriptor with write-set checks (A-05)
deepFreeze<T>(value: T): T;                   // deep-freeze definition data for test builds
```

`runPhases` runs only the listed phases, in canonical order, inside one tick. It makes every system testable on its own (06, Section 5). `runSystem` runs a single registered or test descriptor with the write-set checks of Section 11.2 (A-05, roadmap 0.6); `@aesfw/testkit` uses it from 0.7. `deepFreeze` is exported from `@aesfw/core/testing` from roadmap row 0.2 onward; the registry deep freeze of Sections 5.2 and 5.5 uses it.

---

## 11. Tick Pipeline

### 11.1 Phase table

Every phase of 02 §5.2 maps to exactly one system module. A phase that is not yet implemented is a registered no-op, so the pipeline structure exists from the first milestone (08, M0).

| Phase | System module | Notes |
| --- | --- | --- |
| 01 | `applyCommands` | State validation and application of scheduled commands (Section 16) |
| 02 | `applyModuleEffects` | Optional modules only |
| 03 | `resolveLifecycleAndConstruction` | Construction starts, cost reservations |
| 04 | `rebuildSpatialCaches` | Dirty caches (Section 8.4) |
| 05 | `rebuildCapabilitySupply` | Recomputed pools |
| 06 | `allocateCapabilities` | Allocation models (01 §14.2) |
| 07 | `evaluatePreconditions` | Sources and producers; block reasons |
| 08 | `calculatePopulationDemand` | Uses previous-tick population |
| 09 | `collectThroughputRequests` | All throughput requests for the tick |
| 10 | `allocateThroughput` | `alloc-v1` per location |
| 11 | `reserveProductionIO` | Inputs and output capacity |
| 12 | `advanceProcesses` | Sources and producers |
| 13 | `commitProduction` | Atomic completion transactions |
| 14 | `planInternalLogistics` | Explicit internal transport only |
| 15 | `advanceInternalLogistics` | Explicit internal transport only |
| 16 | `advanceTransport` | Movement and handling |
| 17 | `executeTrades` | Exchange actions |
| 18 | `resolveArrivals` | Discovery, establishment |
| 19 | `commitTransport` | Cargo transfers |
| 20 | `allocateServicesAndConsumeNeeds` | Need delivery |
| 21 | `updateNeedsAndSatisfaction` | Windows, categories, Z |
| 22 | `updateTimersAndBands` | Sustained timers, satisfaction bands |
| 23 | `updatePopulation` | Growth and decline |
| 24 | `advanceTransitions` | Advancement and decline transitions |
| 25 | `evaluateUnlocks` | |
| 26 | `applyContinuousOutputsAndMaintenance` | Income, maintenance |
| 27 | `applyDeficitPolicy` | Pause and resume |
| 28 | `recoverExchangePrices` | |
| 29 | `evaluateModuleConditions` | Optional modules only |
| 30 | `finalizeLifecycle` | Store compaction, expired reservations, entity removal |
| 31 | `recordMetricsAndHash` | Metrics; hash if requested |
| 32 | (pipeline) | Events are already ordered by sequence; returned in `TickOutput.events` |
| 33 | (application layer) | Snapshot publication is done by `@aesfw/app` after `step` returns (amendment A2) |

System order is fixed in code and is not configurable (02 §5.2).

### 11.2 System contract

```ts
interface SystemDescriptor {
  readonly phase: PhaseId;
  readonly name: string;
  readonly reads: readonly StoreKey[];
  readonly writes: readonly StoreKey[];
  readonly run: (ctx: TickContext) => void;
}

interface TickContext {
  readonly tick: Tick;
  readonly registry: Registry;
  readonly world: World;
  readonly tx: TransactionWriter;     // the only way to mutate quantities (Section 12)
  readonly events: EventWriter;       // appends with a monotonic sequence number
  readonly scratch: TickScratch;      // per-tick buffers, reset each tick, never saved
  readonly policies: PolicySet;       // resolved policy implementations (Section 13)
}
```

- A system MUST NOT keep state between ticks outside `World`.
- Per-tick intermediate data (for example the throughput requests collected in phase 09 and allocated in phase 10) is passed through `scratch`, which is typed per phase pair.
- In test builds, `writes` is checked: stores not declared as written are wrapped read-only (06, Section 5.4).

### 11.3 Phase semantics clarifications

These rules make 02 §5.2 precise enough to implement. Changing them changes hashes.

1. Phase 08 computes demand from population counts as they were at the end of the previous tick.
2. Phase 09 requesters are processed in ascending entity ID. A requester's throughput request equals the quantity it plans to move this tick (01 §15.1).
3. Phases 11–20 execute within granted throughput. A partially granted requester moves `floor(planned × throttle_permille / 1000)` and reports `throughput_throttled` when `throttle_permille < 1000`.
4. Entities paused in phase 27 are excluded from phases 07–13 and from maintenance in the **next** tick (02 §5.2).
5. Events emitted in a phase carry the tick being computed (`world.tick + 1`), which becomes `world.tick` at the end of `step`.

---

## 12. Transactions and Ledger

### 12.1 Transaction union

```ts
type Transaction =
  | { kind: 'reserve';    seq: number; reservation: ReservationId; inventory: EntityId; resource: DefinitionHandle; quantity: Int; purpose: Purpose; holder: EntityId }
  | { kind: 'release';    seq: number; reservation: ReservationId }
  | { kind: 'commit';     seq: number; reservation: ReservationId; quantity: Int }
  | { kind: 'deposit';    seq: number; inventory: EntityId; resource: DefinitionHandle; quantity: Int; source: EntityId; reason: Reason }
  | { kind: 'withdraw';   seq: number; inventory: EntityId; resource: DefinitionHandle; quantity: Int; purpose: Purpose; sink: EntityId; reason: Reason }
  | { kind: 'transfer';   seq: number; from: EntityId; to: EntityId; resource: DefinitionHandle; quantity: Int; purpose: Purpose }
  | { kind: 'reserveCapacity'; seq: number; reservation: ReservationId; inventory: EntityId; resource: DefinitionHandle; quantity: Int; holder: EntityId }
  | { kind: 'account';    seq: number; owner: OwnerHandle; resource: DefinitionHandle; delta: Int; reason: Reason }
  | { kind: 'trade';      seq: number; exchange: EntityId; owner: OwnerHandle; unit: EntityId; resource: DefinitionHandle; quantity: Int; price: Int; direction: 'buy' | 'sell' }
  | { kind: 'establish';  seq: number; owner: OwnerHandle; location: EntityId; unit: EntityId; hub: EntityId };

type Purpose = 'production_input' | 'population_need' | 'construction' | 'population_transition'
             | 'transport_load' | 'exchange_sale' | 'maintenance' | 'establishment';
```

Recomputed capabilities are not journaled as transactions. They are reported as pool snapshots in metrics.

### 12.2 Atomic composites

```ts
tx.atomic((b: AtomicBuilder) => { b.commit(r1); b.commit(r2); b.deposit(...); }): Result<void, TxError>;
```

The builder stages operations, validates them all against current state (non-negativity, capacity, reservations, purpose locks, overflow), and applies them only if every one succeeds. Otherwise nothing is applied and a typed `TxError` is returned (02 §6.2). Production completion, trades, establishment, and transition costs are atomic composites.

### 12.3 Ledger rules

- Σ active reservations per (inventory, resource) ≤ stored quantity (01 §8.3).
- Σ capacity reservations + stored ≤ capacity.
- Purpose locks are evaluated at reservation time. A locked quantity is unavailable to the locked purpose and available to all others (01 §8.5).
- Reservations carry an expiry policy. Expired reservations are released in phase 30.

### 12.4 Journal

When `TickInput.options.journal` is true, the writer appends every applied transaction to the tick's journal. The journal is the basis for resource tracing (02 §19) and for the conservation invariant (06, INV-04). Hosts MAY turn it off in production play.

---

## 13. Policy Interfaces

Policies are framework code selected by string ID from content (for example `framework.spatial.grid`). Content cannot provide code (03 §7.4). Every policy is a pure module behind a TypeScript interface:

```ts
interface SpatialPolicy {
  readonly id: 'framework.spatial.grid' | 'framework.spatial.abstract_capacity';
  validatePlacement(r: WorldReader, def: EntityDefHandle, location: EntityId, t: LogicalTransform): PlacementResult;
  add(c: SpatialCacheWriter, e: EntityId, footprint: Footprint): void;
  remove(c: SpatialCacheWriter, e: EntityId): void;
  distance(r: WorldReader, a: EntityId, b: EntityId, metric: DistanceMetric): Int;
  covers(r: WorldReader, provider: EntityId, consumer: EntityId): boolean;
  connections(r: WorldReader, e: EntityId): readonly EntityId[];
  capacity(r: WorldReader, location: EntityId): CapacitySummary;
}

interface InventoryAccessPolicy {
  readonly id: 'framework.inventory.shared_location' | 'framework.inventory.throughput_limited'
             | 'framework.inventory.connected_graph' | 'framework.inventory.explicit_logistics';
  accessibleInventories(r: WorldReader, requester: EntityId, resource: DefinitionHandle, purpose: Purpose): readonly EntityId[];
}

interface CapabilityAllocationModel {
  readonly id: 'binary' | 'proportional' | 'priority_sequential' | 'weighted_proportional';
  allocate(supply: Int, requests: readonly CapabilityRequest[]): readonly Int[]; // same order as requests
}

interface RoutePlanner {
  readonly id: 'framework.route.shortest_stable';
  plan(r: WorldReader, unit: EntityId, from: EntityId, to: EntityId): RoutePlan | null; // ties by connection ID (02 §14.3)
}
```

Policy implementations hold no state. Any state they need (occupancy grids, connectivity groups) lives in `World` or `world.caches`.

---

## 14. Conditions, Curves, and Timers

### 14.1 Compiled expression tree

`@aesfw/content` compiles condition YAML (03 §7) into a typed tree, which `@aesfw/core` evaluates:

```ts
type Expr =
  | { t: 'int'; v: Int } | { t: 'bool'; v: boolean }
  | { t: 'all' | 'any'; args: readonly Expr[] } | { t: 'not'; arg: Expr }
  | { t: 'cmp'; op: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le'; l: Expr; r: Expr }
  | { t: 'arith'; op: 'add' | 'sub' | 'mul' | 'div' | 'min' | 'max'; args: readonly Expr[] }
  | { t: 'clamp'; v: Expr; lo: Expr; hi: Expr }
  | { t: 'agg'; op: 'sum' | 'count' | 'average' | 'minimum' | 'maximum'; sel: Selector; of: QueryRef }
  | { t: 'query'; q: QueryRef }
  | { t: 'sustained'; ticks: Int; slot: TimerSlot; inner: Expr };

interface CompiledCondition {
  readonly handle: DefinitionHandle;
  readonly id: StringId;
  readonly root: Expr;
  readonly resultType: 'bool' | 'int';
  readonly subjectKind: 'entity' | 'location' | 'owner' | 'global';
}
```

- Types are checked at compile time. `div` uses `floor`, and division by zero yields 0 plus a diagnostic counter (it is a content warning, never a crash).
- `average` uses `floor`.
- Evaluation is a pure function `evaluate(expr, ctx: EvalContext): Int | boolean`. The tree stays inspectable for the debug tools (02 §20, "Inspect compiled conditions").
- A closure-compiled fast path MAY be added later. It must produce identical results and is verified against the interpreter by property tests.

### 14.2 Domain queries

Each domain query (03 §7.2, for example `population_count` or `aggregate_need_fulfillment`) is a framework function `(reader, subject, args) → Int` registered in a query table. Adding a query is a framework change with a schema version bump (03 §7.4).

### 14.3 Sustained timers

- The compiler assigns each `sustained` node a `TimerSlot`.
- A timer instance is keyed by `(condition handle, slot, subject)` and stores `consecutiveTrueTicks`.
- Phase 22 evaluates the inner expression for every subject in the scope of the definition that references the condition (residences of the transition's source tier, owners for unlocks, …), then increments or resets the timer.
- Reading `sustained` anywhere returns `consecutiveTrueTicks ≥ ticks`. Timers are authoritative and saved (03 §7.2).
- Timer instances for removed subjects are deleted in phase 30.

### 14.4 Curves

Curves (03 §8) are compiled to sorted integer point arrays. Piecewise-linear interpolation uses `fx.mulDiv(…, 'floor')`. Extrapolation follows the configured policy: `clamp`, `linear`, or `error`. `error` is a content diagnostic at compile time when the input domain can exceed the points; at runtime it clamps and increments a diagnostic counter.

---

## 15. Randomness

- Algorithm: **xoshiro128\*\*** (32-bit operations using `Math.imul` and `>>> 0`). Version tag `rng-xoshiro128ss-v1`.
- Session seed: two `uint32` words.
- Named streams (for example `world_generation`, `disruptions`) derive their initial state from `splitmix32(seed ⊕ fnv1a32(streamName))`, iterated four times — with the two seed words folded as `seed[0] ⊕ seed[1]` and the four state words taken as four consecutive `splitmix32` outputs starting from that value (the `rng-xoshiro128ss-v1` derivation, A-03).
- Stream states live in `world.rng` and are saved and hashed (02 §15.1).
- Only optional modules and seeded world generation (03 §6.18) may draw random numbers. Core economic systems are fully deterministic without randomness (01 §1).
- `rng.nextInt(stream, boundExclusive)` uses rejection sampling to avoid modulo bias.

---

## 16. Commands

### 16.1 Command flow

```text
Shell ─CommandEnvelope(DTO)─▶ app.submitCommand
        1. decode + schema check                    (app)
        2. actor authentication/authorization       (app; single-player: actor exists)
        3. definition/entity reference check        (app, against current world)
        4. revision check                           (app, Section 18.3)
        5. schedule: tick = max(requested_tick, world.tick + 1), assign submission sequence
        ◀─ CommandResult { status: accepted, scheduled_tick } | { status: rejected, errors }
step(...) phase 01:
        6. re-validate against state at application time   (core)
        7. apply in order (Section 9.3)
        → CommandApplied / CommandRejected domain events
```

Step 6 exists because state can change between scheduling and application. A command accepted for scheduling can therefore still be rejected in phase 01. Clients learn this from the `CommandRejected` event, which uses the same error-code format (04 §13).

### 16.2 Internal command representation

```ts
type Command =
  | { type: 'PlaceEntityPlan'; definition: DefinitionHandle; location: EntityId; transform: LogicalTransform }
  | { type: 'CancelEntityPlan'; entity: EntityId }
  | { type: 'CommitConstruction'; entity: EntityId }
  | { type: 'DeconstructEntity'; entity: EntityId }
  | { type: 'SetEntityEnabled'; entity: EntityId; enabled: boolean }
  | { type: 'SelectRecipe'; entity: EntityId; recipe: DefinitionHandle | null }
  | { type: 'SetProcessPriority'; entity: EntityId; priority: Int }
  | { type: 'SetCapabilityPriority'; entity: EntityId; capability: DefinitionHandle; priority: Int }
  | { type: 'RequestPopulationTransition'; entity: EntityId; transition: DefinitionHandle }
  | { type: 'CreateTransportOrder'; order: TransportOrderSpec }
  | { type: 'ModifyTransportOrder'; order: EntityId; spec: TransportOrderSpec }
  | { type: 'DeleteTransportOrder'; order: EntityId }
  | { type: 'AssignTransport'; unit: EntityId; order: EntityId }
  | { type: 'UnassignTransport'; unit: EntityId }
  | { type: 'SetInventoryPolicy'; inventory: EntityId; resource: DefinitionHandle; policy: InventoryPolicySpec }
  | { type: 'SetResourcePurposeLock'; inventory: EntityId; resource: DefinitionHandle; purpose: Purpose; locked: boolean }
  | { type: 'ResumeDeficitPausedEntities'; entities: readonly EntityId[] | 'all' }
  | { type: 'ActivateLocation'; location: EntityId }
  | { type: 'DeactivateLocation'; location: EntityId };

interface ScheduledCommand {
  readonly commandId: string;     // client-generated (04 §12)
  readonly actor: OwnerHandle;
  readonly tick: Tick;
  readonly seq: number;           // submission sequence
  readonly command: Command;
}
```

This is the full catalogue of 02 §7.3. Content can expose or hide commands through unlocks but cannot add command types.

### 16.3 Error codes

Error codes are stable `snake_case` identifiers collected in one registry module (`errors/codes.ts`), for example `state_revision_mismatch`, `insufficient_capacity`, `unknown_entity`, `not_unlocked`, `invalid_recipe`, `not_owner`, `location_unknown`. Every code declares its argument schema. Codes are never reused for a different meaning.

---

## 17. Domain Events

```ts
interface DomainEvent {
  readonly tick: Tick;
  readonly seq: number;                         // monotonic within the tick, follows commit order
  readonly type: DomainEventType;               // 02 §9 families, PascalCase names, e.g. 'ProductionCompleted'
  readonly subjects: readonly EntityId[];
  readonly owner: OwnerHandle | null;           // for per-actor filtering
  readonly location: EntityId | null;           // for fog filtering
  readonly payload: EventPayload<DomainEventType>; // integers and handles only
}
```

Events state facts, never presentation instructions (02 §9). The application layer converts handles to string IDs and adds `session_id` when it builds the event DTO (04 §11).

---

## 18. Application Layer (`@aesfw/app`)

### 18.1 Session API

```ts
interface SessionState {
  readonly sessionId: string;
  readonly content: CompiledContent;     // registry + checksum + package versions
  world: World;
  revision: number;                      // Section 18.3
  nextSubmissionSeq: number;
  commandLog: AcceptedCommandRecord[];   // for replay (02 §16.2)
  hashLog: HashCheckpoint[];
  settings: SessionSettings;             // hash interval, journal on/off, actors
}

createSession(content: CompiledContent, options: SessionOptions): Result<SessionState, Diagnostic[]>;
submitCommand(s: SessionState, env: CommandEnvelopeDto): { session: SessionState; result: CommandResultDto };
advance(s: SessionState, ticks: number): { session: SessionState; outputs: readonly TickOutput[] };
project(s: SessionState, actor: OwnerHandle, request: ProjectionRequest): ProjectionDto;
diffProjection(prev: ProjectionDto, next: ProjectionDto): SnapshotDeltaDto;
query(s: SessionState, actor: OwnerHandle, q: QueryDto): QueryResultDto;
definitionMetadata(s: SessionState, actor: OwnerHandle): DefinitionMetadataDto;
save(s: SessionState): SaveDocument;
load(content: CompiledContent, doc: SaveDocument): Result<SessionState, Diagnostic[]>;
replay(content: CompiledContent, doc: ReplayDocument): ReplayReport;
```

All functions are pure and follow the owned-mutation rule of Section 5.2: the returned `session` replaces the argument.

### 18.2 Command gateway

The gateway runs steps 1–5 of Section 16.1. Each accepted command is appended to `commandLog` together with its scheduled tick and submission sequence. Commands scheduled for a future tick are stored in `world.commandQueue`, so saves preserve them (02 §15.2).

### 18.3 Revision semantics

- `revision` increases by one for every completed tick and for every accepted command batch that changes the projection. It identifies a published projection (04 §9).
- Every entity carries a `revision` component (02 §3.4) updated to the session revision whenever an authoritative field of that entity changes.
- If a command carries `expected_session_revision = R`, the gateway rejects it with `state_revision_mismatch` only when **an entity referenced by the command** has an entity revision greater than `R`. A command without `expected_session_revision` is not revision-checked.

This entity-scoped optimistic concurrency (amendment A5) keeps commands usable while the simulation runs at speed.

### 18.4 Projections

- A projection is built from `WorldReader` **per actor**. When fog is enabled, attributes of locations that are `unknown` to the actor are omitted (02 §8.3, 04 §9.3). Filtering happens while building the projection, never afterwards.
- `diffProjection` produces a delta between two projections of the same actor, so deltas inherit the fog filtering.
- Read models (04 §10) are pure functions over `WorldReader` and `Registry`: entity detail, location summary, need breakdown, transport detail, planning metrics, owner economy, exchange quotes.
- Derived values (rates, supported population, recovery estimates) are computed here and never written back (02 §8.2).
- The projection exposes each grid-policy location's grid geometry (`grid`: width, height, blocked cells), each placed entity's logical transform and footprint (`spatial`), and each connectivity node (`connectivity`: role, network, connected).

### 18.5 Planning metrics

Supported population (01 §3.8, §10.6) is computed in `@aesfw/app/readmodels/planning.ts`:

```text
net_rate(resource, scope)  = Σ producer output rates − Σ recipe input rates (per tick, base units, as rationals)
per_capita(resource, tier) = Σ need demand per population per tick × consumption_factor / 1000
supported(resource, tier)  = floor(net_rate / per_capita)
```

Rates are computed as exact rationals (numerator, denominator) from recipe quantities and durations, and are only floored for display. The calculation uses configured nominal rates. Utilization- and throttle-adjusted rates are reported in separate fields.

---

## 19. Persistence, Replay, and Hashing

### 19.1 Save document

```ts
interface SaveDocument {
  header: {
    format: 'aesfw-save';
    format_version: 1;
    framework_version: string;
    schema_version: number;
    packages: readonly { id: string; version: string }[];
    configuration_checksum: string;
    session_id: string;
    tick: number;
    tick_duration_ms: number;
    seed: [number, number];
    hash_algorithm: 'fnv1a64-canonical-json-v1';
    state_hash: string;
  };
  state: CanonicalState;          // world, excluding caches
  session: {
    revision: number;
    next_submission_seq: number;
    command_log_tail: unknown[];
    settings: {                   // added in M2 (2.5): lets load(content, doc) restore a session
      hash_interval: number;
      journal: boolean;
      actor: number;
      actor_id: string;
      tick_duration_ms: number;
    };
  };
}
```

`session.settings` is an additive clarification introduced by `add-save-load` (2.5) so that `load(content, doc)` needs no separate options argument; it stays within `format_version` `1`.

Saves are canonical JSON (Section 19.3). Presentation state is never part of a save (04 §16). On load, the content checksum and package versions are compared. A mismatch triggers migration (03 §13) or a `content_mismatch` diagnostic.

### 19.2 Replay document

```ts
interface ReplayDocument {
  header: SaveDocument['header'] & { format: 'aesfw-replay' };
  start: CanonicalState;                          // starting snapshot
  commands: readonly AcceptedCommandRecord[];     // with tick and submission sequence
  checkpoints: readonly { tick: number; hash: string }[];
}
```

`replay` reproduces the run and reports the first diverging checkpoint, if any (02 §16.2).

### 19.3 Canonical JSON

- Object keys are sorted in code-unit order. Arrays keep their defined order.
- Only integers (safe), strings, booleans, `null`, arrays, and objects are allowed.
- No insignificant whitespace. Strings use JSON escapes only for required characters.
- The encoder is a framework function (`det.canonicalStringify`). `JSON.stringify` MUST NOT be used for canonical output.

### 19.4 State hash

- Algorithm `fnv1a64-canonical-json-v1`: 64-bit FNV-1a over the UTF-8 bytes of `canonicalStringify(encodeWorld(world))`, implemented with 32-bit limb arithmetic and rendered as 16 lowercase hex characters.
- The hash interval is a session setting: every tick in tests, every 60 ticks by default in hosts.
- A change to the encoding, any versioned algorithm (`alloc-v1`, `rng-…-v1`), or phase semantics that changes hashes MUST bump the relevant version and regenerate the golden hashes in a reviewed change (06, Section 9.4).

A streaming hasher that hashes stores directly without building the string MAY replace the reference encoder if it produces the identical byte stream.

---

## 20. Content Pipeline (`@aesfw/content`)

### 20.1 Pure loading

The content package never touches the file system or network. The shell provides a source:

```ts
interface PackageSource {
  readonly packageRoot: string;
  list(): readonly string[];                       // relative paths
  read(path: string): string | null;               // UTF-8 text
}

loadContent(sources: readonly PackageSource[], options: LoadOptions): ContentResult;

interface ContentResult {
  readonly content: CompiledContent | null;        // null if any error-severity diagnostic
  readonly diagnostics: readonly Diagnostic[];
}

interface CompiledContent {
  readonly registry: Registry;                     // deeply frozen
  readonly checksum: string;                       // fnv1a64 of the canonical normalized representation
  readonly packages: readonly { id: string; version: string; type: PackageType }[];
  readonly presentation: PresentationRegistry | null;  // only if presentation packages were supplied
}
```

### 20.2 Stages

The stages implement 03 §12 one-to-one. Each stage is a separately tested pure function:

| 03 §12 step | Function |
| --- | --- |
| 1 Resolve manifests and dependency versions | `resolveManifests` |
| 2 Load framework schemas | built-in TypeBox schemas, versioned by `schema_version` |
| 3 Parse package files | `parseFiles` (`yaml` in strict mode: no custom tags, no merge keys) |
| 4 Validate IDs and primitive schemas | `validateSchemas` |
| 5 Apply includes and merge operations | `composeDefinitions` |
| 6 Resolve references | `resolveReferences` |
| 7 Compile conditions and curves | `compileExpressions` |
| 8 Build tag and dependency indexes | `buildIndexes` |
| 9 Run graph and economic validation | `validateGraphs`, `diagnoseEconomy`, `diagnoseDesignIntent`, `validateDeterminism` |
| 10 Normalize to canonical representation | `normalize` |
| 11 Compute configuration checksum | `checksum` |
| 12 Construct immutable runtime registries | `buildRegistry` (assigns handles, Section 7) |

### 20.3 Diagnostics

```ts
interface Diagnostic {
  readonly code: string;                 // stable, e.g. 'unresolved_reference', 'scarcity_inactive'
  readonly severity: 'error' | 'warning' | 'info';
  readonly package: string | null;
  readonly file: string | null;
  readonly path: string | null;          // JSON pointer into the definition
  readonly definition: string | null;    // string ID
  readonly args: Readonly<Record<string, string | number | boolean>>;
}
```

Diagnostic text is resolved by the CLI or client, not by the content package (04 §7). Strictness modes (03 §11.2) and the promotion of design-intent warnings to errors (03 §11.7) are `LoadOptions`. The interface itself is defined in `@aesfw/core` (`errors/diagnostic.ts`) and re-exported by `@aesfw/content`, so the core API signatures of Section 10.1 do not invert the package dependency of Section 4.3 (A-04).

### 20.4 Published schemas

The TypeBox schemas are exported as JSON Schema files (`packages/content/schemas/*.json`) as a build artifact. Content authors' editors can use them through YAML language-server modelines.

---

## 21. Hosts

### 21.1 Web host (`@aesfw/host-web`)

The session runs in a dedicated Web Worker so that the simulation never blocks rendering.

```text
Main thread (client)                         Worker
SessionClient ── init ─────────────────────▶ fetch content → loadContent → createSession | load
              ◀──────────── ready(metadata) ─
              ── subscribe(actor) ─────────▶
              ◀────── snapshot(full) ──────── projection per actor
              ── command(envelope) ────────▶ submitCommand
              ◀────── command_result ────────
              ── control(run|pause|speed|step N) ▶ clock loop
              ◀────── delta + events + status ─── per published tick (coalesced)
              ── query(placement|read model) ▶ query
              ◀────── query_result ──────────
              ── save(slot) / load(slot) ──▶ IndexedDB
              ◀────── saved / loaded | error ─
```

- Every message carries `protocol_version` and a `kind`. Message payloads are protocol DTOs (Section 22).
- **Clock:** the worker owns the only clock. At speed `k`, it targets `k` ticks per `tick_duration_ms` of wall time. It runs at most `max_catch_up_ticks` per wake-up (default 8) and drops backlog beyond that, which slows the game down instead of freezing it. The wall clock decides only *when* to call `advance`, never *what* it computes.
- **Coalescing:** when several ticks run per wake-up, the worker sends one delta (diff of the last sent projection against the newest) plus all events since then.
- **Persistence:** saves are stored in IndexedDB as canonical JSON. Export and import as files are offered through the client.
- **Errors:** an `InvariantViolation` stops the clock, reports `error` with the diagnostic and the last good hash, and keeps the session inspectable.

### 21.2 Node host and CLI (`@aesfw/host-node`)

```text
aesfw validate <package-dir…> [--strict] [--format text|json]
aesfw run <scenario.yaml> [--ticks N] [--hash-interval N] [--journal out.jsonl] [--metrics out.csv]
aesfw replay <replay.json>
aesfw save-diff <a.json> <b.json>
aesfw bench [--scenario name] [--iterations N]
```

The CLI is the reference implementation of the headless runner required by 02 §21.

---

## 22. Protocol (`@aesfw/protocol`)

- Contains TypeScript types and pure codecs for every DTO in 04: definition metadata, snapshot, snapshot delta, read models, event, command envelope, command result, placement query and result, and the worker messages of Section 21.1.
- **Wire field names follow 04 verbatim (`snake_case`).** Internal code uses `camelCase`. The conversion happens only in `@aesfw/app` projection builders and the gateway decoder.
- All quantities on the wire are base-unit integers. Display scaling and formatting are client concerns.
- `protocol_version` is an integer, starting at 1. Additive fields are minor changes. Removing or changing a field is a breaking change, which needs a new version and a compatibility note in 04.
- Codecs validate incoming DTOs at the boundary (worker side for commands, client side for snapshots) and return `Result`s.

---

## 23. Error Handling

| Class | Representation | Example | Effect |
| --- | --- | --- | --- |
| Expected domain outcome | Block reason, event, or state | Missing input, deficit pause | Normal simulation |
| Command rejection | `CommandResult`/`CommandRejected` with error code | `insufficient_capacity` | Command has no effect |
| Content problem | `Diagnostic` | `unresolved_reference` | Load fails or warns |
| Load/migration problem | `Result.err(Diagnostic[])` | `content_mismatch` | Session not created |
| Invariant violation (bug) | `throw new InvariantViolation(code, args)` | Negative stock, overflow, unknown handle | Host stops the clock and reports it; tests fail |

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Pure packages never throw for expected outcomes. `InvariantViolation` signals a framework defect, so catching and continuing is forbidden except in the host's top-level error boundary.

---

## 24. Performance Approach

- **Budgets** (framework benchmark scenarios, Node, median per tick): `bench.small` (≈ 200 entities) ≤ 0.5 ms, `bench.reference` (≈ 1,500 entities, 6 locations, 20 transport units) ≤ 2 ms, `bench.large` (≈ 10,000 entities) ≤ 10 ms. Product budgets for the reference client are in 07.
- **Benchmark harness** exists from milestone M1 (08). Results are tracked over time, and regressions above 20 % fail the benchmark job (non-blocking for feature merges until M12).
- **Allocation discipline:** hot systems reuse `scratch` buffers. Per-tick allocation is avoided in loops over entities. This is a guideline enforced by review and profiling, not by lint.
- **Optimization path:** structure-of-arrays typed-array stores for hot components, incremental need windows, dirty-flag rebuilds, and a closure-compiled expression fast path. Each optimization must keep hashes identical.

---

## 25. Coding Conventions

- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`.
- `any` is forbidden. `unknown` plus decoding is used at boundaries.
- Pure packages use plain data and functions. Classes are allowed only for error types and for opaque store implementations behind interfaces.
- Discriminated unions with exhaustive `switch` (`assertNever`) are used for commands, events, transactions, and expressions.
- Readonly types for all registry and DTO data.
- File naming: `kebab-case.ts`. System modules: `phase-NN-<name>.ts`. Tests sit next to their sources as `*.test.ts`. Property tests are named `*.prop.test.ts`, and scenario tests live in `fixtures/scenarios`.
- Naming: code is `camelCase`, types are `PascalCase`, data boundaries (YAML, saves, wire) use `snake_case`, event and command types use `PascalCase` (02 §7.3).
- Every exported function of a pure package has a TSDoc comment naming the requirement IDs it implements, for example `/** Implements GDD-12.3, ARCH-5.2 (phase 21). */`.
- Framework source never contains game terminology (Section 4.3 rule 7).

---

## 26. Amendments to Documents 02–04

| ID | Affects | Amendment | Rationale |
| --- | --- | --- | --- |
| A1 | 02 §3.1, §6.3 | Quantities and entity IDs are safe integers (≤ 2^53 − 1), not 64-bit integers. Checked arithmetic is mandatory. | Native `number` speed and typed-array compatibility. The range is ample, and overflow is detected. |
| A2 | 02 §5.2 phases 32–33 | Events are returned from `step`. Snapshot publication happens in the application layer after `step`. | Keeps the kernel free of publication effects. Ordering semantics are unchanged. |
| A3 | 02 §4.3 | Development hot reload of mechanics is not supported in v1. Presentation packages may hot reload in the client. | Not needed for v1 and risky for determinism. |
| A4 | 02 §5.3 | Single-threaded tick execution in v1. Parallelism is limited to running the session off the UI thread. | Simplicity. The ordering keys of 02 §5.3 are still honored, so parallelism can be added later. |
| A5 | 04 §12, §13 | `expected_session_revision` is checked per referenced entity (Section 18.3). | Session-wide checks would reject almost every command while the game runs. |
| A6 | 02 §17 | Networking is out of scope for v1. The protocol and command log are designed so that host-authoritative networking can be added. | Scope. |
| A7 | 03 §1 | YAML is the only authoring format in v1. The canonical normalized representation is canonical JSON (Section 19.3). | One parser, one canonical form. |
| A8 | 03 §6.8 | The entity `connectivity` component declares exactly one of `requires` (needs the named network) or `provides` (extends the named network, e.g. the connector archetype of 01 §9.11). | The provider form was unspecified though 01 §9.2 requires provider and requirement components. |
| A9 | 04 §9.1 | The snapshot carries a grid-policy location's `grid` (width, height, blocked cells), a placed entity's `spatial.footprint`, and an entity's `connectivity` (role, network, connected). | The client grid (07 §12.2) needs topology, footprint, and connectivity; they were exposed but unspecified. |
| A10 | 04 §9.3 | The omitted-attribute list for an unknown location names property values, region, grid geometry, connectivity, and foreign entities. | Reconciles §9.3 with the attributes the snapshot actually carries. |
| A11 | 04 §10.2 | The location summary is delivered incrementally; grid topology and the property vector are read from the snapshot (§9.1); a field may not be depended on until a roadmap row owns it. | Prevents a client depending on an unowned field. |
| A12 | 04 §20 | A value absent from §9, §10, or §12 SHALL NOT be displayed; extending a view therefore extends the contract and its owning row first (08 §7.4). | Makes the snapshot/query traceability criterion actionable. |
| A13 | 03 §6.6 | A world location no owner lists in `established_locations` has no owner (unestablished, 01 §16.3) instead of defaulting to the first owner. | Establishment (`requires_unoccupied`, exclusive ownership) needs genuinely unowned locations; single-owner fixtures are unaffected. |
| A14 | 04 §20 (A12) | Definition metadata (§4) is a displayable source alongside §9, §10, and §12; clients still never infer behavior from it. | §4 already exposes numeric parameters to clients; build menus, costs, and radius previews (07 §12.3, §13.3) display them. |
| A15 | 02 §5.2 (phases 01, 03), 03 §6.8 | An entity the player creates is materialized from its definition: phase 01 materializes a placement that needs no construction, and phase 03 materializes a constructed entity when it becomes `active`. Core declares the `EntityMaterializer` seam; `@aesfw/app` implements it from compiled content. | GDD-18.1 implies a placed entity behaves like an authored one, but no phase wrote the produced, residence, source, service, connectivity, cargo, or maintenance components, so every constructed entity was an inert shell. |

When an amendment is accepted, the affected document is updated in the same change, with a note referencing this table.

---

## 27. Decision Log

| ID | Decision | Alternatives considered | Status |
| --- | --- | --- | --- |
| D-01 | TypeScript for the whole stack | Rust core compiled to WASM | Accepted |
| D-02 | Owned mutation with clone-on-demand instead of persistent immutable state | Immutable structural sharing (Immer and similar) | Accepted |
| D-03 | Safe-integer fixed point in `number` | `BigInt` everywhere; `BigInt64Array` stores | Accepted |
| D-04 | Array-of-structures stores first, structure-of-arrays later behind the same interface | Structure-of-arrays from the start | Accepted |
| D-05 | Interpreted expression tree for conditions | Closure compilation; bytecode | Accepted (fast path optional) |
| D-06 | FNV-1a 64 over canonical JSON for state hashes | xxHash64, SHA-256 | Accepted |
| D-07 | xoshiro128\*\* for random streams | PCG32, Mulberry32 | Accepted |
| D-08 | TypeBox for schemas | Zod, Ajv with JSON Schema | Accepted |
| D-09 | Web Worker host with coalesced deltas | Main-thread simulation | Accepted |
| D-10 | Plain DOM and SVG client without a UI framework | Preact, Svelte, Canvas | Accepted (see 07) |
| D-11 | `snake_case` wire format matching 04 verbatim | `camelCase` DTOs with a mapping table | Accepted |
| D-12 | Entity-scoped revision checks (A5) | Session-wide revision checks | Accepted |

New decisions are appended. A superseded decision is marked `Superseded by D-xx` and is never deleted.

---

## 28. Acceptance Criteria

- Every package listed in Section 4.2 exists with its declared dependencies, and dependency-cruiser enforces the rules of Section 4.3.
- No pure package type-checks against DOM or Node typings, and no test in a pure package can call the trapped APIs of Section 5.5 without failing.
- `step` is observably pure: stepping a clone and the original with the same input produces identical hashes (06, INV-17).
- All authoritative arithmetic goes through `fx`, and no floating-point value reaches authoritative state.
- Every phase of 02 §5.2 has a registered system module with declared reads and writes.
- Saves and replays use the formats of Section 19 and reproduce state hashes after load.
- The same replay produces identical hash checkpoints in Node and in all three browser engines.
- The reference client compiles without importing `@aesfw/core`, `@aesfw/content`, or `@aesfw/app`.
- Every amendment in Section 26 is reflected in the affected document.
