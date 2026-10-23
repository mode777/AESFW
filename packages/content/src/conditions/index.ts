/**
 * Conditions and curves (CONT-7, CONT-8, TDS-14).
 *
 * Source: CONT-7, CONT-8, TDS-14
 */
export type {
  AggOp,
  ArithOp,
  CmpOp,
  CompiledCondition,
  Expr,
  ExprType,
  QueryRef,
  Selector,
} from './expr.js';
export { compileCondition, compileExpressions } from './compile.js';
export type { CompileConditionResult } from './compile.js';
export { evaluate } from './evaluate.js';
export type { EvalContext, EvalSubject } from './evaluate.js';
export { QUERY_TABLE, isKnownQuery } from './queries.js';
export type { QueryName } from './queries.js';
export { compileCurve, evaluateCurve } from './curves.js';
export type { CompiledCurve, CompileCurveResult, CurveType, Extrapolation } from './curves.js';
export { buildSustainedTimerUpdater } from './timers.js';
export type { SustainedQueryResolver } from './timers.js';
export { sustainedSlots } from './expr.js';
