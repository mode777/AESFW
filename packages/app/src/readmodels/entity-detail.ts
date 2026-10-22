/**
 * Entity detail read model (PIC-10.1). Derived values are computed here and
 * never written back as authority.
 *
 * Source: PIC-10.1, TDS-18.4
 */
import { readWorld } from '@aesfw/core';
import type { Maintenance, PopulationGroup, Registry, Residence, Satisfaction } from '@aesfw/core';
import type { EntityDetailDto, MaintenanceDto, ProductionDto, ResidenceDto } from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const AVAILABLE_COMMANDS = [
  'SetEntityEnabled',
  'SelectRecipe',
  'SetProcessPriority',
  'SetCapabilityPriority',
] as const;

const stringIdOf = (
  registry: Registry,
  type: Parameters<Registry['stringIdOf']>[0],
  handle: number,
  fallback: string,
): string => registry.stringIdOf(type, handle as never) ?? fallback;

/**
 * Builds the entity detail read model, or `null` when `entity` is not an
 * entity (PIC-10.1).
 *
 * Source: PIC-10.1
 */
export function entityDetail(session: SessionState, entity: number): EntityDetailDto | null {
  const world = session.world;
  const registry = session.content.registry;
  const reader = readWorld(world, registry);
  const id = entity as never;
  const producer = reader.producer(id);
  const residence = world.stores.get<Residence>('residence').get(id);
  const definition = reader.definition(id);
  if (producer === undefined && residence === undefined && definition === undefined) return null;

  const location = producer?.location ?? residence?.location ?? null;
  const locationOwner = location === null ? undefined : reader.location(location)?.owner;

  const production: ProductionDto | undefined =
    producer === undefined
      ? undefined
      : {
          ...(producer.recipe === null
            ? {}
            : {
                recipe_id: stringIdOf(
                  registry,
                  'recipe',
                  producer.recipe,
                  `recipe.${producer.recipe}`,
                ),
              }),
          state: producer.state,
          progress: producer.progress,
          progress_scale: 1000,
          block_reasons: [...producer.blockReasons],
        };

  const group = world.stores.get<PopulationGroup>('populationGroup').get(id);
  const satisfaction = world.stores.get<Satisfaction>('satisfaction').get(id);
  const residenceDto: ResidenceDto | undefined =
    residence === undefined || group === undefined
      ? undefined
      : { population: group.count, satisfaction: satisfaction?.z ?? 0, band: '' };

  const maintenance = world.stores.get<Maintenance>('maintenance').get(id);
  const maintenanceDto: MaintenanceDto | undefined =
    maintenance === undefined
      ? undefined
      : {
          amount: maintenance.inputs.reduce((total, line) => total + line.quantity, 0),
          policy: maintenance.chargePolicy,
        };

  return {
    entity_id: entity,
    definition_id:
      definition === undefined
        ? `entity.${entity}`
        : stringIdOf(registry, 'entity', definition, `entity.${entity}`),
    lifecycle: reader.lifecycle(id) ?? 'active',
    ...(location === null ? {} : { location_id: location }),
    ...(locationOwner === undefined || locationOwner === null
      ? {}
      : { owner_id: `owner.${locationOwner}` }),
    enabled: reader.enabled(id) ?? true,
    available_commands: [...AVAILABLE_COMMANDS],
    ...(production === undefined ? {} : { production }),
    block_reasons: producer?.blockReasons ?? [],
    ...(maintenanceDto === undefined ? {} : { maintenance: maintenanceDto }),
    ...(residenceDto === undefined ? {} : { residence: residenceDto }),
  };
}
