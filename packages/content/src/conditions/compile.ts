/**
 * Condition compilation and type checking (CONT-7, TDS-14.1). Compiles raw
 * expression data into the typed tree, reporting operator, shape, type, and
 * query diagnostics without throwing.
 *
 * Source: CONT-7.1, CONT-7.2, TDS-14.1, TDS-14.2
 */
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { ContentRegistry } from '../registry/types.js';
import type { RawDefinitions } from '../schemas/validate.js';
import type { JsonValue } from '../types.js';
import type {
  AggOp,
  ArithOp,
  CmpOp,
  CompiledCondition,
  Expr,
  ExprType,
  QueryRef,
  Selector,
} from './expr.js';
import { isKnownQuery } from './queries.js';
import { compileCurve } from './curves.js';

const CMP_OPS: Readonly<Record<string, CmpOp>> = {
  equal: 'eq',
  not_equal: 'ne',
  greater: 'gt',
  greater_equal: 'ge',
  less: 'lt',
  less_equal: 'le',
};

const ARITH_OPS: Readonly<Record<string, ArithOp>> = {
  add: 'add',
  subtract: 'sub',
  multiply: 'mul',
  divide: 'div',
  min: 'min',
  max: 'max',
};

const AGG_OPS: Readonly<Record<string, AggOp>> = {
  sum: 'sum',
  count: 'count',
  average: 'average',
  minimum: 'minimum',
  maximum: 'maximum',
};

interface CompileContext {
  readonly diagnostics: Diagnostic[];
  readonly definition: string | null;
  /** Pre-order counter for `sustained` timer-slot assignment (TDS-14.3). */
  readonly sustainedSlots: { next: number };
}

interface CompiledExpr {
  readonly expr: Expr;
  readonly type: ExprType;
}

const isRecord = (value: JsonValue | undefined): value is { readonly [key: string]: JsonValue } =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);

const fail = (
  context: CompileContext,
  code: string,
  path: string,
  args?: Record<string, string | number | boolean>,
): null => {
  context.diagnostics.push(
    diag(code, { definition: context.definition, path, ...(args !== undefined ? { args } : {}) }),
  );
  return null;
};

const typeError = (context: CompileContext, path: string, expected: string, actual: string): null =>
  fail(context, 'condition_type_error', path, { expected, actual });

const compileQuery = (
  name: string,
  value: JsonValue | undefined,
  context: CompileContext,
  path: string,
): QueryRef | null => {
  if (!isKnownQuery(name)) return fail(context, 'unknown_query', path, { query: name });
  if (typeof value === 'string') return { name, args: {}, subject: value };
  if (isRecord(value)) {
    const subject = typeof value['subject'] === 'string' ? value['subject'] : 'current_entity';
    const args: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value)) {
      if (key !== 'subject') args[key] = value[key] ?? null;
    }
    return { name, args, subject };
  }
  return { name, args: {}, subject: 'current_entity' };
};

const compileSelector = (
  value: JsonValue | undefined,
  context: CompileContext,
  path: string,
): Selector | null => {
  if (typeof value === 'string') return { type: value, args: {} };
  if (isRecord(value)) {
    const type = typeof value['type'] === 'string' ? value['type'] : Object.keys(value)[0];
    if (type === undefined) return fail(context, 'invalid_condition_shape', path);
    return { type, args: value };
  }
  return fail(context, 'invalid_condition_shape', path);
};

const compileIntArgs = (
  items: readonly JsonValue[],
  context: CompileContext,
  path: string,
): readonly Expr[] | null => {
  const args: Expr[] = [];
  items.forEach((item, index) => {
    const compiled = compileExpr(item, context, `${path}/${index}`);
    if (compiled === null || compiled.type !== 'int') {
      if (compiled !== null) typeError(context, `${path}/${index}`, 'int', compiled.type);
      return;
    }
    args.push(compiled.expr);
  });
  return args.length === items.length ? args : null;
};

