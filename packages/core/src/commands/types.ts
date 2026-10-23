/**
 * The internal command union (TDS-16.2) and command outcomes. The four
 * lifecycle commands owned by roadmap row 2.2 and the four placement and
 * construction commands owned by row 3.3 are defined here; later rows extend
 * the union. `ScheduledCommand.command` is narrowed from `JsonValue` to
 * `Command`.
 *
 * Source: TDS-16.1, TDS-16.2, TDS-18.1, ARCH-7.3
 */
import type { Int } from '../fx/index.js';
import type { DefinitionHandle, EntityId, Tick } from '../ids/index.js';
import type { LogicalTransform } from '../sim/spatial.js';
import type { TransportOrderSpec } from '../sim/transport/types.js';

/** A scheduled command the kernel can apply (TDS-16.2). */
export type Command =
  | {
      readonly type: 'PlaceEntityPlan';
      readonly definition: DefinitionHandle;
      readonly location: EntityId;
      readonly transform: LogicalTransform;
    }
  | {
      readonly type: 'CancelEntityPlan';
      readonly entity: EntityId;
    }
  | {
      readonly type: 'CommitConstruction';
      readonly entity: EntityId;
    }
  | {
      readonly type: 'DeconstructEntity';
      readonly entity: EntityId;
    }
  | {
      readonly type: 'SetEntityEnabled';
      readonly entity: EntityId;
      readonly enabled: boolean;
    }
  | {
      readonly type: 'SelectRecipe';
      readonly entity: EntityId;
      readonly recipe: DefinitionHandle | null;
    }
  | {
      readonly type: 'SetProcessPriority';
      readonly entity: EntityId;
      readonly priority: Int;
    }
  | {
      readonly type: 'SetCapabilityPriority';
      readonly entity: EntityId;
      readonly capability: DefinitionHandle;
      readonly priority: Int;
    }
  | {
      readonly type: 'ResumeDeficitPausedEntities';
      readonly entities: readonly EntityId[] | 'all';
    }
  | {
      readonly type: 'ActivateLocation';
      readonly location: EntityId;
    }
  | {
      readonly type: 'DeactivateLocation';
      readonly location: EntityId;
    }
  | {
      readonly type: 'CreateTransportOrder';
      readonly spec: TransportOrderSpec;
    }
  | {
      readonly type: 'ModifyTransportOrder';
      readonly order: EntityId;
      readonly spec: TransportOrderSpec;
    }
  | {
      readonly type: 'DeleteTransportOrder';
      readonly order: EntityId;
    }
  | {
      readonly type: 'AssignTransport';
      readonly unit: EntityId;
      readonly order: EntityId;
    }
  | {
      readonly type: 'UnassignTransport';
      readonly unit: EntityId;
    };

/** The stable command type names (TDS-16.2). */
export type CommandType = Command['type'];

/** A machine-readable command error (TDS-16.3, 04 §13). */
export interface CommandError {
  readonly code: string;
  readonly arguments: Readonly<Record<string, string | number | boolean>>;
}

/** The outcome of one due command in phase 01 (TDS-16.1). */
export type CommandOutcome =
  | {
      readonly commandId: string;
      readonly status: 'applied';
      readonly tick: Tick;
      readonly entity: EntityId;
    }
  | {
      readonly commandId: string;
      readonly status: 'rejected';
      readonly tick: Tick;
      readonly errors: readonly CommandError[];
    };
