/**
 * Maintenance types (GDD-20.1). The component shape of the `maintenance`
 * store: interval, input lines, charge and shortage policies, and the arrears
 * accumulated by the `accumulate_debt` shortage policy.
 *
 * Source: GDD-20.1, CONT-6.8
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle } from '../../ids/index.js';

/** A charge policy (GDD-20.1). */
export type ChargePolicy = 'while_exists' | 'while_enabled' | 'while_active' | 'while_processing';

/** A shortage policy (GDD-20.1). `trigger_transition` is rejected at validation. */
export type ShortagePolicy =
  | 'deactivate_entity'
  | 'scale'
  | 'accumulate_debt'
  | 'ignore'
  | 'owner_deficit_policy'
  | 'trigger_transition';

/** One maintenance input line. */
export type MaintenanceInput = {
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
};

/** The entity maintenance component. */
export type Maintenance = {
  readonly intervalTicks: Int;
  readonly inputs: readonly MaintenanceInput[];
  readonly chargePolicy: ChargePolicy;
  readonly shortagePolicy: ShortagePolicy;
  /** Unpaid due amounts per resource, charged on top of the next interval. */
  readonly arrears: readonly MaintenanceInput[];
};
