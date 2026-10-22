/**
 * Entity maintenance (GDD-4.8, GDD-20.1). Phase 26 charges every
 * maintenance-bearing entity on its interval boundary through the owner's
 * account; shortage policies decide the outcome of an unpayable charge.
 * Entities paused by the deficit policy pay no maintenance under every
 * policy (INV-11).
 *
 * Source: GDD-4.8, GDD-20.1, GDD-20.2, ARCH-5.2 (phase 26)
 */
import { InvariantViolation } from '../../errors/invariant-violation.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle, Tick } from '../../ids/index.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { lifecycleOf } from '../construction/lifecycle.js';
import type { Producer } from '../production/types.js';
import type { Maintenance, MaintenanceInput } from './types.js';

/** The account reason on every maintenance charge. */
const MAINTENANCE_REASON = 'maintenance';

/** Lifecycle states in which an entity exists operationally (charges may apply). */
const OPERATIONAL = new Set(['active', 'disabled', 'blocked']);

const isDeficitPaused = (world: World, entity: EntityId): boolean =>
  world.owners.owners.some((entry) => entry.deficitPaused.includes(entity));

const ownerComponentOf = (world: World, entity: EntityId): OwnerHandle | null =>
  world.stores.get<{ owner: OwnerHandle }>('owner').get(entity)?.owner ?? null;

const producerOf = (world: World, entity: EntityId): Producer | null =>
  world.stores.get<Producer>('producer').get(entity) ?? null;

const balanceOf = (world: World, owner: OwnerHandle, resource: DefinitionHandle): Int =>
  world.owners.owners
    .find((entry) => entry.handle === owner)
    ?.accounts.find((entry) => entry.resource === resource)?.amount ?? 0;

/** True when the entity is in a state that charges under `policy` (GDD-20.1). */
export function isCharging(
  world: World,
  entity: EntityId,
  policy: Maintenance['chargePolicy'],
): boolean {
  if (isDeficitPaused(world, entity)) return false;
  const lifecycle = lifecycleOf(world, entity);
  if (lifecycle !== undefined && !OPERATIONAL.has(lifecycle)) return false;
  const producer = producerOf(world, entity);
  switch (policy) {
    case 'while_exists':
      return true;
    case 'while_enabled':
      if (lifecycle === 'disabled') return false;
      return world.stores.get<{ enabled: boolean }>('enabled').get(entity)?.enabled !== false;
    case 'while_active':
      if (lifecycle === 'blocked') return false;
      return producer === null || producer.state !== 'blocked';
    case 'while_processing':
      return producer !== null && producer.state === 'processing';
  }
}

/** Merges `inputs` with accumulated `arrears`, preserving input order. */
export function dueLines(maintenance: Maintenance): readonly MaintenanceInput[] {
  const lines = maintenance.inputs.map((input) => ({ ...input }));
  for (const arrear of maintenance.arrears) {
    const line = lines.find((entry) => entry.resource === arrear.resource);
    if (line === undefined) lines.push({ ...arrear });
    else line.quantity += arrear.quantity;
  }
  return lines;
}

const clearedArrears = (
  arrears: readonly MaintenanceInput[],
  resource: DefinitionHandle,
): readonly MaintenanceInput[] => arrears.filter((line) => line.resource !== resource);

/**
 * Applies maintenance for one tick (phase 26). Entities are processed in
 * ascending entity ID; input lines in authored order.
 *
 * Source: GDD-20.1, ARCH-5.2 (phase 26)
 */
