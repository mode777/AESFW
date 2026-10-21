/**
 * Population component shapes (GDD-11.1, GDD-11.2). Residences hold an
 * aggregate population group; resolved tier outputs are stored on the
 * residence so the core stays content-free (TDS-4.3).
 *
 * Source: GDD-11.1, GDD-11.2
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { CapabilityScope } from '../capabilities/index.js';

/** A resolved population output. */
export type PopulationOutput = {
  readonly resource: DefinitionHandle;
  readonly ratePerPopulationPerTick: Int;
  readonly scope: CapabilityScope;
  readonly satisfactionCurve: DefinitionHandle | null;
};

/** A residence component. */
export type Residence = {
  readonly tier: DefinitionHandle;
  readonly capacity: Int;
  readonly location: EntityId | null;
  readonly growthPolicy: DefinitionHandle | null;
  readonly consumptionFactor: Int;
  readonly outputs: readonly PopulationOutput[];
};

/** A population group component. */
export type PopulationGroup = {
  readonly tier: DefinitionHandle;
  readonly count: Int;
  readonly capacity: Int;
};

/** True when `value` is a residence component. */
export function isResidence(value: unknown): value is Residence {
  return typeof value === 'object' && value !== null && Array.isArray((value as Residence).outputs);
}

/** True when `value` is a population-group component. */
export function isPopulationGroup(value: unknown): value is PopulationGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PopulationGroup).count === 'number'
  );
}
