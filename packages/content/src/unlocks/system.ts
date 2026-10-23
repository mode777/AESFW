/**
 * Unlock evaluation and definition availability (GDD-19, CONT-6.17). Built
 * from compiled content, it evaluates each unlock's condition per scope and
 * writes the unlocked target IDs into the owning owners' `unlocks`.
 *
 * Source: GDD-19, CONT-6.17, PIC-4
 */
import { ids } from '@aesfw/core';
import type { EvalContext } from '../conditions/evaluate.js';
import type {
  DefinitionHandle,
  DefinitionType,
  OwnerHandle,
  StringId,
  TickContext,
  UnlockSystem,
  World,
} from '@aesfw/core';

import { compileCondition } from '../conditions/compile.js';
import { evaluate } from '../conditions/evaluate.js';
import type { Expr, QueryRef } from '../conditions/expr.js';
import type { ContentRegistry } from '../registry/types.js';
import type { CompiledContent } from '../types.js';

/** Maps an unlock target type to a core definition type (CONT-6.17). */
const TARGET_TYPES: Readonly<Record<string, DefinitionType>> = {
  entity_definition: 'entity',
  recipe: 'recipe',
  population_tier: 'tier',
  transport_type: 'transportType',
  location_template: 'location',
  connection: 'connection',
  transition: 'transition',
  exchange: 'exchange',
};

interface UnlockDefinition {
  readonly handle: DefinitionHandle;
  readonly id: StringId;
  readonly scope: 'owner' | 'global';
  readonly reversible: boolean;
  readonly condition: DefinitionHandle;
  readonly root: Expr;
  readonly targets: readonly { readonly type: DefinitionType; readonly id: StringId }[];
}

const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as { readonly [key: string]: unknown })
    : null;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** The owner handle attributed to an entity, if any. */
const ownerOf = (world: World, entity: number): number | null => {
  const direct = world.stores.get<{ readonly owner: number }>('owner').get(ids.entityId(entity));
  if (direct !== undefined) return direct.owner;
  const locationId = world.stores
    .get<{ readonly location: number }>('transform')
    .get(ids.entityId(entity))?.location;
  if (locationId === undefined) return null;
  return (
    world.stores.get<{ readonly owner: number | null }>('location').get(ids.entityId(locationId))
      ?.owner ?? null
  );
};

/**
 * Resolves the owner-scoped domain queries of unlock conditions (GDD-19).
 * `population_count` sums the tier's population owned by `owner`; a missing
 * tier argument counts every tier.
 *
 * Source: GDD-19, TDS-14.2
 */
export function unlockQueryValue(
  registry: ContentRegistry,
  world: World,
  owner: OwnerHandle,
  query: QueryRef,
): number {
  if (query.name === 'population_count') {
    const tierId = query.args['tier'];
    const tier =
      typeof tierId === 'string' ? registry.handleOf('tier', ids.stringId(tierId)) : null;
    const groupStore = world.stores.get<{ readonly tier: number; readonly count: number }>(
      'populationGroup',
    );
    let total = 0;
    for (const entity of groupStore.ids()) {
      const group = groupStore.get(entity);
      if (group === undefined) continue;
      if (ownerOf(world, entity) !== owner) continue;
      if (tier !== null && group.tier !== tier) continue;
      total += group.count;
    }
    return total;
  }
  return 0;
}

/**
 * Builds the unlock system from compiled content (GDD-19, design D4).
 *
 * Source: GDD-19, CONT-6.17
 */
export function buildUnlockSystem(content: CompiledContent): UnlockSystem {
  const registry = content.registry as ContentRegistry;
  const unlocks: UnlockDefinition[] = [];
  const definitions =
    typeof registry.definitionsOf === 'function' ? registry.definitionsOf('unlock') : [];
  for (const definition of definitions) {
    const data = asRecord(definition.data);
    if (data === null) continue;
    const condition = registry.handleOf('condition', ids.stringId(String(data['condition'])));
    if (condition === null) continue;
    const compiled = compileCondition(
      registry.definitionOf('condition', condition)?.data ?? null,
      registry,
    );
    if (compiled.condition === null) continue;
    const targets: { type: DefinitionType; id: StringId }[] = [];
    for (const entry of asArray(data['targets'])) {
      const target = asRecord(entry);
      const type = typeof target?.['type'] === 'string' ? TARGET_TYPES[target['type']] : undefined;
      if (type === undefined || typeof target?.['id'] !== 'string') continue;
      targets.push({ type, id: ids.stringId(target['id']) });
    }
    if (targets.length === 0) continue;
    unlocks.push({
      handle: definition.handle,
      id: ids.stringId(definition.id),
      scope: data['scope'] === 'global' ? 'global' : 'owner',
      reversible: data['reversible'] === true,
      condition,
      root: compiled.condition.root,
      targets,
    });
  }
  unlocks.sort((left, right) => left.handle - right.handle);

  const gated = new Set<string>();
  for (const unlock of unlocks) {
    for (const target of unlock.targets) gated.add(`${target.type}|${target.id}`);
  }

  return {
    update(ctx: TickContext): void {
      if (unlocks.length === 0) return;
      const world = ctx.world;
      const owners = [...world.owners.owners];
      let changed = false;
      for (let index = 0; index < owners.length; index += 1) {
        const owner = owners[index];
        if (owner === undefined) continue;
        const unlocked = new Set<string>(owner.unlocks);
        for (const unlock of unlocks) {
          const subjectOwner = unlock.scope === 'owner' ? owner.handle : null;
          const context: EvalContext = {
            subject:
              subjectOwner === null
                ? { kind: 'global', id: 0 }
                : { kind: 'owner', id: subjectOwner },
            query: (query) =>
              subjectOwner === null ? 0 : unlockQueryValue(registry, world, subjectOwner, query),
            aggregate: () => 0,
            timer: (slot) =>
              world.timers.timers.find(
                (timer) =>
                  timer.condition === unlock.condition &&
                  timer.slot === slot &&
                  timer.subject === ids.entityId(subjectOwner ?? 0),
              )?.consecutiveTrueTicks ?? 0,
          };
          const holds = evaluate(unlock.root, context) === true;
          if (holds) {
            for (const target of unlock.targets) unlocked.add(target.id);
          } else if (unlock.reversible) {
            // Only remove a target when no other satisfied unlock exposes it.
            for (const target of unlock.targets) {
              const covered = unlocks.some(
                (other) =>
                  other !== unlock &&
                  other.targets.some((entry) => entry.id === target.id) &&
                  evaluate(other.root, {
                    ...context,
                    subject:
                      other.scope === 'owner'
                        ? { kind: 'owner', id: owner.handle }
                        : { kind: 'global', id: 0 },
                    query: (query) =>
                      other.scope === 'owner'
                        ? unlockQueryValue(registry, world, owner.handle, query)
                        : 0,
                  }) === true,
              );
              if (!covered) unlocked.delete(target.id);
            }
          }
        }
        const sorted = [...unlocked]
          .map((value) => ids.stringId(value))
          .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
        if (
          sorted.length !== owner.unlocks.length ||
          sorted.some((value, position) => value !== owner.unlocks[position])
        ) {
          owners[index] = { ...owner, unlocks: sorted };
          changed = true;
        }
      }
      if (changed) world.owners = { owners };
    },

    isAvailable(world: World, owner: OwnerHandle, type: DefinitionType, id: StringId): boolean {
      if (!gated.has(`${type}|${id}`)) return true;
      const state = world.owners.owners.find((entry) => entry.handle === owner);
      return state?.unlocks.includes(id) ?? false;
    },
  };
}