export function applyMaintenance(
  world: World,
  tick: Tick,
  tx: TransactionWriter,
  events: EventWriter,
): void {
  const store = world.stores.get<Maintenance>('maintenance');
  for (const entity of store.ids()) {
    const maintenance = store.get(entity);
    if (maintenance === undefined) continue;
    if (tick % maintenance.intervalTicks !== 0) continue;
    if (!isCharging(world, entity, maintenance.chargePolicy)) continue;
    const owner = ownerComponentOf(world, entity);
    if (owner === null) continue;
    let arrears = maintenance.arrears;
    let arrearsChanged = false;
    let disabledByShortage = false;
    for (const line of dueLines(maintenance)) {
      if (disabledByShortage) break;
      const applied = tx.atomic((builder) => {
        builder.account({
          owner,
          resource: line.resource,
          delta: -line.quantity,
          reason: MAINTENANCE_REASON,
        });
      });
      if (applied.ok) {
        const cleared = clearedArrears(arrears, line.resource);
        if (cleared.length !== arrears.length) {
          arrears = cleared;
          arrearsChanged = true;
        }
        events.emit({
          type: 'MaintenanceCharged',
          subjects: [entity],
          owner,
          location: null,
          payload: { resource: line.resource, amount: line.quantity },
        });
        continue;
      }
      if (applied.error.code !== 'insufficient_balance') {
        throw new InvariantViolation('maintenance_charge_rejected', {
          entity: String(entity),
          resource: String(line.resource),
          code: applied.error.code,
        });
      }
      const outcome = applyShortage(
        world,
        tx,
        events,
        owner,
        entity,
        line,
        maintenance.shortagePolicy,
      );
      if (outcome.accrued) {
        arrears = [
          ...arrears.filter((entry) => entry.resource !== line.resource),
          { resource: line.resource, quantity: line.quantity },
        ];
        arrearsChanged = true;
      }
      if (outcome.stop) disabledByShortage = true;
    }
    if (arrearsChanged) {
      store.set(entity, { ...maintenance, arrears });
    }
  }
}

type ShortageOutcome = { readonly accrued: boolean; readonly stop: boolean };

/** Applies the shortage policy for one line (GDD-20.1). */
const applyShortage = (
  world: World,
  tx: TransactionWriter,
  events: EventWriter,
  owner: OwnerHandle,
  entity: EntityId,
  line: MaintenanceInput,
  policy: Maintenance['shortagePolicy'],
): ShortageOutcome => {
  const shortage = (payload: Record<string, Int | string>): void => {
    events.emit({
      type: 'MaintenanceShortage',
      subjects: [entity],
      owner,
      location: null,
      payload,
    });
  };
  switch (policy) {
    case 'deactivate_entity': {
      world.stores.get<{ enabled: boolean }>('enabled').set(entity, { enabled: false });
      shortage({ resource: line.resource, due: line.quantity, policy });
      return { accrued: false, stop: true };
    }
    case 'scale': {
      const affordable = Math.max(
        0,
        Math.min(line.quantity, balanceOf(world, owner, line.resource)),
      );
      if (affordable > 0) {
        const applied = tx.atomic((builder) => {
          builder.account({
            owner,
            resource: line.resource,
            delta: -affordable,
            reason: MAINTENANCE_REASON,
          });
        });
        if (!applied.ok) {
          throw new InvariantViolation('maintenance_charge_rejected', {
            entity: String(entity),
            resource: String(line.resource),
            code: applied.error.code,
          });
        }
        events.emit({
          type: 'MaintenanceCharged',
          subjects: [entity],
          owner,
          location: null,
          payload: { resource: line.resource, amount: affordable },
        });
      }
      shortage({ resource: line.resource, due: line.quantity, charged: affordable, policy });
      return { accrued: false, stop: false };
    }
    case 'accumulate_debt': {
      shortage({ resource: line.resource, due: line.quantity, policy });
      return { accrued: true, stop: false };
    }
    case 'ignore': {
      shortage({ resource: line.resource, due: line.quantity, policy });
      return { accrued: false, stop: false };
    }
    case 'owner_deficit_policy': {
      shortage({ resource: line.resource, due: line.quantity, policy });
      return { accrued: false, stop: false };
    }
    case 'trigger_transition':
      throw new InvariantViolation('unsupported_shortage_policy', {
        entity: String(entity),
        policy,
      });
  }
};
