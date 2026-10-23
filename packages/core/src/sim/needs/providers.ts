/**
 * Service-provider instantiation (GDD-9.6, CONT-6.8). Reads the entity
 * definition's `service_provider` component and writes the resolved
 * `serviceProvider` component: the service handle, the effective coverage
 * radius (the component's relation, else the service's default), and the
 * capability and quantity of a capacity provider.
 *
 * Source: GDD-9.6, CONT-6.8, CONT-6.12
 */
import { entityComponentsOf } from '../placement/definition.js';
import type { Int } from '../../fx/index.js';
import { stringId } from '../../ids/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import type { ServiceProvider } from './types.js';

const modifierStore = (world: World) => world.stores.get('modifierSet');

const asRecord = (value: unknown): { readonly [key: string]: unknown } | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as { readonly [key: string]: unknown })
    : null;

const asInt = (value: unknown): Int | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;

const relationCells = (value: unknown): Int | undefined => {
  const relation = asRecord(value);
  if (relation === null || relation['type'] !== 'radius') return undefined;
  return asInt(relation['cells']);
};

/**
 * Writes the `serviceProvider` component for a definition with a
 * `service_provider` component; a no-op otherwise.
 *
 * Source: GDD-9.6, CONT-6.8
 */
export function applyServiceProvider(
  world: World,
  registry: Registry,
  definition: DefinitionHandle,
  entity: EntityId,
): void {
  const components = entityComponentsOf(registry, definition);
  const component = asRecord(components?.['service_provider']);
  if (component === null) return;
  const serviceId = component['service'];
  if (typeof serviceId !== 'string') return;
  const service = registry.handleOf('service', stringId(serviceId));
  if (service === null) return;
  const mode = component['mode'] === 'capacity' ? 'capacity' : 'coverage';
  const serviceData = registry.definitionDataOf?.('service', service) ?? null;
  const serviceRelation = asRecord((asRecord(serviceData) ?? {})['default_relation']);
  const radiusCells = relationCells(component['relation']) ?? relationCells(serviceRelation);
  const capabilityId = component['capability'];
  const capability =
    typeof capabilityId === 'string' ? registry.handleOf('resource', stringId(capabilityId)) : null;
  const provider: ServiceProvider = {
    kind: 'service_provider',
    mode,
    service,
    ...(radiusCells !== undefined ? { radiusCells } : {}),
    ...(mode === 'capacity' && capability !== null
      ? { capability, quantityPerTick: asInt(component['quantity_per_tick']) ?? 0 }
      : {}),
  };
  modifierStore(world).set(entity, provider);
}
