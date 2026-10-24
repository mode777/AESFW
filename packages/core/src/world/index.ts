/**
 * `world` — the authoritative world state model (TDS-8): the `World` record,
 * component stores, allocators, and encode/decode/clone/hash.
 *
 * Source: TDS-8, ARCH-3, ARCH-4.2
 */
export { COMPONENT_KINDS, createComponentStore, createComponentStores } from './component-store.js';
export type { ComponentKind, ComponentStore, ComponentStores } from './component-store.js';
export { WORLD_FORMAT_VERSION } from './types.js';
export type {
  AccumulatorEntry,
  AccumulatorTable,
  AccountEntry,
  DerivedCaches,
  ExchangePrice,
  ExchangePriceTable,
  KnowledgeEntry,
  KnowledgeLevel,
  MetricWindow,
  MetricWindows,
  ModuleState,
  NamedRngStream,
  OwnerState,
  OwnerTable,
  Purpose,
  PurposeLock,
  Reservation,
  ReservationLedger,
  RngStreams,
  ScheduledCommand,
  SustainedTimer,
  SustainedTimerTable,
  VolumeEntry,
  World,
  WorldSetup,
} from './types.js';
export { allocateEntity, allocateReservation, createWorld } from './create.js';
export { entityExists } from './exists.js';
export { readWorld } from './reader.js';
export type { WorldReader } from './reader.js';
export { cloneWorld, decodeWorld, encodeWorld, hashWorld } from './codec.js';
export type { CanonicalState, StateHash } from './codec.js';
