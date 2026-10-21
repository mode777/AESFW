# Design — add-world-state-model

## Context

0.3 (`fx`) and 0.4 (`det`, branded IDs, `Result`) are archived. `@aesfw/core` now has exact arithmetic and deterministic primitives but no authoritative state. What the state model must contain and how it encodes is fixed by TDS-8, ARCH-3, and ARCH-4.2; this document records only the choices TDS leaves open.

## Goals / Non-Goals

**Goals:** a complete `World` record whose authoritative fields are plain canonical data; a generic `ComponentStore` with ascending iteration and tombstones; monotonic allocators; an owners table; canonical encode/decode/clone/hash with caches excluded; `@aesfw/core` stays at zero runtime dependencies.

**Non-Goals:** the tick pipeline, `step`, `runPhases`, `TickContext`, `EventWriter`, write-set checks (0.6); testkit builders and `checkInvariants` (0.7); the compiled `Registry` and definition schemas (1.2, 1.4); transaction semantics and the reservation ledger (1.7); spatial caches and their rebuild (3.1); the command catalogue and gateway (2.2).

## Decisions

### D1 — Module layout

`packages/core/src/world/` holds `component-store.ts`, `types.ts`, `create.ts` (world creation and allocators), `codec.ts` (encode/decode/clone/hash), and `index.ts`. `packages/core/src/registry/types.ts` holds the `Registry` abstraction. `packages/core/src/errors/diagnostic.ts` holds the `Diagnostic` shape. `src/det/canonical.ts` gains the exported `JsonValue` type.

### D2 — Component store: dense arrays indexed by entity ID, tombstones for removal

Because entity IDs are monotonic and start at 1, a store keeps a dense `values: (T | undefined)[]` indexed by ID plus a parallel `removed: boolean[]` tombstone array; `set` appends or replaces, `markRemoved` sets the tombstone. `ids()` scans the array in index order (ascending ID) and returns live IDs, so iteration order is identical before and after save/load (TDS-8.2). `get`/`has` return false/undefined for tombstoned entities; `getOrThrow` throws `InvariantViolation('unknown_component')`. `compact()` drops tombstoned slots; it is the phase-30 hook, called by the `finalizeLifecycle` system once 0.6 registers the phase table (the interface is additive to TDS-8.2). Values are `JsonValue`, the canonical domain; M1 component schemas instantiate the generic with narrower record types.

### D3 — Component container and v1 kinds

`COMPONENT_KINDS` is the fixed, canonical-order tuple of the v1 store kinds of TDS-8.3. `createComponentStores()` builds one empty store per kind; `stores.get(kind)` returns it. Encoding iterates `COMPONENT_KINDS`, never the container's internals, so store order is canonical regardless of insertion. The container's own bookkeeping is not authoritative state.

### D4 — Authoritative fields are plain, sorted arrays

Every authoritative collection in `World` is a plain array with a documented order (TDS-9.4 forbids plain objects as maps): named RNG streams by name, owners by handle, knowledge by location ID, accounts by resource handle, reservations by ID, accumulator entries by `(subject, purpose, resource)`, timers by `(condition, slot, subject)`, exchange prices by `(exchange, resource)`, commands by `(tick, seq)`, metric windows by `(subject, purpose, resource)`. This keeps `encodeWorld` a direct projection and `canonicalStringify` a total function over it. Value types owned by later rows (`ScheduledCommand.command`, module data, metric windows) are `JsonValue` placeholders that their owning rows narrow; the M0 world is empty, so the placeholders are never populated.

### D5 — `Registry` is a function-based abstraction; content implements it

TDS-4.3 forbids `@aesfw/core` importing `@aesfw/content`, but TDS-8.5 and TDS-10.1 need definition-handle ↔ string-ID resolution in core signatures. Core therefore defines `Registry` as two pure functions, `stringIdOf(type, handle)` and `handleOf(type, id)`, plus `createEmptyRegistry()`. The compiled registry of 1.4 implements the same interface. This keeps the dependency direction core ← content and lets M0 codecs be tested with a tiny fake registry.

### D6 — `Diagnostic` lives in core and is re-exported by content

TDS-10.1 puts `Diagnostic[]` in a `@aesfw/core` signature while TDS-20.3 describes the shape under `@aesfw/content`. To respect the dependency rule, the shape is defined once in `packages/core/src/errors/diagnostic.ts` and `@aesfw/content` re-exports it in 1.4. Recorded as amendment A-04.

### D7 — Codec: encode projects through the registry, decode validates, clone copies directly

`encodeWorld` builds a canonical-state record: scalar fields copied, definition handles resolved to string IDs through the registry (an unknown handle throws `InvariantViolation('unknown_definition_handle')`), entity-keyed stores emitted as `[id, value]` pairs in ascending order, and `caches` omitted entirely (TDS-8.4). `decodeWorld` rebuilds the world, resolving string IDs back to handles and returning `err([Diagnostic])` with code `invalid_canonical_state` for malformed input rather than throwing; decoded caches are dirty. `cloneWorld` deep-copies the plain data directly (it must preserve handles and cannot depend on a registry), rebuilding fresh component stores and marking caches dirty. `hashWorld` is `fnv1a64(canonicalStringify(encodeWorld(...)))` (TDS-19.4).

### D8 — Allocators and `createWorld` details

`allocateEntity`/`allocateReservation` mutate the world in place under the owned-mutation rule (TDS-5.2) and return the allocated ID. `createWorld` returns `ok` for M0: it has no world definition to validate (content loading is 1.1+) and `WorldSetup.tickDurationMs` is session state (stored by `@aesfw/app` in 2.x), not world state, so it is accepted and not retained. `setup.world` is likewise unused until the world-definition loader exists.

## Amendments and clarifications to 01–07

- **A-04 (clarification, additive):** TDS-20.3 notes that the `Diagnostic` interface "is defined in `@aesfw/core` (`errors/diagnostic.ts`) and re-exported by `@aesfw/content`", so the core API signatures of TDS-10.1 do not invert the package dependency of TDS-4.3. No conflict with 01–04 was found.

## Risks / Trade-offs

- [World value types owned by later rows are placeholders] → they are `JsonValue` and remain empty in M0; their owning rows narrow them, and because no saves or goldens exist yet there is no format break.
- [A dense array indexed by entity ID wastes memory when IDs are sparse] → IDs are monotonic and dense in practice; TDS-8.2 explicitly allows a later structure-of-arrays move behind the same interface.
- [Decode validation could be too permissive] → it validates every field it reads and reports `invalid_canonical_state`; the save format's stronger validation arrives with `add-save-load` (2.5).
- [`tickDurationMs` accepted but not stored] → it is session state (TDS-19.1 header), not `World` (TDS-8.1); storing it would change the hash for no benefit.

## Migration Plan

Additive source and test files inside `@aesfw/core`; no state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
