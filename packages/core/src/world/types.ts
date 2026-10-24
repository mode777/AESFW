/**
 * The authoritative `World` record (TDS-8.1). Every field except `caches` is
 * authoritative: it is saved and hashed. Authoritative collections are plain
 * arrays with a documented order (TDS-9.4); fields owned by later roadmap rows
 * are present as empty containers whose value types those rows refine.
 *
 * Source: TDS-8.1, TDS-8.4, ARCH-4.2
 */
import type { JsonValue, RngStream, Seed } from '../det/index.js';
import type { Command } from '../commands/types.js';
import type { Int } from '../fx/index.js';
import type {
  DefinitionHandle,
  EntityId,
  OwnerHandle,
  ReservationId,
  StringId,
  Tick,
} from '../ids/index.js';
import type { ComponentStores } from './component-store.js';
import type { ConnectivityCache } from '../sim/connectivity.js';
import type { SpatialCache } from '../sim/spatial.js';

/** Current world format version (TDS-8.1). */
export const WORLD_FORMAT_VERSION = 1 as const;

/** Transaction purposes (TDS-12.1). */
export type Purpose =
  | 'production_input'
  | 'population_need'
  | 'construction'
  | 'population_transition'
  | 'transport_load'
  | 'exchange_sale'
  | 'maintenance'
  | 'establishment';

/** A named random stream (TDS-15). */
export interface NamedRngStream {
  readonly name: string;
  readonly stream: RngStream;
}

/** The seed and derived stream states (TDS-8.1, TDS-15). */
export interface RngStreams {
  readonly seed: Seed;
  /** Sorted by ascending stream name. */
  readonly streams: readonly NamedRngStream[];
}

/** Owner knowledge of a location (TDS-8.1, GDD-16.1). */
export type KnowledgeLevel = 'unknown' | 'discovered' | 'established';

/** A knowledge entry, ordered by ascending location ID. */
export interface KnowledgeEntry {
  readonly location: EntityId;
  readonly level: KnowledgeLevel;
}

/** An owner account entry, ordered by ascending resource handle. */
export interface AccountEntry {
  readonly resource: DefinitionHandle;
  readonly amount: Int;
}

/** A purpose lock (TDS-12.3). */
export interface PurposeLock {
  readonly inventory: EntityId;
  readonly resource: DefinitionHandle;
  readonly purpose: Purpose;
}

/** Per-owner state (TDS-8.1). */
export interface OwnerState {
  readonly handle: OwnerHandle;
  readonly knowledge: readonly KnowledgeEntry[];
  readonly accounts: readonly AccountEntry[];
  readonly purposeLocks: readonly PurposeLock[];
  readonly unlocks: readonly StringId[];
  readonly deficitPaused: readonly EntityId[];
}

/** Owners, indexed by ascending `OwnerHandle`. */
export interface OwnerTable {
  readonly owners: readonly OwnerState[];
}

/** An active reservation (TDS-12.1, TDS-12.3). `capacity` is true for an
 * output-capacity reservation (GDD-8.4), false for a quantity reservation. */
export interface Reservation {
  readonly id: ReservationId;
  readonly inventory: EntityId;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly purpose: Purpose;
  readonly holder: EntityId;
  readonly expiryTick: Tick | null;
  readonly capacity: boolean;
}

/** The reservation ledger, ordered by ascending reservation ID. */
export interface ReservationLedger {
  readonly reservations: readonly Reservation[];
}

/** A rate accumulator carry (TDS-6.4). */
export interface AccumulatorEntry {
  readonly subject: EntityId;
  readonly purpose: Purpose;
  readonly resource: DefinitionHandle;
  readonly carry: Int;
}

/** Accumulators, ordered by `(subject, purpose, resource)`. */
export interface AccumulatorTable {
  readonly entries: readonly AccumulatorEntry[];
}

/** A sustained-condition timer (TDS-14.3). */
export interface SustainedTimer {
  readonly condition: DefinitionHandle;
  readonly slot: number;
  readonly subject: EntityId;
  readonly consecutiveTrueTicks: Int;
}

/** Timers, ordered by `(condition, slot, subject)`. */
export interface SustainedTimerTable {
  readonly timers: readonly SustainedTimer[];
}

/** One dated volume entry of an exchange's rolling window, ascending by tick (GDD-17.3). */
export interface VolumeEntry {
  readonly tick: Tick;
  readonly quantity: Int;
}

/** Exchange price state (02 §14.5). */
export interface ExchangePrice {
  readonly exchange: EntityId;
  readonly resource: DefinitionHandle;
  readonly buy: Int;
  readonly sell: Int;
  /** Per-tick sold quantity inside the elasticity window, ascending by tick. */
  readonly soldVolume: readonly VolumeEntry[];
  /** Per-tick bought quantity inside the elasticity window, ascending by tick. */
  readonly boughtVolume: readonly VolumeEntry[];
}

/** Exchange prices, ordered by `(exchange, resource)`. */
export interface ExchangePriceTable {
  readonly prices: readonly ExchangePrice[];
}

/**
 * An accepted future command (TDS-16.2). The `command` payload is the internal
 * `Command` union.
 */
export interface ScheduledCommand {
  readonly commandId: string;
  readonly actor: OwnerHandle;
  readonly tick: Tick;
  readonly seq: number;
  readonly command: Command;
}

/** Optional-module state (02 §15.2). */
export interface ModuleState {
  readonly enabled: readonly StringId[];
  readonly data: readonly { readonly module: StringId; readonly value: JsonValue }[];
}

/** A metric window (TDS-8.1). */
export interface MetricWindow {
  readonly subject: EntityId;
  readonly purpose: Purpose;
  readonly resource: DefinitionHandle;
  readonly window: readonly Int[];
}

/** Metric windows, ordered by `(subject, purpose, resource)`. */
export interface MetricWindows {
  readonly windows: readonly MetricWindow[];
}

/**
 * Derived caches (TDS-8.4). Never saved and never hashed; `dirty` signals that
 * a cache must be rebuilt in phase 04, and `decodeWorld`/`cloneWorld` leave
 * every cache dirty.
 */
export interface DerivedCaches {
  spatial: SpatialCache | undefined;
  connectivity: ConnectivityCache | undefined;
  tags: unknown;
  routes: unknown;
  dirty: boolean;
}

/** The authoritative world record (TDS-8.1). */
export interface World {
  readonly formatVersion: typeof WORLD_FORMAT_VERSION;
  tick: Tick;
  nextEntityId: EntityId;
  nextReservationId: ReservationId;
  rng: RngStreams;
  owners: OwnerTable;
  stores: ComponentStores;
  ledger: ReservationLedger;
  accumulators: AccumulatorTable;
  timers: SustainedTimerTable;
  exchanges: ExchangePriceTable;
  commandQueue: ScheduledCommand[];
  modules: ModuleState;
  metrics: MetricWindows;
  caches: DerivedCaches;
}

/** Session setup passed to `createWorld` (TDS-10.1). */
export interface WorldSetup {
  readonly seed: Seed;
  readonly tickDurationMs: number;
  readonly world: StringId | null;
  readonly enabledModules: readonly StringId[];
}
