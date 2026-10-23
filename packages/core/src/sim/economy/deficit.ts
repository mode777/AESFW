/**
 * The owner deficit policy runtime (GDD-3.7, GDD-20.3, CONT-6.22). Phase 27
 * applies every compiled deficit policy to every owner: a trigger deficit
 * pauses maintenance payers in the configured order until the owner's net
 * rate is non-negative; automatic resume restores them in reverse pause
 * order when the resume condition holds. Paused entities are excluded from
 * production and maintenance in the next tick (INV-11, TDS-11.3 rule 4).
 *
 * Source: GDD-3.7, GDD-20.3, ARCH-5.2 (phase 27)
 */
import type { JsonValue } from '../../det/index.js';
import type { EventWriter } from '../../events/event-writer.js';
import { mulDiv } from '../../fx/index.js';
import type { Int } from '../../fx/index.js';
import { stringId } from '../../ids/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import type { PopulationGroup, Residence } from '../population/types.js';
import type { Satisfaction } from '../needs/types.js';
import { isCharging } from './maintenance.js';
import { curveMultiplier, resourceStoragePolicy } from './resources.js';
import type { Maintenance } from './types.js';

type Data = { readonly [key: string]: JsonValue };

/** A balance comparison (CONT-6.22). */
export type BalanceComparison = {
  readonly operator: 'less' | 'less_equal' | 'greater' | 'greater_equal' | 'equal';
  readonly value: Int;
};

/** A resume policy (GDD-20.3). */
export type ResumePolicy = 'automatic_reverse_order' | 'manual' | 'disabled';

/** A resolved deficit policy (CONT-6.22). */
export type DeficitPolicySpec = {
  readonly id: string;
  readonly resource: DefinitionHandle;
  readonly trigger: BalanceComparison;
  readonly order: readonly ('maintenance_desc' | 'entity_id_asc')[];
  readonly stopWhen: 'net_rate_non_negative';
  readonly excludeTags: readonly string[];
  readonly resume: { readonly policy: ResumePolicy; readonly when: BalanceComparison };
};

const asRecord = (value: JsonValue | null | undefined): Data | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : null;

const asArray = (value: JsonValue | undefined): readonly JsonValue[] =>
  Array.isArray(value) ? (value as readonly JsonValue[]) : [];

