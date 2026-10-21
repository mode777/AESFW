/**
 * Invariant violations (TDS-23). An `InvariantViolation` signals a framework
 * or content defect, not an expected domain outcome: pure packages never throw
 * for expected outcomes, and hosts stop the clock when one escapes. Error
 * codes are stable `snake_case` identifiers; command-rejection codes of
 * TDS-16.3 are a separate registry owned by the application layer.
 *
 * Source: TDS-23
 */
export class InvariantViolation extends Error {
  /** Stable `snake_case` code identifying the violated invariant. */
  readonly code: string;

  /** Structured arguments describing the violation (integers and strings). */
  readonly args: Readonly<Record<string, unknown>>;

  constructor(code: string, args: Readonly<Record<string, unknown>> = {}) {
    super(`InvariantViolation: ${code}`);
    this.name = 'InvariantViolation';
    this.code = code;
    this.args = args;
  }
}

/**
 * Thrown when an authoritative arithmetic result is not a safe integer
 * (TDS-6.1, TDS-6.2). An overflow is a framework or content defect, not a
 * game state.
 *
 * Source: TDS-6.2, TDS-23
 */
export class ArithmeticOverflow extends InvariantViolation {
  constructor(operation: string, args: Readonly<Record<string, unknown>> = {}) {
    super('arithmetic_overflow', { operation, ...args });
    this.name = 'ArithmeticOverflow';
  }
}
