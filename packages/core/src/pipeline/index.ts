/**
 * `pipeline` — the fixed tick pipeline (TDS-11): the phase table, the system
 * contract, `step`/`runPhases`, and write-set enforcement.
 *
 * Source: TDS-10, TDS-11, ARCH-5
 */
export { PHASE_TABLE, phaseTable } from './phase-table.js';
export { step, runPhases, runSystem } from './step.js';
export { guardStores } from './write-set.js';
export { createEventWriter } from '../events/event-writer.js';
export type { DomainEvent, DomainEventInput, EventWriter } from '../events/event-writer.js';
export type {
  AtomicBuilder,
  CommandOutcome,
  PhaseDescriptor,
  PhaseId,
  PolicySet,
  StoreKey,
  SustainedTimerUpdater,
  EstablishmentSystem,
  UnlockSystem,
  SystemDescriptor,
  SystemStores,
  TickContext,
  TickInput,
  TickMetrics,
  TickOutput,
  TickScratch,
  Transaction,
  TransactionWriter,
  TxError,
  WorldStoreKey,
} from './types.js';
