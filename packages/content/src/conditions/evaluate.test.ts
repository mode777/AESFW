import { describe, expect, it } from 'vitest';

import type { Expr } from './expr.js';
import { evaluate } from './evaluate.js';
import type { EvalContext } from './evaluate.js';
import { QUERY_TABLE, isKnownQuery } from './queries.js';

const context = (query: (name: string) => number): EvalContext => ({
  subject: { kind: 'entity', id: 1 },
  query: (queryRef) => query(queryRef.name),
  aggregate: () => 0,
});

const int = (v: number): Expr => ({ t: 'int', v });
const bool = (v: boolean): Expr => ({ t: 'bool', v });

describe('[TDS-14.1] expression evaluation', () => {
  it('[TDS-14.1] boolean operators short-circuit', () => {
    let called = false;
    const ctx = context(() => {
      called = true;
      throw new Error('query should not run');
    });
    const expr: Expr = {
      t: 'all',
      args: [
        bool(false),
        { t: 'query', query: { name: 'population_count', args: {}, subject: 'x' } },
      ],
    };
    expect(evaluate(expr, ctx)).toBe(false);
    expect(called).toBe(false);
  });

  it('[TDS-14.1] division floors and guards zero', () => {
    const ctx = context(() => 0);
    expect(evaluate({ t: 'arith', op: 'div', args: [int(7), int(2)] }, ctx)).toBe(3);
    expect(evaluate({ t: 'arith', op: 'div', args: [int(1), int(0)] }, ctx)).toBe(0);
  });

  it('[TDS-14.1] clamp bounds the value', () => {
    const ctx = context(() => 0);
    expect(evaluate({ t: 'clamp', v: int(1500), lo: int(0), hi: int(1000) }, ctx)).toBe(1000);
  });

  it('[TDS-14.1] a domain query is resolved through the context', () => {
    const ctx = context(() => 42);
    expect(
      evaluate({ t: 'query', query: { name: 'population_count', args: {}, subject: 'x' } }, ctx),
    ).toBe(42);
  });
});

describe('[CONT-7.2][TDS-14.2] query table', () => {
  it('[CONT-7.2] a known query is recognised', () => {
    expect(isKnownQuery('aggregate_need_fulfillment')).toBe(true);
    expect(QUERY_TABLE).toContain('population_count');
  });
});