const asString = (value: JsonValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

const asInt = (value: JsonValue | undefined): Int | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null;

const resolveComparison = (value: JsonValue | undefined): BalanceComparison | null => {
  const record = asRecord(value);
  if (record === null) return null;
  const operator = asString(record['operator']);
  const amount = asInt(record['value']);
  if (
    operator !== 'less' &&
    operator !== 'less_equal' &&
    operator !== 'greater' &&
    operator !== 'greater_equal' &&
    operator !== 'equal'
  ) {
    return null;
  }
  if (amount === null) return null;
  return { operator, value: amount };
};

/**
 * Resolves the compiled deficit policies in ascending handle order; malformed
 * entries are skipped (content validation rejects them at load time).
 *
 * Source: CONT-6.22, TDS-7
 */
export function resolveDeficitPolicies(registry: Registry): readonly DeficitPolicySpec[] {
  const policies: DeficitPolicySpec[] = [];
  for (const handle of registry.handlesOf?.('deficitPolicy') ?? []) {
    const data = asRecord(registry.definitionDataOf?.('deficitPolicy', handle));
    if (data === null) continue;
    const id = asString(data['id']);
    const resourceId = asString(data['resource']);
    const resource =
      resourceId === null ? null : registry.handleOf('resource', stringId(resourceId));
    const trigger = resolveComparison(data['trigger']);
    const resumeRecord = asRecord(data['resume']);
    const resumePolicy = asString(resumeRecord?.['policy']);
    const resumeWhen = resolveComparison(resumeRecord?.['when']);
    const order = asArray(data['order'])
      .map(asString)
      .filter(
        (entry): entry is 'maintenance_desc' | 'entity_id_asc' =>
          entry === 'maintenance_desc' || entry === 'entity_id_asc',
      );
    if (
      id === null ||
      resource === null ||
      trigger === null ||
      order.length === 0 ||
      asString(data['stop_when']) !== 'net_rate_non_negative' ||
      (resumePolicy !== 'automatic_reverse_order' &&
        resumePolicy !== 'manual' &&
        resumePolicy !== 'disabled') ||
      resumeWhen === null
    ) {
      continue;
    }
    policies.push({
      id,
      resource,
      trigger,
      order,
      stopWhen: 'net_rate_non_negative',
      excludeTags: asArray(data['exclude_tags'])
        .map(asString)
        .filter((tag): tag is string => tag !== null),
      resume: { policy: resumePolicy, when: resumeWhen },
    });
  }
  return policies;
}

/** Evaluates a balance comparison (CONT-6.22). */
export function compareBalance(amount: Int, comparison: BalanceComparison): boolean {
  switch (comparison.operator) {
    case 'less':
      return amount < comparison.value;
    case 'less_equal':
      return amount <= comparison.value;
    case 'greater':
      return amount > comparison.value;
    case 'greater_equal':
      return amount >= comparison.value;
    case 'equal':
      return amount === comparison.value;
  }
}

const balanceOf = (world: World, owner: OwnerHandle, resource: DefinitionHandle): Int =>
  world.owners.owners
    .find((entry) => entry.handle === owner)
    ?.accounts.find((entry) => entry.resource === resource)?.amount ?? 0;

const ownerComponentOf = (world: World, entity: EntityId): OwnerHandle | null =>
  world.stores.get<{ owner: OwnerHandle }>('owner').get(entity)?.owner ?? null;

const definitionTagsOf = (
  registry: Registry,
  world: World,
  entity: EntityId,
): readonly string[] => {
  const definition = world.stores.get<{ definition: DefinitionHandle }>('definition').get(entity);
  if (definition === undefined) return [];
  const data = asRecord(registry.definitionDataOf?.('entity', definition.definition));
  return asArray(data?.['tags'])
    .map(asString)
    .filter((tag): tag is string => tag !== null);
};

/** The per-interval due of one maintenance component for `resource`. */
export const dueForResource = (maintenance: Maintenance, resource: DefinitionHandle): Int =>
  maintenance.inputs.reduce(
    (total, line) => (line.resource === resource ? total + line.quantity : total),
    0,
  );

/**
 * The owner's income per tick for `resource`: the sum over the owner's
 * residences of `floor(count × rate × curve(z) / 1000)` for income outputs
 * of the resource (D2).
 *
 * Source: GDD-20.3, GDD-11.3
 */
export function ownerIncomePerTick(
  world: World,
  registry: Registry,
  owner: OwnerHandle,
  resource: DefinitionHandle,
): Int {
  const residenceStore = world.stores.get<Residence>('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const satisfactionStore = world.stores.get<Satisfaction>('satisfaction');
  let total: Int = 0;
  for (const entity of residenceStore.ids()) {
    if (ownerComponentOf(world, entity) !== owner) continue;
    const residence = residenceStore.get(entity);
    if (residence === undefined) continue;
    const group = groupStore.get(entity);
    if (group === undefined || group.count <= 0) continue;
    const z = satisfactionStore.get(entity)?.z ?? 1000;
    for (const output of residence.outputs) {
      if (output.resource !== resource) continue;
      if (resourceStoragePolicy(registry, output.resource) !== 'normal') continue;
      const multiplier =
        output.satisfactionCurve === null
          ? 1000
          : curveMultiplier(registry, output.satisfactionCurve, z);
      total += mulDiv(group.count * output.ratePerPopulationPerTick, multiplier, 1000, 'floor');
    }
  }
  return total;
}

/**
 * The owner's maintenance expense per tick for `resource`: the sum over the
 * owner's currently charging maintenance entities of
 * `floor(due / intervalTicks)` (D2).
 *
 * Source: GDD-20.3, GDD-20.1
 */
export function ownerMaintenancePerTick(
  world: World,
  owner: OwnerHandle,
  resource: DefinitionHandle,
): Int {
  const store = world.stores.get<Maintenance>('maintenance');
  let total: Int = 0;
  for (const entity of store.ids()) {
    if (ownerComponentOf(world, entity) !== owner) continue;
    const maintenance = store.get(entity);
    if (maintenance === undefined) continue;
    if (!isCharging(world, entity, maintenance.chargePolicy)) continue;
    const due = dueForResource(maintenance, resource);
    if (due <= 0) continue;
    total += mulDiv(due, 1, maintenance.intervalTicks, 'floor');
  }
  return total;
}

/** The owner's net rate per tick for `resource`: income minus expense (D2). */
export function ownerNetRate(
  world: World,
  registry: Registry,
  owner: OwnerHandle,
  resource: DefinitionHandle,
): Int {
  return (
    ownerIncomePerTick(world, registry, owner, resource) -
    ownerMaintenancePerTick(world, owner, resource)
  );
}

interface PauseCandidate {
  readonly entity: EntityId;
  readonly due: Int;
}

const pauseCandidates = (
  world: World,
  registry: Registry,
  owner: OwnerHandle,
  policy: DeficitPolicySpec,
  paused: readonly EntityId[],
): readonly PauseCandidate[] => {
  const store = world.stores.get<Maintenance>('maintenance');
  const candidates: PauseCandidate[] = [];
  for (const entity of store.ids()) {
    if (paused.includes(entity)) continue;
    if (ownerComponentOf(world, entity) !== owner) continue;
    const maintenance = store.get(entity);
    if (maintenance === undefined) continue;
    if (!isCharging(world, entity, maintenance.chargePolicy)) continue;
    const due = dueForResource(maintenance, policy.resource);
    if (due <= 0) continue;
    const tags = definitionTagsOf(registry, world, entity);
    if (tags.some((tag) => policy.excludeTags.includes(tag))) continue;
    candidates.push({ entity, due });
  }
  return candidates;
};

const compareCandidates = (
  left: PauseCandidate,
  right: PauseCandidate,
  order: readonly ('maintenance_desc' | 'entity_id_asc')[],
): number => {
  for (const key of order) {
    if (key === 'maintenance_desc' && left.due !== right.due) return right.due - left.due;
    if (key === 'entity_id_asc' && left.entity !== right.entity) return left.entity - right.entity;
  }
  return left.entity - right.entity;
};

const writePaused = (world: World, owner: OwnerHandle, paused: readonly EntityId[]): void => {
  const owners = world.owners.owners.map((entry) =>
    entry.handle === owner ? { ...entry, deficitPaused: [...paused] } : entry,
  );
  world.owners = { owners };
};

/**
 * Applies every compiled deficit policy to every owner (phase 27). Owners are
 * processed in ascending handle order; policies in ascending handle order.
 *
 * Source: GDD-20.3, ARCH-5.2 (phase 27)
 */
export function applyDeficitPolicy(world: World, registry: Registry, events: EventWriter): void {
  const policies = resolveDeficitPolicies(registry);
  if (policies.length === 0) return;
  for (const ownerState of world.owners.owners) {
    for (const policy of policies) {
      applyToOwner(world, registry, ownerState.handle, policy, events);
    }
  }
}

const applyToOwner = (
  world: World,
  registry: Registry,
  owner: OwnerHandle,
  policy: DeficitPolicySpec,
  events: EventWriter,
): void => {
  const current = world.owners.owners.find((entry) => entry.handle === owner);
  if (current === undefined) return;
  const paused = [...current.deficitPaused];
  const balance = balanceOf(world, owner, policy.resource);

  if (compareBalance(balance, policy.trigger)) {
    const candidates = [...pauseCandidates(world, registry, owner, policy, paused)].sort(
      (left, right) => compareCandidates(left, right, policy.order),
    );
    for (const candidate of candidates) {
      if (ownerNetRate(world, registry, owner, policy.resource) >= 0) break;
      paused.push(candidate.entity);
      writePaused(world, owner, paused);
      events.emit({
        type: 'DeficitPaused',
        subjects: [candidate.entity],
        owner,
        location: null,
        payload: { resource: policy.resource },
      });
    }
    return;
  }

  if (
    policy.resume.policy === 'automatic_reverse_order' &&
    compareBalance(balance, policy.resume.when)
  ) {
    while (paused.length > 0) {
      const entity = paused[paused.length - 1];
      if (entity === undefined) break;
      paused.pop();
      writePaused(world, owner, paused);
      events.emit({
        type: 'DeficitResumed',
        subjects: [entity],
        owner,
        location: null,
        payload: { resource: policy.resource },
      });
    }
  }
};
