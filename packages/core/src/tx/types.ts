/**
 * Transaction types (TDS-12.1, TDS-12.2). Every authoritative quantity mutation
 * is one of the `Transaction` variants; the `TransactionWriter` applies them
 * through an all-or-nothing atomic composite.
 *
 * Source: TDS-12.1, TDS-12.2, ARCH-6
 */
import type { Diagnostic } from '../errors/diagnostic.js';
import type { Int } from '../fx/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle, ReservationId, Tick } from '../ids/index.js';
import type { Result } from '../result.js';
import type { Purpose, Reservation } from '../world/types.js';

/** A free-form stable tag explaining a deposit, withdrawal, or account change. */
export type Reason = string;

/** The journaled transaction union of TDS-12.1. */
export type Transaction =
  | {
      readonly kind: 'reserve';
      readonly seq: number;
      readonly reservation: ReservationId;
      readonly inventory: EntityId;
      readonly resource: DefinitionHandle;
      readonly quantity: Int;
      readonly purpose: Purpose;
      readonly holder: EntityId;
    }
  | { readonly kind: 'release'; readonly seq: number; readonly reservation: ReservationId }
  | {
      readonly kind: 'commit';
      readonly seq: number;
      readonly reservation: ReservationId;
      readonly quantity: Int;
    }
  | {
      readonly kind: 'deposit';
      readonly seq: number;
      readonly inventory: EntityId;
      readonly resource: DefinitionHandle;
      readonly quantity: Int;
      readonly source: EntityId;
      readonly reason: Reason;
    }
  | {
      readonly kind: 'withdraw';
      readonly seq: number;
      readonly inventory: EntityId;
      readonly resource: DefinitionHandle;
      readonly quantity: Int;
      readonly purpose: Purpose;
      readonly sink: EntityId;
      readonly reason: Reason;
    }
  | {
      readonly kind: 'transfer';
      readonly seq: number;
      readonly from: EntityId;
      readonly to: EntityId;
      readonly resource: DefinitionHandle;
      readonly quantity: Int;
      readonly purpose: Purpose;
    }
  | {
      readonly kind: 'reserveCapacity';
      readonly seq: number;
      readonly reservation: ReservationId;
      readonly inventory: EntityId;
      readonly resource: DefinitionHandle;
      readonly quantity: Int;
      readonly holder: EntityId;
    }
  | {
      readonly kind: 'account';
      readonly seq: number;
      readonly owner: OwnerHandle;
      readonly resource: DefinitionHandle;
      readonly delta: Int;
      readonly reason: Reason;
    }
  | {
      readonly kind: 'trade';
      readonly seq: number;
      readonly exchange: EntityId;
      readonly owner: OwnerHandle;
      readonly unit: EntityId;
      readonly resource: DefinitionHandle;
      readonly quantity: Int;
      readonly price: Int;
      readonly direction: 'buy' | 'sell';
    }
  | {
      readonly kind: 'establish';
      readonly seq: number;
      readonly owner: OwnerHandle;
      readonly location: EntityId;
      readonly unit: EntityId;
      readonly hub: EntityId;
    };

/** A quantity-reservation request. */
export interface ReserveRequest {
  readonly inventory: EntityId;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly purpose: Purpose;
  readonly holder: EntityId;
  readonly expiryTick?: Tick | null;
}

/** An output-capacity reservation request. */
export interface ReserveCapacityRequest {
  readonly inventory: EntityId;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly holder: EntityId;
  readonly purpose?: Purpose;
  readonly expiryTick?: Tick | null;
}

/** A deposit request. */
export interface DepositRequest {
  readonly inventory: EntityId;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly source: EntityId;
  readonly reason?: Reason;
}

/** A withdrawal request. */
export interface WithdrawRequest {
  readonly inventory: EntityId;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly purpose: Purpose;
  readonly sink: EntityId;
  readonly reason?: Reason;
}

/** A transfer request. */
export interface TransferRequest {
  readonly from: EntityId;
  readonly to: EntityId;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly purpose: Purpose;
}

/** An owner-account change request. */
export interface AccountRequest {
  readonly owner: OwnerHandle;
  readonly resource: DefinitionHandle;
  readonly delta: Int;
  readonly reason?: Reason;
}

/** Stages operations inside an atomic composite (TDS-12.2). */
export interface AtomicBuilder {
  reserve(request: ReserveRequest): void;
  reserveCapacity(request: ReserveCapacityRequest): void;
  release(reservation: ReservationId): void;
  commit(reservation: ReservationId, quantity: Int): void;
  deposit(request: DepositRequest): void;
  withdraw(request: WithdrawRequest): void;
  transfer(request: TransferRequest): void;
  account(request: AccountRequest): void;
}

/** A transaction failure, returned as data (TDS-12.2, TDS-23). */
export type TxError = Diagnostic;

/** The environment a transaction writer validates against. */
export interface TxEnvironment {
  /** Whether a balance resource may go negative (GDD-7.5); default never. */
  readonly allowNegative?: (resource: DefinitionHandle) => boolean;
}

/** The only way to mutate authoritative quantities (TDS-12). */
export interface TransactionWriter {
  atomic(build: (builder: AtomicBuilder) => void): Result<void, TxError>;
  reserve(request: ReserveRequest): Result<Reservation, TxError>;
  reserveCapacity(request: ReserveCapacityRequest): Result<Reservation, TxError>;
  release(reservation: ReservationId): Result<void, TxError>;
}
