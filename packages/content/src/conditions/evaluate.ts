/**
 * The pure expression evaluator (TDS-14.1). Domain queries and aggregations
 * are resolved through the `EvalContext`, so the simulation rows supply the
 * state-reading implementations (design D4).
 *
 * Source: TDS-14.1, TDS-14.2
 */
import { fx } from '@aesfw/core';

import type { AggOp, ArithOp, Expr, QueryRef, Selector } from './expr.js';

/** The subject an expression is evaluated against. */
export interface EvalSubject {
  readonly kind: 'entity' | 'location' | 'owner' | 'global';
  readonly id: number;
}

/** The context an expression is evaluated in (design D4). */
export interface EvalContext {
  readonly subject: EvalSubject;
  readonly query: (query: QueryRef) => number;
  readonly aggregate: (op: AggOp, selector: Selector, query: QueryRef) => number;
  /**
   * The consecutive true ticks of the evaluating condition's `sustained` timer
   * for a slot (TDS-14.3). The context builder closes over the condition
   * handle and subject; absent timers read `0`.
   */
  readonly timer: (slot: number) => number;
}

const toInt = (value: number): number => value;

const evalInt = (expr: Expr, context: EvalContext): number => {
  const result = evaluate(expr, context);
  return typeof result === 'boolean' ? (result ? 1 : 0) : result;
};

const evalArith = (op: ArithOp, args: readonly Expr[], context: EvalContext): number => {
  const values = args.map((arg) => evalInt(arg, context));
  const first = values[0] ?? 0;
  const second = values[1] ?? 0;
  switch (op) {
    case 'add':
      return values.reduce((acc, value) => fx.add(toInt(acc), toInt(value)), 0);
    case 'sub':
      return fx.sub(toInt(first), toInt(second));
    case 'mul':
      return values.reduce((acc, value) => fx.mul(toInt(acc), toInt(value)), 1);
    case 'div':
      return second === 0 ? 0 : fx.div(toInt(first), toInt(second), 'floor');
    case 'min':
      return values.length === 0 ? 0 : fx.min(values.map(toInt));
    case 'max':
      return values.length === 0 ? 0 : fx.max(values.map(toInt));
    default:
      return 0;
  }
};

/**
 * Evaluates a compiled expression (TDS-14.1).
 *
 * Source: TDS-14.1
 */
export function evaluate(expr: Expr, context: EvalContext): number | boolean {
  switch (expr.t) {
    case 'int':
      return expr.v;
    case 'bool':
      return expr.v;
    case 'all':
      return expr.args.every((arg) => evaluate(arg, context) === true);
    case 'any':
      return expr.args.some((arg) => evaluate(arg, context) === true);
    case 'not':
      return evaluate(expr.arg, context) !== true;
    case 'cmp': {
      const left = evaluate(expr.l, context);
      const right = evaluate(expr.r, context);
      switch (expr.op) {
        case 'eq':
          return left === right;
        case 'ne':
          return left !== right;
        case 'gt':
          return (left as number) > (right as number);
        case 'ge':
          return (left as number) >= (right as number);
        case 'lt':
          return (left as number) < (right as number);
        case 'le':
          return (left as number) <= (right as number);
      }
      return false;
    }
    case 'arith':
      return evalArith(expr.op, expr.args, context);
    case 'clamp':
      return fx.clamp(
        toInt(evalInt(expr.v, context)),
        toInt(evalInt(expr.lo, context)),
        toInt(evalInt(expr.hi, context)),
      );
    case 'query':
      return context.query(expr.query);
    case 'agg':
      return context.aggregate(expr.op, expr.selector, expr.query);
    case 'sustained':
      return context.timer(expr.slot) >= expr.ticks;
  }
}
