/**
 * Public entry point of `@aesfw/core`, the simulation kernel.
 *
 * `fx` (checked fixed-point arithmetic) and the invariant-violation error
 * types are delivered by roadmap row 0.3; `det` (canonical JSON, hashing,
 * RNG, ordering), branded identifiers, and `Result` by row 0.4. World state
 * (0.5) and the tick pipeline (0.6) follow.
 */
export const CORE_PACKAGE_ID = '@aesfw/core' as const;

export * as fx from './fx/index.js';
export * as det from './det/index.js';
export * as ids from './ids/index.js';
export type {
  DefinitionHandle,
  EntityId,
  OwnerHandle,
  ReservationId,
  StringId,
  Tick,
} from './ids/index.js';
export * as world from './world/index.js';
export * as tx from './tx/index.js';
export {
  createWorld,
  allocateEntity,
  allocateReservation,
  cloneWorld,
  encodeWorld,
  decodeWorld,
  hashWorld,
  entityExists,
  readWorld,
} from './world/index.js';
export type { WorldReader } from './world/index.js';
export type {
  CanonicalState,
  ComponentKind,
  ComponentStore,
  ComponentStores,
  DerivedCaches,
  OwnerState,
  OwnerTable,
  Purpose,
  Reservation,
  ScheduledCommand,
  StateHash,
  World,
  WorldSetup,
} from './world/index.js';
export { step } from './pipeline/step.js';
export { PHASE_TABLE, phaseTable } from './pipeline/phase-table.js';
export type {
  CommandOutcome,
  DomainEvent,
  EventWriter,
  PhaseId,
  PolicySet,
  StoreKey,
  SystemDescriptor,
  TickContext,
  TickInput,
  TickMetrics,
  TickOutput,
  TickScratch,
  AtomicBuilder,
  Transaction,
  TransactionWriter,
  TxError,
} from './pipeline/index.js';
export { createTransactionWriter, releaseExpiredReservations } from './tx/index.js';
export type {
  Inventory,
  InventoryAcceptance,
  InventoryCapacity,
  InventoryEntry,
  Reason,
  TxEnvironment,
} from './tx/index.js';
export {
  ABSTRACT_CAPACITY_POLICY_ID,
  abstractCapacityPolicy,
  resolveSpatialPolicy,
} from './policies/spatial/index.js';
export type { CapacitySummary, PlacementResult, SpatialPolicy } from './policies/spatial/index.js';
export {
  SHARED_LOCATION_POLICY_ID,
  resolveInventoryAccessPolicy,
  sharedLocationPolicy,
} from './policies/inventory-access/index.js';
export type { InventoryAccessPolicy } from './policies/inventory-access/index.js';
export { locationOf, locationHubOf } from './sim/location.js';
export type { Location, LocationHub, LocationProperty } from './sim/location.js';
export { instantiateWorld } from './sim/instantiate.js';
export type { InventoryPlan, LocationPlan, WorldPlan } from './sim/instantiate.js';
export {
  allocateCapabilities,
  allocateModel,
  buildCapabilitySupply,
  poolKey,
} from './sim/capabilities/index.js';
export type {
  AllocationModel,
  CapabilityAllocation,
  CapabilityConsumer,
  CapabilityPool,
  CapabilityProvider,
  CapabilityRequest,
  CapabilityScope,
  CapabilitySupply,
} from './sim/capabilities/index.js';
export {
  PENDING_OUTPUT_KEY,
  advanceProcesses,
  advanceSource,
  commitProduction,
  effectiveDuration,
  evaluatePreconditions,
  planInputs,
  planOutputs,
  recipeOf,
  reserveProductionIO,
  staticBlockReasons,
} from './sim/production/index.js';
export type {
  BlockReason,
  ItemAmount,
  Producer,
  ProducerState,
  RecipeMode,
  RecipeSpec,
  ResourceSource,
  SourceOutput,
} from './sim/production/index.js';
export { applyPopulationOutputs, readCarry, writeCarry } from './sim/population/index.js';
export { isPopulationGroup, isResidence, updatePopulation } from './sim/population/index.js';
export type { PopulationGroup, PopulationOutput, Residence } from './sim/population/index.js';
export type { Growth, GrowthCondition, GrowthStep } from './sim/population/index.js';
export { calculatePopulationDemand, deliverNeeds, updateSatisfaction } from './sim/needs/index.js';
export type {
  CategoryMember,
  CategoryMode,
  CategoryResult,
  CategorySpec,
  NeedRuntime,
  NeedSpec,
  NeedStates,
  NeedType,
  Satisfaction,
  SatisfactionAggregation,
} from './sim/needs/index.js';
export { InvariantViolation, ArithmeticOverflow } from './errors/invariant-violation.js';
export type { Diagnostic } from './errors/diagnostic.js';
export { ERROR_CODES } from './errors/codes.js';
export type { ErrorCode, ErrorCodeSpec } from './errors/codes.js';
export { compareScheduledCommands } from './commands/index.js';
export type { Command, CommandError, CommandType } from './commands/index.js';
export { createEmptyRegistry } from './registry/types.js';
export type { DefinitionType, Registry } from './registry/types.js';
export { ok, err } from './result.js';
export type { Result } from './result.js';
