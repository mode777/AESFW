/**
 * Production component shapes (GDD-9.4, GDD-9.5, GDD-10.1). Recipe
 * specifications are resolved content data stored on the component, so the core
 * systems stay content-free (TDS-4.3).
 *
 * Source: GDD-9.4, GDD-9.5, GDD-10.1
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, ReservationId } from '../../ids/index.js';

/** A resource amount. */
export type ItemAmount = {
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
};

/** The recipe mode (GDD-10.4). */
export type RecipeMode = 'batch' | 'continuous';

/** A resolved recipe specification. */
export type RecipeSpec = {
  readonly recipe: DefinitionHandle;
  readonly mode: RecipeMode;
  readonly duration: Int;
  readonly inputs: readonly ItemAmount[];
  readonly outputs: readonly ItemAmount[];
  readonly capabilities: readonly ItemAmount[];
  readonly condition: DefinitionHandle | null;
};

/** A machine-readable production block reason (GDD-10.3). */
export type BlockReason =
  | 'entity_disabled'
  | 'paused_by_deficit'
  | 'invalid_recipe'
  | 'condition_false'
  | 'missing_input'
  | 'missing_capability'
  | 'missing_inventory_access'
  | 'missing_output_capacity'
  | 'throughput_throttled'
  | 'location_inactive';

/** A producer's state (GDD-10.2). */
export type ProducerState = 'idle' | 'processing' | 'blocked';

/** A producer component. */
export type Producer = {
  readonly recipes: readonly RecipeSpec[];
  readonly recipe: DefinitionHandle | null;
  readonly processSlots: number;
  readonly location: EntityId | null;
  readonly inputInventory: EntityId | null;
  readonly outputInventory: EntityId | null;
  readonly state: ProducerState;
  readonly blockReasons: readonly BlockReason[];
  readonly progress: Int;
  readonly processPriority?: Int;
  readonly inputReservations: readonly ReservationId[];
  readonly capacityReservations: readonly ReservationId[];
};

/** A resource-source output line. */
export type SourceOutput = {
  readonly resource: DefinitionHandle;
  readonly rate: Int;
  readonly remaining: Int | null;
};

/** A resource-source component (GDD-9.5). */
export type ResourceSource = {
  readonly policy: 'infinite_rate' | 'finite_deposit';
  readonly location: EntityId | null;
  readonly inventory: EntityId | null;
  readonly outputs: readonly SourceOutput[];
};

/** The scratch key holding each source's pending output for the tick. */
export const PENDING_OUTPUT_KEY = 'productionPendingOutput';
