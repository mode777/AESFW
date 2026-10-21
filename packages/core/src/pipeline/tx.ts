/**
 * The not-yet-implemented transaction writer (TDS-12.2). `add-inventory-
 * transactions` (1.7) replaces this with the reservation ledger and atomic
 * composites. Until then `atomic` returns a typed `not_implemented`
 * diagnostic rather than throwing.
 *
 * Source: TDS-12.2
 */
import { err } from '../result.js';
import type { Result } from '../result.js';
import type { TransactionWriter, TxError } from './types.js';

const notImplemented = (): Result<void, TxError> =>
  err({
    code: 'not_implemented',
    severity: 'error',
    package: null,
    file: null,
    path: null,
    definition: null,
    args: { feature: 'transactions' },
  });

/** Creates the placeholder transaction writer used before 1.7. */
export function createUnsupportedTransactionWriter(): TransactionWriter {
  return { atomic: () => notImplemented() };
}
