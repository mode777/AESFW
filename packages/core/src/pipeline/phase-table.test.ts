import { describe, expect, it } from 'vitest';
import { phaseTable } from './phase-table.js';

const EXPECTED_NAMES = [
  'applyCommands',
  'applyModuleEffects',
  'resolveLifecycleAndConstruction',
  'rebuildSpatialCaches',
  'rebuildCapabilitySupply',
  'allocateCapabilities',
  'evaluatePreconditions',
  'calculatePopulationDemand',
  'collectThroughputRequests',
  'allocateThroughput',
  'reserveProductionIO',
  'advanceProcesses',
  'commitProduction',
  'planInternalLogistics',
  'advanceInternalLogistics',
  'advanceTransport',
  'executeTrades',
  'resolveArrivals',
  'commitTransport',
  'allocateServicesAndConsumeNeeds',
  'updateNeedsAndSatisfaction',
  'updateTimersAndBands',
  'updatePopulation',
  'advanceTransitions',
  'evaluateUnlocks',
  'applyContinuousOutputsAndMaintenance',
  'applyDeficitPolicy',
  'recoverExchangePrices',
  'evaluateModuleConditions',
  'finalizeLifecycle',
  'recordMetricsAndHash',
];

describe('[TDS-11.1][ARCH-5.2] phase table', () => {
  it('[TDS-11.1] the phase table lists phases 1 to 31 in order', () => {
    expect(phaseTable.map((descriptor) => descriptor.phase)).toEqual(
      Array.from({ length: 31 }, (_, index) => index + 1),
    );
    expect(phaseTable.map((descriptor) => descriptor.name)).toEqual(EXPECTED_NAMES);
  });

  it('[TDS-11.1] phases 32 and 33 are not system modules', () => {
    const phases = new Set<number>(phaseTable.map((descriptor) => descriptor.phase));
    expect(phases.has(32)).toBe(false);
    expect(phases.has(33)).toBe(false);
  });
});