const compileExpr = (
  raw: JsonValue,
  context: CompileContext,
  path: string,
): CompiledExpr | null => {
  if (typeof raw === 'boolean') return { expr: { t: 'bool', v: raw }, type: 'bool' };
  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw)) return typeError(context, path, 'int', 'number');
    return { expr: { t: 'int', v: raw }, type: 'int' };
  }
  if (!isRecord(raw)) return fail(context, 'invalid_condition_shape', path);
  const keys = Object.keys(raw);
  if (keys.length !== 1) return fail(context, 'invalid_condition_shape', path);
  const op = keys[0] ?? '';
  const value = raw[op];

  if (op === 'sustained') {
    const record = isRecord(value) ? value : null;
    if (record === null || record['ticks'] === undefined || record['condition'] === undefined) {
      return fail(context, 'invalid_condition_shape', path);
    }
    const ticks = record['ticks'];
    if (typeof ticks !== 'number' || !Number.isSafeInteger(ticks) || ticks < 1) {
      return fail(context, 'condition_ticks_invalid', `${path}/ticks`, {
        ticks: typeof ticks === 'number' ? ticks : 'invalid',
      });
    }
    const slot = context.sustainedSlots.next;
    context.sustainedSlots.next += 1;
    const inner = compileExpr(record['condition'] ?? null, context, `${path}/condition`);
    if (inner === null) return null;
    if (inner.type !== 'bool') return typeError(context, `${path}/condition`, 'bool', inner.type);
    return {
      expr: { t: 'sustained', ticks, slot, inner: inner.expr },
      type: 'bool',
    };
  }

  if (op === 'all' || op === 'any') {
    if (!Array.isArray(value)) return fail(context, 'invalid_condition_shape', path);
    const items = value as readonly JsonValue[];
    const args: Expr[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const compiled = compileExpr(items[index] ?? null, context, `${path}/${index}`);
      if (compiled === null) return null;
      if (compiled.type !== 'bool')
        return typeError(context, `${path}/${index}`, 'bool', compiled.type);
      args.push(compiled.expr);
    }
    return { expr: { t: op, args }, type: 'bool' };
  }

  if (op === 'not') {
    const compiled = compileExpr(value ?? null, context, `${path}/not`);
    if (compiled === null) return null;
    if (compiled.type !== 'bool') return typeError(context, path, 'bool', compiled.type);
    return { expr: { t: 'not', arg: compiled.expr }, type: 'bool' };
  }

  if (op in CMP_OPS) {
    const record = isRecord(value) ? value : null;
    if (record === null || record['left'] === undefined || record['right'] === undefined) {
      return fail(context, 'invalid_condition_shape', path);
    }
    const left = compileExpr(record['left'] ?? null, context, `${path}/left`);
    const right = compileExpr(record['right'] ?? null, context, `${path}/right`);
    if (left === null || right === null) return null;
    const cmp = CMP_OPS[op] ?? 'eq';
    if (cmp === 'eq' || cmp === 'ne') {
      if (left.type !== right.type) return typeError(context, path, left.type, right.type);
    } else if (left.type !== 'int' || right.type !== 'int') {
      return typeError(context, path, 'int', left.type !== 'int' ? left.type : right.type);
    }
    return { expr: { t: 'cmp', op: cmp, l: left.expr, r: right.expr }, type: 'bool' };
  }

  if (op === 'clamp') {
    const record = isRecord(value) ? value : null;
    if (
      record === null ||
      record['value'] === undefined ||
      record['min'] === undefined ||
      record['max'] === undefined
    ) {
      return fail(context, 'invalid_condition_shape', path);
    }
    const v = compileExpr(record['value'] ?? null, context, `${path}/value`);
    const lo = compileExpr(record['min'] ?? null, context, `${path}/min`);
    const hi = compileExpr(record['max'] ?? null, context, `${path}/max`);
    if (v === null || lo === null || hi === null) return null;
    if (v.type !== 'int' || lo.type !== 'int' || hi.type !== 'int') {
      return typeError(context, path, 'int', v.type);
    }
    return { expr: { t: 'clamp', v: v.expr, lo: lo.expr, hi: hi.expr }, type: 'int' };
  }

  if (op in ARITH_OPS) {
    if (!Array.isArray(value)) return fail(context, 'invalid_condition_shape', path);
    const items = value as readonly JsonValue[];
    const arith = ARITH_OPS[op] ?? 'add';
    if ((arith === 'sub' || arith === 'div') && items.length !== 2) {
      return fail(context, 'invalid_condition_shape', path);
    }
    const args = compileIntArgs(items, context, path);
    if (args === null) return null;
    return { expr: { t: 'arith', op: arith, args }, type: 'int' };
  }

  if (op in AGG_OPS) {
    const record = isRecord(value) ? value : null;
    if (record === null || record['of'] === undefined) {
      return fail(context, 'invalid_condition_shape', path);
    }
    const selector = compileSelector(record['selector'], context, `${path}/selector`);
    const of = isRecord(record['of']) ? record['of'] : null;
    if (selector === null || of === null)
      return fail(context, 'invalid_condition_shape', `${path}/of`);
    const ofKeys = Object.keys(of);
    if (ofKeys.length !== 1) return fail(context, 'invalid_condition_shape', `${path}/of`);
    const query = compileQuery(ofKeys[0] ?? '', of[ofKeys[0] ?? ''] ?? null, context, `${path}/of`);
    if (query === null) return null;
    return { expr: { t: 'agg', op: AGG_OPS[op] ?? 'sum', selector, query }, type: 'int' };
  }

  if (isKnownQuery(op)) {
    const query = compileQuery(op, value, context, path);
    if (query === null) return null;
    return { expr: { t: 'query', query }, type: 'int' };
  }

  return fail(context, 'unknown_operator', path, { operator: op });
};

/** The outcome of compiling one condition. */
export interface CompileConditionResult {
  readonly condition: CompiledCondition | null;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Compiles one condition definition (TDS-14.1).
 *
 * Source: CONT-7.1, TDS-14.1
 */
export function compileCondition(
  definition: JsonValue,
  registry: ContentRegistry,
): CompileConditionResult {
  void registry;
  const diagnostics: Diagnostic[] = [];
  const record = isRecord(definition) ? definition : null;
  const id = record !== null && typeof record['id'] === 'string' ? record['id'] : null;
  if (record === null || id === null || record['expression'] === undefined) {
    diagnostics.push(diag('invalid_condition_shape', { definition: id, path: '/expression' }));
    return { condition: null, diagnostics };
  }
  const compiled = compileExpr(
    record['expression'] ?? null,
    {
      diagnostics,
      definition: id,
      sustainedSlots: { next: 0 },
    },
    '/expression',
  );
  if (compiled === null) return { condition: null, diagnostics };
  return {
    condition: { id, root: compiled.expr, resultType: compiled.type, subjectKind: 'entity' },
    diagnostics,
  };
}

/**
 * Compiles every condition and curve definition (TDS-20.2 step 7).
 *
 * Source: TDS-20.2
 */
export function compileExpressions(
  definitions: RawDefinitions,
  registry: ContentRegistry,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const condition of definitions['conditions'] ?? []) {
    diagnostics.push(...compileCondition(condition, registry).diagnostics);
  }
  for (const curve of definitions['curves'] ?? []) {
    diagnostics.push(...compileCurve(curve).diagnostics);
  }
  return diagnostics;
}
