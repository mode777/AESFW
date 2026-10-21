import { describe, expect, it } from 'vitest';
import { ArithmeticOverflow, InvariantViolation } from './invariant-violation.js';

describe('[TDS-23] invariant-violation error types', () => {
  it('[TDS-23] an InvariantViolation exposes its code and args', () => {
    const violation = new InvariantViolation('demo_failure', { entity: 7 });
    expect(violation).toBeInstanceOf(Error);
    expect(violation.code).toBe('demo_failure');
    expect(violation.args).toEqual({ entity: 7 });
  });

  it('[TDS-23] an ArithmeticOverflow reports code arithmetic_overflow', () => {
    const overflow = new ArithmeticOverflow('add', { a: 1, b: 2 });
    expect(overflow).toBeInstanceOf(InvariantViolation);
    expect(overflow.code).toBe('arithmetic_overflow');
    expect(overflow.args).toEqual({ operation: 'add', a: 1, b: 2 });
  });
});
