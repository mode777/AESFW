/**
 * Need breakdown read model (PIC-10.3). Derived per-need fulfillment and
 * category contribution for a residence.
 *
 * Source: PIC-10.3, TDS-18.4
 */
import { readWorld } from '@aesfw/core';
import type { NeedStates, Registry, Residence, Satisfaction } from '@aesfw/core';
import type { NeedBreakdownDto } from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const idOf = (
  registry: Registry,
  type: Parameters<Registry['stringIdOf']>[0],
  handle: number,
  fallback: string,
): string => registry.stringIdOf(type, handle as never) ?? fallback;

/**
 * Builds the need breakdown for a residence, or an empty array when `entity`
 * has no residence (PIC-10.3).
 *
 * Source: PIC-10.3
 */
export function needBreakdown(
  session: SessionState,
  actor: number,
  entity: number,
): readonly NeedBreakdownDto[] {
  const world = session.world;
  const registry = session.content.registry;
  const residence = world.stores.get<Residence>('residence').get(entity as never);
  if (residence === undefined) return [];
  const reader = readWorld(world, registry);
  if (
    session.settings.fog &&
    reader.knowledge(actor as never, residence.location as never) === 'unknown'
  ) {
    return [];
  }
  const states = world.stores.get<NeedStates>('needStates').get(entity as never);
  const satisfaction = world.stores.get<Satisfaction>('satisfaction').get(entity as never);

  return (residence.needs ?? []).map((spec) => {
    const runtime = states?.needs.find((need) => need.need === spec.need);
    const demand = runtime?.demanded ?? 0;
    const delivered = runtime?.window.at(-1) ?? 0;
    const fulfillment =
      demand === 0 ? 1000 : Math.min(1000, Math.floor((delivered * 1000) / demand));
    const categoryResult =
      satisfaction?.categories.find((category) => category.category === spec.category)
        ?.fulfillment ?? 0;
    return {
      entity_id: entity,
      need_id: idOf(registry, 'need', spec.need, `need.${spec.need}`),
      demand,
      delivered,
      fulfillment,
      category: idOf(registry, 'needCategory', spec.category, `need_category.${spec.category}`),
      category_result: categoryResult,
      ...(satisfaction === undefined ? {} : { satisfaction: satisfaction.z }),
    };
  });
}
