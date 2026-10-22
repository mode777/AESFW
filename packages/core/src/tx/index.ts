/**
 * `tx` — the transaction engine (TDS-12): the inventory runtime shape, the
 * reservation ledger, the transaction union, the atomic builder, and expired
 * reservation release.
 *
 * Source: TDS-12, ARCH-6
 */
export { accepts, quantityOf } from './inventory.js';
export type {
  Inventory,
  InventoryAcceptance,
  InventoryCapacity,
  InventoryEntry,
} from './inventory.js';
export {
  capacityReserved,
  capacityReservedTotal,
  findReservation,
  quantityReserved,
} from './ledger.js';
export { createTransactionWriter } from './builder.js';
export { releaseExpiredReservations } from './expire.js';
export { resourceAllowsNegative, txEnvironmentFor } from './environment.js';
export type {
  AccountRequest,
  AtomicBuilder,
  DepositRequest,
  Reason,
  ReserveCapacityRequest,
  ReserveRequest,
  Transaction,
  TransactionWriter,
  TransferRequest,
  TxEnvironment,
  TxError,
  WithdrawRequest,
} from './types.js';
