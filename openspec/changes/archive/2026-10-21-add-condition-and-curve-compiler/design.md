# Design — add-condition-and-curve-compiler

## Context

`add-registry-compilation` (1.4) is archived: the catalogue, schemas, and `loadContent` exist. CONT-7, CONT-8, and TDS-14 fix the expression language and curves. This document records the choices they leave open, in particular the raw-expression shape, the `EvalContext`, and the load-time wiring.

## Goals / Non-Goals

**Goals:** a typed expression tree with compile-time type checking; a pure evaluator; the initial domain-query table; curve compilation and evaluation; condition/curve schemas and catalogue entries; load-time compilation diagnostics.

**Non-Goals:** `sustained` timers and phase 22 (7.1); concrete domain-query implementations that read simulation state (the sim rows); graph validation (10.1); determinism validation (10.4).

## Decisions

### D1 — Module layout

`packages/content/src/conditions/` holds `expr.ts` (the `Expr` tree and types), `compile.ts` (`compileCondition`, `compileExpressions`, type checking), `evaluate.ts` (`evaluate`, `EvalContext`), `queries.ts` (the query table), `curves.ts` (`compileCurve`, `evaluateCurve`), and `index.ts`. `src/schemas/` gains `condition.ts` and `curve.ts`; `collections.ts` gains the `conditions` and `curves` entries; `src/registry/load.ts` calls `compileExpressions`.

### D2 — Raw-expression shape

A raw expression is JSON data. A node is either a scalar literal or a mapping with exactly one operator key. Boolean operators take an array (`all`, `any`) or a single expression (`not`); comparisons take `{ left, right }`; arithmetic takes an array except `subtract`/`divide` (`[left, right]`) and `clamp` (`{ value, min, max }`); aggregation takes `{ selector, of }` where `of` is a query; a domain query is `{ <name>: <args> }` where args is a subject string or a mapping. `sustained` is not a recognised operator here; it is added by 7.1. This shape is documented in the spec and validated by the compiler, not by a recursive TypeBox schema, so diagnostics are precise.

### D3 — Type checking

The compiler returns `{ expr, type }` for every node and checks as it builds: `all`/`any`/`not` require boolean operands; `add`/`subtract`/`multiply`/`divide`/`min`/`max`/`clamp` and the aggregate operators require integer operands; comparisons require operands of the same type; `equal`/`not_equal` accept either. A mismatch reports `condition_type_error` and compilation returns `null` for that condition. The condition root must be `bool` or `int`.

### D4 — Evaluator and `EvalContext`

`evaluate(expr, context)` is pure. `EvalContext` is `{ subject: EvalSubject; query(query: QueryRef): Int; aggregate(op, selector, query): Int }`, where `EvalSubject` is `{ kind: 'entity' | 'location' | 'owner' | 'global'; id: number }`. Domain queries and aggregations are resolved through the context so the sim rows supply the state-reading implementations without 1.6 importing the world model. Arithmetic uses `@aesfw/core`'s `fx`; `divide` returns `0` for a zero divisor before calling `fx.div` (which throws), matching TDS-14.1.

### D5 — Query table

`QUERY_TABLE` lists the initial query names of CONT-7.2 with return type `int`. `compileCondition` reports `unknown_query` for a name outside the table. A query node compiles to `{ t: 'query', query: { name, args, subject } }`.

### D6 — Curves

`compileCurve` validates `type`, a non-empty `points` list of `[input, output]` integer pairs, and the optional `extrapolation` (default `clamp`), and sorts points by input; it reports `invalid_curve` otherwise. `evaluateCurve` interpolates with `fx.mulDiv(..., 'floor')` for `piecewise_linear` and selects the greatest point at or below the input for `step` and `lookup`. `clamp` clamps to the end points; `linear` extends the first and last segments; `error` clamps and appends a `curve_extrapolation_error` finding to a mutable counter passed by the caller (so evaluation stays pure per call).

### D7 — Load-time compilation modifies `content/registry`

`compileExpressions(definitions, registry)` compiles every condition and curve and returns diagnostics. `loadContent` calls it after `buildRegistry` and concatenates the diagnostics. This is a `content/registry` spec modification recorded in the delta.

### D8 — Schema and catalogue additions modify `content/schemas`

The `conditions` collection maps to core's `condition` type and the `curves` collection to `curve`. The condition schema requires `id` and an `expression` (validated by the compiler); the curve schema is fully typed. `COLLECTION_ORDER` grows by these two entries, so the registry assigns handles for them; this is additive and does not change existing handles' relative order within their own types.

### D9 — Dependencies and versioned artifacts

No new dependency; `@aesfw/core` (`fx`) is already available. No versioned algorithm, save format, protocol version, or golden hash changes.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [The raw-expression shape is an interpretation] → documented in D2 and the spec; CONT-7 fixes the operators but not every nesting detail.
- [Domain queries are resolved through a context, not implemented here] → the sim rows own state reading; the table fixes names and types now.
- [`error` extrapolation cannot throw] → it clamps and reports a diagnostic counter, per TDS-14.4.

## Migration Plan

Additive source, schema, and test files plus a small change to `loadContent`. No state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
