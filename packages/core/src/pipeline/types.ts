/**
 * The tick pipeline system contract (TDS-11). A `SystemDescriptor` declares
 * its phase, name, and the stores it reads and writes; a `TickContext` is the
 * per-run view a system receives. Phases 32 and 33 are pipeline and
 * application responsibilities and are not system modules (TDS-11.1).
 *
 * Source: TDS-10.1, TDS-11.1, TDS-11.2, TDS-11.3
 */
import type { JsonValue } from '../det/index.js';
import type { DomainEvent, EventWriter } from '../events/event-writer.js';
import type { Tick } from '../ids/index.js';
import type { Registry } from '../registry/types.js';
import type { AtomicBuilder, Transaction, TransactionWriter, TxError } from '../tx/index.js';
import type { StateHash } from '../world/codec.js';
import type { ComponentKind, ComponentStores } from '../world/component-store.js';
import type { PlacementConditionEvaluator } from '../sim/placement/types.js';
import type { ScheduledCommand, World } from '../world/types.js';

/** The system phases 01–31 of TDS-11.1. */
export type PhaseId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31;

/** World-level authoritative stores that a system may declare (TDS-11.2). */
export type WorldStoreKey =
  | 'rng'
  | 'owners'
  | 'ledger'
  | 'accumulators'
  | 'timers'
  | 'exchanges'
  | 'commandQueue'
  | 'modules'
  | 'metrics';

/** A store a system can read or write. */
export type StoreKey = ComponentKind | WorldStoreKey;

/** Per-tick scratch buffers, reset each tick and never saved (TDS-11.2). */
export interface TickScratch {
  readonly values: Map<string, unknown>;
}

/** Resolved policy implementations (TDS-13); empty until the policy rows. */
export type PolicySet = Readonly<Record<string, never>>;

/**
 * Updates sustained-condition timers for one tick (TDS-14.3, design D4).
 * `@aesfw/content` builds the implementation from compiled content; core
 * cannot interpret compiled expressions.
 */
export type SustainedTimerUpdater = (ctx: TickContext) => void;

/** Re-exported transaction types (TDS-12); implemented by `../tx`. */
export type { AtomicBuilder, Transaction, TransactionWriter, TxError };

/** The per-run view a system receives (TDS-11.2). */
export interface TickContext {
  readonly tick: Tick;
  readonly registry: Registry;
  readonly world: World;
  readonly tx: TransactionWriter;
  readonly events: EventWriter;
  readonly scratch: TickScratch;
  readonly policies: PolicySet;
  /** Evaluates placement content conditions (design D4). */
  readonly conditionEvaluator: PlacementConditionEvaluator;
  /** Updates sustained timers in phase 22 (TDS-14.3, design D4). */
  readonly sustainedTimerUpdater: SustainedTimerUpdater;
}

/** A registered system (TDS-11.2). */
export interface SystemDescriptor {
  readonly phase: PhaseId;
  readonly name: string;
  readonly reads: readonly StoreKey[];
  readonly writes: readonly StoreKey[];
  readonly run: (ctx: TickContext) => void;
}

/** Alias of `SystemDescriptor` used by the test API (TDS-10.3). */
export type PhaseDescriptor = SystemDescriptor;

/** A command outcome (TDS-16). */
export type { CommandOutcome } from '../commands/types.js';
import type { CommandOutcome } from '../commands/types.js';

/** Tick metrics (TDS-5.4); populated by later metric rows. */
export type TickMetrics = { readonly [key: string]: JsonValue };

/** Input to one tick (TDS-10.1). */
export interface TickInput {
  readonly commands: readonly ScheduledCommand[];
  readonly options: { readonly journal: boolean; readonly hash: boolean };
  /** Optional placement-condition evaluator (design D4). Defaults to `true`. */
  readonly conditionEvaluator?: PlacementConditionEvaluator;
  /** Optional sustained-timer updater (TDS-14.3, design D4). Defaults to no-op. */
  readonly sustainedTimerUpdater?: SustainedTimerUpdater;
}

/** Output of one tick (TDS-10.1). */
export interface TickOutput {
  readonly world: World;
  readonly tick: Tick;
  readonly events: readonly DomainEvent[];
  readonly outcomes: readonly CommandOutcome[];
  readonly journal: readonly Transaction[] | null;
  readonly hash: StateHash | null;
  readonly metrics: TickMetrics;
}

/** The full store container as seen by a system. */
export type SystemStores = ComponentStores;
