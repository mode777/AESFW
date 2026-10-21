# Tasks

## 1. Schemas and catalogue (design D8)

- [x] 1.1 Create `packages/content/src/schemas/condition.ts` and `packages/content/src/schemas/curve.ts` per design D8.
- [x] 1.2 Add `conditions` and `curves` to `collections.ts` and to the JSON Schema export; regenerate `packages/content/schemas/*.json`.

## 2. Expression compiler (design D2, D3, D5)

- [x] 2.1 Create `packages/content/src/conditions/expr.ts` and `queries.ts` with the `Expr` tree, `QueryRef`, `Selector`, and `QUERY_TABLE`.
- [x] 2.2 Create `packages/content/src/conditions/compile.ts` with `compileCondition`, `compileExpressions`, and type checking per design D2/D3/D5, emitting `unknown_operator`, `invalid_condition_shape`, `condition_type_error`, and `unknown_query`.
- [x] 2.3 Add `packages/content/src/conditions/compile.test.ts` with one test per spec scenario for compilation and type checking.

## 3. Evaluator (design D4)

- [x] 3.1 Create `packages/content/src/conditions/evaluate.ts` with `evaluate` and `EvalContext` per design D4.
- [x] 3.2 Add `packages/content/src/conditions/evaluate.test.ts` with one test per spec scenario for evaluation and the query table.

## 4. Curves (design D6)

- [x] 4.1 Create `packages/content/src/conditions/curves.ts` with `compileCurve` and `evaluateCurve` per design D6, emitting `invalid_curve` and `curve_extrapolation_error`.
- [x] 4.2 Add `packages/content/src/conditions/curves.test.ts` with one test per spec scenario for curve types and extrapolation.

## 5. Load-time compilation (design D7)

- [x] 5.1 Extend `packages/content/src/registry/load.ts` to call `compileExpressions` and include its diagnostics; add a test in `load.test.ts` for an invalid condition failing the load.

## 6. Public surface

- [x] 6.1 Create `packages/content/src/conditions/index.ts` and extend `packages/content/src/index.ts`. Verify: `pnpm type-check` green.

## 7. Documentation and verification

- [x] 7.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 7.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [CONT-7.1, CONT-7.2, CONT-7.3, CONT-8, TDS-14.1, TDS-14.2, TDS-14.4]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.6 with "✓ archived <date>" in `docs/08`.
