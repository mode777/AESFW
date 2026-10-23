/**
 * The compiled expression tree (TDS-14.1).
 *
 * Source: TDS-14.1
 */
import type { JsonValue } from '../types.js';

/** A comparison operator (CONT-7.2). */
export type CmpOp = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';

/** An arithmetic operator (CONT-7.2). */
export type ArithOp = 'add' | 'sub' | 'mul' | 'div' | 'min' | 'max';

/** An aggregation operator (CONT-7.2). */
export type AggOp = 'sum' | 'count' | 'average' | 'minimum' | 'maximum';

/** The result type of an expression (TDS-14.1). */
export type ExprType = 'int' | 'bool';

/** A selector over a subject set (CONT-7.2). */
export interface Selector {
  readonly type: string;
  readonly args: Readonly<Record<string, JsonValue>>;
}

/** A domain query reference (TDS-14.2). */
export interface QueryRef {
  readonly name: string;
  readonly args: Readonly<Record<string, JsonValue>>;
  readonly subject: string;
}

/** A typed expression node (TDS-14.1). */
export type Expr =
  | { readonly t: 'int'; readonly v: number }
  | { readonly t: 'bool'; readonly v: boolean }
  | { readonly t: 'all' | 'any'; readonly args: readonly Expr[] }
  | { readonly t: 'not'; readonly arg: Expr }
  | { readonly t: 'cmp'; readonly op: CmpOp; readonly l: Expr; readonly r: Expr }
  | { readonly t: 'arith'; readonly op: ArithOp; readonly args: readonly Expr[] }
  | { readonly t: 'clamp'; readonly v: Expr; readonly lo: Expr; readonly hi: Expr }
  | { readonly t: 'agg'; readonly op: AggOp; readonly selector: Selector; readonly query: QueryRef }
  | { readonly t: 'query'; readonly query: QueryRef }
  | {
      readonly t: 'sustained';
      readonly ticks: number;
      readonly slot: number;
      readonly inner: Expr;
    };

/**
 * Returns the timer slots of every `sustained` node in the tree, in pre-order
 * (TDS-14.3).
 *
 * Source: TDS-14.3
 */
export function sustainedSlots(root: Expr): readonly number[] {
  const slots: number[] = [];
  const walk = (expr: Expr): void => {
    switch (expr.t) {
      case 'int':
      case 'bool':
      case 'query':
        return;
      case 'all':
      case 'any':
      case 'arith':
        expr.args.forEach(walk);
        return;
      case 'not':
        walk(expr.arg);
        return;
      case 'cmp':
        walk(expr.l);
        walk(expr.r);
        return;
      case 'clamp':
        walk(expr.v);
        walk(expr.lo);
        walk(expr.hi);
        return;
      case 'agg':
        return;
      case 'sustained':
        slots.push(expr.slot);
        walk(expr.inner);
        return;
    }
  };
  walk(root);
  return slots;
}

/** A compiled condition (TDS-14.1). */
export interface CompiledCondition {
  readonly id: string;
  readonly root: Expr;
  readonly resultType: ExprType;
  readonly subjectKind: 'entity' | 'location' | 'owner' | 'global';
}
