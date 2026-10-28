/**
 * SCN-18 (reference half): the planning read model over the Appendix B.3
 * reference chain reports the hand-calculated supported population of 200 S1 /
 * 133 S2 (06 §9.3, GDD-3.8, PIC-10.5).
 *
 * The chain is placed as content-driven commands on the R3 start world: two
 * area extractors (P1) -> two refiners (H1) + one slot extractor (P2) -> one
 * combiner (C1) at 6,000 per 30 ticks = 200 C1 per tick. S1 demand is 1 base
 * unit per population per tick (factor 1.0) and S2 demand 1.5 (factor 1.5), so
 * the supported counts are 200 and 133 (07 §4 conversions).
 *
 * Source: VER-9.3, SCN-18, GDD-3.8, PIC-10.5
 */
import { describe, expect, it } from 'vitest';

import {
  advance,
  buildEntityMaterializer,
  createSession,
  instantiateWorldContent,
  planningMetrics,
  submitCommand,
} from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import { allocateEntity, ids, locationOf } from '@aesfw/core';
import type { ContentRegistry } from '@aesfw/content';

import { loadReferenceContent } from '../balance/load.js';
import { packPlacements, placementCommands } from '../balance/strategies.js';
import type { BuildStep } from '../balance/strategies.js';

const CHAIN: readonly BuildStep[] = [
  { definition: 'ref.tier.entity.area_extractor_p1', tick: 1 },
  { definition: 'ref.tier.entity.area_extractor_p1', tick: 1 },
  { definition: 'ref.tier.entity.refiner_h1', tick: 1 },
  { definition: 'ref.tier.entity.refiner_h1', tick: 1 },
  { definition: 'ref.tier.entity.slot_extractor_p2', tick: 1 },
  { definition: 'ref.tier.entity.combiner_c1', tick: 1 },
];

const RECIPES: Readonly<Record<string, string>> = {
  'ref.tier.entity.refiner_h1': 'ref.tier.recipe.refine_h1',
  'ref.tier.entity.combiner_c1': 'ref.tier.recipe.combine_c1',
};

describe('[SCN-18] reference chain supported population', () => {
  it('[SCN-18][GDD-3.8] the B.3 chain supports 200 S1 and 133 S2', () => {
    const loaded = loadReferenceContent();
    const content = loaded.content;
    if (content === null) throw new Error('reference content failed to load');
    const registry = content.registry as ContentRegistry;
    const created = createSession(content, {
      sessionId: 'scn18',
      seed: [1, 2],
      tickDurationMs: 1000,
      world: 'ref.tier.world.prototype' as never,
      enabledModules: [],
      hashInterval: 0,
      journal: false,
      actor: 0 as never,
      actorId: 'owner.0',
      fog: false,
    });
    if (!created.ok) throw new Error('session creation failed');
    let session: SessionState = created.value;
    expect(instantiateWorldContent(session.world, registry, 'ref.tier.world.prototype')).toEqual(
      [],
    );

    // The combiner is unlock-gated at 150 S1; grant the threshold directly
    // rather than simulate the whole climb, because this test measures the
    // read model, not progression.
    const groups = session.world.stores.get<{
      readonly tier: number;
      readonly count: number;
      readonly capacity: number;
    }>('populationGroup');
    for (const entity of groups.ids()) {
      const group = groups.get(entity);
      if (group === undefined) continue;
      groups.set(entity, { ...group, count: 150 });
      break;
    }
    session = advance(session, 1).session;

    const location = session.world.stores.get('location').ids()[0];
    if (location === undefined) throw new Error('missing start location');
    const grid = session.world.stores
      .get<{ grid?: { width: number; height: number; blocked: readonly number[] } }>('location')
      .get(location)?.grid;
    if (grid === undefined) throw new Error('start location has no grid');
    const occupied: number[] = [];
    const transformStore = session.world.stores.get<{
      location: number;
      position: { x: number; y: number };
    }>('transform');
    const footprintStore = session.world.stores.get<{ width: number; height: number }>('footprint');
    for (const entity of transformStore.ids()) {
      const transform = transformStore.get(entity);
      const footprint = footprintStore.get(entity);
      if (transform === undefined || footprint === undefined) continue;
      if (transform.location !== location) continue;
      for (let dy = 0; dy < footprint.height; dy += 1) {
        for (let dx = 0; dx < footprint.width; dx += 1) {
          occupied.push((transform.position.y + dy) * grid.width + transform.position.x + dx);
        }
      }
    }
    const placements = packPlacements(
      registry,
      { width: grid.width, height: grid.height, blocked: grid.blocked, occupied },
      CHAIN,
    );
    if (placements === null) throw new Error('the chain does not fit the start grid');
    for (const command of placementCommands(location, placements, 'owner.0')) {
      const payload = command.payload as { readonly definition_id: string };
      const submitted = submitCommand(session, {
        command_id: `scn18.place.${payload.definition_id}.${placements.findIndex(
          (entry) => entry.definition === payload.definition_id,
        )}`,
        actor_id: command.actor,
        type: command.type,
        payload: command.payload as never,
      });
      expect(submitted.result.status).toBe('accepted');
      session = submitted.session;
    }
    session = advance(session, 1).session;

    // Select each producer's recipe directly: the read model reports the chain
    // a producer is configured for, and a freshly placed producer has none.
    const definitionStore = session.world.stores.get<{ definition: number }>('definition');
    const producerStore = session.world.stores.get<{
      recipe: number | null;
      recipes: readonly { recipe: number }[];
    }>('producer');
    for (const entity of producerStore.ids()) {
      const definitionId = registry.stringIdOf(
        'entity',
        definitionStore.get(entity)?.definition as never,
      );
      const recipeId = definitionId === null ? undefined : RECIPES[definitionId];
      if (recipeId === undefined) continue;
      const recipe = registry.handleOf('recipe', ids.stringId(recipeId));
      const producer = producerStore.get(entity);
      if (recipe === null || producer === undefined) continue;
      producerStore.set(entity, { ...producer, recipe });
    }

    // An S2 residence only arises from advancement, so its zero-population
    // decay would remove it again. Materialize one with one inhabitant; the
    // read model only needs the tier's demand row.
    const s2Handle = registry.handleOf('entity', ids.stringId('ref.tier.entity.residence_s2'));
    if (s2Handle === null) throw new Error('missing residence_s2');
    const definition = registry.definitionOf('entity', s2Handle);
    if (definition === null) throw new Error('missing residence_s2 definition');
    const owner = locationOf(session.world, location)?.owner ?? 0;
    const entity = allocateEntity(session.world);
    session.world.stores.get<{ owner: number }>('owner').set(entity, { owner });
    buildEntityMaterializer(content).materialize(session.world, entity, s2Handle, location, owner);
    const group = groups.get(entity);
    if (group === undefined) throw new Error('residence_s2 produced no population group');
    groups.set(entity, { ...group, count: 1 });

    const planning = planningMetrics(session, 0 as never);
    const c1 = planning.resources.find((entry) => entry.resource_id === 'ref.tier.resource.c1');
    expect(c1).toBeDefined();
    const ownerScope = c1?.scopes.find((scope) => scope.scope === 'owner');
    expect(ownerScope?.net_per_tick).toBe(200);
    const supported = (tier: string): number | undefined =>
      ownerScope?.tiers.find((entry) => entry.tier_id === tier)?.supported;
    expect(supported('ref.tier.population.s1')).toBe(200);
    expect(supported('ref.tier.population.s2')).toBe(133);
  }, 120_000);
});
