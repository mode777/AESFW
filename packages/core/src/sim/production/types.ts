/**
 * Production component shapes (GDD-9.4, GDD-9.5, GDD-10.1). Recipe
 * specifications are resolved content data stored on the component, so the core
 * systems stay content-free (TDS-4.3).
 *
 * Source: GDD-9.4, GDD-9.5, GDD-10.1
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, ReservationId, StringId } from '../../ids/index.js';
import type { World } from '../../world/types.js';

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
  | 'location_inactive'
  | 'no_source_slot'
  | 'no_working_area';

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

/** A resource-source policy (GDD-9.5). */
export type SourcePolicy =
  | 'infinite_rate'
  | 'finite_deposit'
  | 'regenerating_deposit'
  | 'slot_dependent'
  | 'area_dependent'
  | 'condition_dependent';

/** A resource-source output line (GDD-9.5). */
export type SourceOutput = {
  readonly resource: DefinitionHandle;
  readonly rate: Int;
  readonly remaining: Int | null;
  /** The per-tick replenishment of a regenerating deposit. */
  readonly regeneration?: Int;
  /** The upper bound of a regenerating deposit's remaining amount. */
  readonly maximum?: Int;
};

/** A resource-source component (GDD-9.5). Every field beyond the base shape is
 * optional and present only when the policy needs it, so the encoded form of an
 * `infinite_rate` or `finite_deposit` source is unchanged. */
export type ResourceSource = {
  readonly policy: SourcePolicy;
  readonly location: EntityId | null;
  readonly inventory: EntityId | null;
  readonly outputs: readonly SourceOutput[];
  /** The referenced location property for an `area_dependent` source. */
  readonly scaleByProperty?: StringId;
  /** The required slot type for a `slot_dependent` source. */
  readonly slotType?: StringId;
  /** The working-area cell count for an `area_dependent` source. */
  readonly workingAreaCells?: Int;
  /** Whether the working-area claim is exclusive. */
  readonly workingAreaExclusive?: boolean;
  /** The condition of a `condition_dependent` source. */
  readonly condition?: DefinitionHandle;
  /** Present only when non-empty; a source is blocked iff it carries reasons. */
  readonly blockReasons?: readonly BlockReason[];
};

/** A source's binding to one location slot (GDD-9.5, ARCH-3.4). */
export type SourceSlotBinding = {
  readonly slotType: StringId;
  readonly location: EntityId;
};

/** A source's claim on a location working area (GDD-9.5, ARCH-3.4). */
export type WorkingAreaClaim = {
  readonly location: EntityId;
  readonly cells: Int;
  readonly exclusive: boolean;
};

/** Evaluates a source content condition against the source entity. */
export type SourceConditionEvaluator = (
  world: World,
  condition: DefinitionHandle,
  subject: EntityId,
) => boolean;

/** The scratch key holding each source's pending output for the tick. */
export const PENDING_OUTPUT_KEY = 'productionPendingOutput';
