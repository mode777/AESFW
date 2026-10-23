/**
 * Integration test for the demo-regions fixture (roadmap 8.1): the theme-free
 * content loads strictly and instantiates with generated attributes.
 *
 * Source: GDD-3.3, GDD-6.4, GDD-6.5, CONT-6.18
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createMemorySource, loadContent, worldPlan } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import { createWorld, ids, instantiateWorld } from '@aesfw/core';
import { fileSystemIo } from './cli.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

interface LocationComponent {
  readonly region: number | null;
  readonly template: number;
  readonly properties: readonly { property: string; value: number }[];
  readonly sourceSlots?: readonly { type: string; count: number }[];
}

type LocationStore = {
  get: (entity: number) => LocationComponent | undefined;
  ids: () => readonly number[];
};

const build = (
  seed: readonly [number, number],
): { registry: ContentRegistry; store: LocationStore } => {
  const files = ['content.yaml', 'package.yaml'];
  const documents: Record<string, string> = {};
  for (const file of files) {
    const read = fileSystemIo().readFile(resolve(repoRoot, 'fixtures/content/demo-regions', file));
    if (read === null) throw new Error(`missing fixture file ${file}`);
    documents[file] = read;
  }
  const source = createMemorySource('demo.regions', documents);
  const result = loadContent([source], { strictness: 'strict' });
  expect(result.diagnostics).toEqual([]);
  if (result.content === null) throw new Error('fixture content failed to load');
  const compiled = result.content;
  const created = createWorld(compiled.registry, {
    seed: [seed[0], seed[1]],
    tickDurationMs: 1000,
    world: ids.stringId('demo.world.regions'),
    enabledModules: [],
  });
  if (!created.ok) throw new Error('createWorld returned an error');
  const plan = worldPlan(compiled.registry as ContentRegistry, 'demo.world.regions');
  expect(plan.diagnostics).toEqual([]);
  instantiateWorld(created.value, plan.plan);
  return {
    registry: compiled.registry as ContentRegistry,
    store: created.value.stores.get('location') as unknown as LocationStore,
  };
};

describe('[GDD-6.4][GDD-6.5][CONT-6.18] demo-regions fixture', () => {
  it('[CONT-6.18] the fixture loads strictly and locations carry their regions', () => {
    const { registry, store } = build([5, 9]);
    expect(store.ids().length).toBeGreaterThanOrEqual(3);
    const regionIds = store.ids().map((entity) => {
      const location = store.get(entity);
      if (location === undefined || location.region === null) return null;
      return registry.stringIdOf('region', location.region as never);
    });
    expect(new Set(regionIds)).toEqual(new Set(['demo.region.east', 'demo.region.west']));
  });

  it('[GDD-6.5] authored suitability is preserved and no region supplies every property', () => {
    const { store } = build([5, 9]);
    const locations = store.ids().map((entity) => store.get(entity));
    const east = locations.find((location) =>
      location?.properties.some(
        (entry) => entry.property === 'demo.property.suitability_c' && entry.value === 1000,
      ),
    );
    const west = locations.find((location) =>
      location?.properties.some(
        (entry) => entry.property === 'demo.property.suitability_d' && entry.value === 1000,
      ),
    );
    expect(east).toBeDefined();
    expect(west).toBeDefined();
    const eastSuppliesD = east?.properties.some(
      (entry) => entry.property === 'demo.property.suitability_d' && entry.value > 0,
    );
    expect(eastSuppliesD).toBe(false);
  });

  it('[GDD-6.5][TDS-15] generation is deterministic and authored slots win', () => {
    const first = build([5, 9]);
    const second = build([5, 9]);
    expect(first.store.ids()).toEqual(second.store.ids());
    for (const entity of first.store.ids()) {
      expect(first.store.get(entity)?.properties).toEqual(second.store.get(entity)?.properties);
      expect(first.store.get(entity)?.sourceSlots).toEqual(second.store.get(entity)?.sourceSlots);
    }
    const authored = first.store
      .ids()
      .map((entity) => first.store.get(entity))
      .find(
        (location) =>
          location?.sourceSlots !== undefined &&
          location.sourceSlots.length === 1 &&
          location.sourceSlots[0]?.count === 2,
      );
    expect(authored?.sourceSlots).toEqual([{ type: 'demo.slot.deposit_w', count: 2 }]);
    const { registry } = first;
    const otherSuppliers = first.store
      .ids()
      .map((entity) => first.store.get(entity))
      .filter(
        (location) =>
          location !== authored &&
          location?.sourceSlots?.some((slot) => slot.type === 'demo.slot.deposit_w'),
      );
    for (const supplier of otherSuppliers) {
      if (supplier === undefined || supplier.region === null) continue;
      expect(registry.stringIdOf('region', supplier.region as never)).toBe('demo.region.west');
    }
  });
});
