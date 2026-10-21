/**
 * The phase table (TDS-11.1). Exactly one `SystemDescriptor` per phase 01–31,
 * in canonical ascending order. Phases 32 (event ordering) and 33 (snapshot
 * publication) are pipeline and application responsibilities and are not system
 * modules.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import {
  phase01ApplyCommands,
  phase02ApplyModuleEffects,
  phase03ResolveLifecycleAndConstruction,
  phase04RebuildSpatialCaches,
  phase05RebuildCapabilitySupply,
  phase06AllocateCapabilities,
  phase07EvaluatePreconditions,
  phase08CalculatePopulationDemand,
  phase09CollectThroughputRequests,
  phase10AllocateThroughput,
  phase11ReserveProductionIO,
  phase12AdvanceProcesses,
  phase13CommitProduction,
  phase14PlanInternalLogistics,
  phase15AdvanceInternalLogistics,
  phase16AdvanceTransport,
  phase17ExecuteTrades,
  phase18ResolveArrivals,
  phase19CommitTransport,
  phase20AllocateServicesAndConsumeNeeds,
  phase21UpdateNeedsAndSatisfaction,
  phase22UpdateTimersAndBands,
  phase23UpdatePopulation,
  phase24AdvanceTransitions,
  phase25EvaluateUnlocks,
  phase26ApplyContinuousOutputsAndMaintenance,
  phase27ApplyDeficitPolicy,
  phase28RecoverExchangePrices,
  phase29EvaluateModuleConditions,
  phase30FinalizeLifecycle,
  phase31RecordMetricsAndHash,
} from '../systems/index.js';
import type { PhaseDescriptor } from './types.js';

/** The 31 system descriptors in canonical phase order (TDS-11.1). */
export const PHASE_TABLE: readonly PhaseDescriptor[] = Object.freeze([
  phase01ApplyCommands,
  phase02ApplyModuleEffects,
  phase03ResolveLifecycleAndConstruction,
  phase04RebuildSpatialCaches,
  phase05RebuildCapabilitySupply,
  phase06AllocateCapabilities,
  phase07EvaluatePreconditions,
  phase08CalculatePopulationDemand,
  phase09CollectThroughputRequests,
  phase10AllocateThroughput,
  phase11ReserveProductionIO,
  phase12AdvanceProcesses,
  phase13CommitProduction,
  phase14PlanInternalLogistics,
  phase15AdvanceInternalLogistics,
  phase16AdvanceTransport,
  phase17ExecuteTrades,
  phase18ResolveArrivals,
  phase19CommitTransport,
  phase20AllocateServicesAndConsumeNeeds,
  phase21UpdateNeedsAndSatisfaction,
  phase22UpdateTimersAndBands,
  phase23UpdatePopulation,
  phase24AdvanceTransitions,
  phase25EvaluateUnlocks,
  phase26ApplyContinuousOutputsAndMaintenance,
  phase27ApplyDeficitPolicy,
  phase28RecoverExchangePrices,
  phase29EvaluateModuleConditions,
  phase30FinalizeLifecycle,
  phase31RecordMetricsAndHash,
]);

/** The phase table exposed to tests (TDS-10.3). */
export const phaseTable: readonly PhaseDescriptor[] = PHASE_TABLE;
