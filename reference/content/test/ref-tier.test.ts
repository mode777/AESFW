import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  createMemorySource,
  loadContent,
  parseYamlStrict,
  validatePresentationPackage,
} from '@aesfw/content';
import type { ContentRegistry, JsonValue } from '@aesfw/content';
import { advance, createSession, instantiateWorldContent } from '@aesfw/app';
import { isConnected, locationGridOf, transformOf } from '@aesfw/core';
import type { Satisfaction } from '@aesfw/core';
import { describe, expect, it } from 'vitest';

type DefinitionType = Parameters<ContentRegistry['definitionsOf']>[0];

const packageDir = fileURLToPath(new URL('../ref.tier/', import.meta.url));

const read = (name: string): string => readFileSync(`${packageDir}${name}`, 'utf8');

const presentationDir = fileURLToPath(new URL('../ref.tier.presentation/', import.meta.url));

const readPresentation = (name: string): JsonValue => {
  const outcome = parseYamlStrict(readFileSync(`${presentationDir}${name}`, 'utf8'), {
    package: 'ref.tier.presentation',
    file: name,
  });
  return outcome.value;
};

/**
 * Reads the file list from `package.yaml` in manifest order, so adding a
 * per-domain file to the manifest is enough to have it loaded here.
 */
const packageFiles = (): readonly string[] => {
  const manifest = parseYamlStrict(read('package.yaml'), {
    package: 'ref.tier',
    file: 'package.yaml',
  }).value as { readonly package?: { readonly files?: readonly string[] } };
  const files = manifest.package?.files;
  if (files === undefined) throw new Error('ref.tier package.yaml declares no files');
  return files;
};

const source = createMemorySource('ref.tier', {
  'package.yaml': read('package.yaml'),
  ...Object.fromEntries(packageFiles().map((name) => [name, read(name)])),
});

const loaded = loadContent([source], { strictness: 'strict' });

/** The same package with design-intent findings promoted to errors (06 §10.3). */
const loadedWithPromotion = loadContent([source], {
  strictness: 'strict',
  design_intent: 'error',
});

const registry = (): ContentRegistry => {
  const content = loaded.content;
  if (content === null) throw new Error('reference content failed to load');
  return content.registry as ContentRegistry;
};

const definitionData = (type: DefinitionType, id: string): Record<string, JsonValue> | null => {
  const definition = registry()
    .definitionsOf(type)
    .find((entry) => entry.id === id);
  if (definition === undefined) return null;
  return definition.data as Record<string, JsonValue>;
};

const componentsOf = (id: string): Record<string, JsonValue> => {
  const entity = definitionData('entity', id);
  return (entity?.['components'] ?? {}) as Record<string, JsonValue>;
};

const scaleOf = (id: string): number => {
  const quantity = definitionData('resource', id)?.['quantity'] as
    { readonly scale?: number } | undefined;
  return quantity?.scale ?? -1;
};

const idsWithPrefix = (type: DefinitionType, prefix: string): readonly string[] =>
  registry()
    .definitionsOf(type)
    .map((entry) => entry.id)
    .filter((id) => id.startsWith(prefix))
    .sort();

describe('[REF-5] reference content package', () => {
  it('[REF-5] the reference content validates strictly', () => {
    expect(loaded.content).not.toBeNull();
    expect(loaded.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('[REF-5] the design-intent audit is clean with promotion', () => {
    expect(loadedWithPromotion.content).not.toBeNull();
    expect(
      loadedWithPromotion.diagnostics.filter(
        (diagnostic) => diagnostic.severity === 'error' || diagnostic.severity === 'warning',
      ),
    ).toEqual([]);
  });

  it('[REF-5] the catalogue matches its stage counts', () => {
    expect(idsWithPrefix('location', 'ref.tier.location.')).toHaveLength(6);
    expect(idsWithPrefix('resource', 'ref.tier.resource.p')).toHaveLength(8);
    expect(idsWithPrefix('resource', 'ref.tier.resource.h')).toHaveLength(6);
    expect(
      idsWithPrefix('resource', 'ref.tier.resource.c').filter(
        (id) => id !== 'ref.tier.resource.credits',
      ),
    ).toHaveLength(12);
    expect(idsWithPrefix('resource', 'ref.tier.resource.bm')).toHaveLength(4);
    expect(idsWithPrefix('tier', 'ref.tier.population.')).toHaveLength(4);
    expect(idsWithPrefix('transportType', 'ref.tier.transport.')).toHaveLength(3);
  });

  it('[REF-5] the reference content defines the closed loop', () => {
    const refine = definitionData('recipe', 'ref.tier.recipe.refine_h1');
    expect(refine?.['inputs']).toEqual([{ resource: 'ref.tier.resource.p1', quantity: 12000 }]);
    expect(refine?.['outputs']).toEqual([{ resource: 'ref.tier.resource.h1', quantity: 6000 }]);
    const combine = definitionData('recipe', 'ref.tier.recipe.combine_c1');
    expect(combine?.['inputs']).toEqual([
      { resource: 'ref.tier.resource.h1', quantity: 12000 },
      { resource: 'ref.tier.resource.p2', quantity: 12000 },
    ]);
    expect(combine?.['outputs']).toEqual([{ resource: 'ref.tier.resource.c1', quantity: 6000 }]);
    expect(definitionData('need', 'ref.tier.need.c1')).not.toBeNull();
  });

  it('[REF-5] every storable resource uses the reference base scale', () => {
    for (const code of [
      'p1',
      'p2',
      'p3',
      'p4',
      'h1',
      'h2',
      'c1',
      'c2',
      'c3',
      'c4',
      'bm1',
      'bm2',
      'ep',
      'credits',
    ]) {
      expect(scaleOf(`ref.tier.resource.${code}`)).toBe(6000);
    }
  });
});

describe('[REF-7] R3 regions and distribution', () => {
  it('[REF-7] regions partition the locations disjointly', () => {
    const location = (id: string): Record<string, JsonValue> =>
      definitionData('location', id) ?? {};
    const alpha = idsWithPrefix('location', 'ref.tier.location.alpha_');
    const beta = idsWithPrefix('location', 'ref.tier.location.beta_');
    expect(alpha).toHaveLength(4);
    expect(beta).toHaveLength(2);
    expect(alpha.every((id) => location(id)['region'] === 'ref.tier.region.alpha')).toBe(true);
    expect(beta.every((id) => location(id)['region'] === 'ref.tier.region.beta')).toBe(true);

    const rule = definitionData('distributionRule', 'ref.tier.distribution.primary');
    const disjoint = (rule?.['disjoint'] ?? {}) as Record<string, JsonValue>;
    expect(disjoint['properties']).toEqual(['ref.tier.property.suitability_*']);
    expect(disjoint['source_slot_types']).toBe(true);

    // α names only suitability properties and slot types that β never names.
    const properties = new Map<string, Set<string>>();
    for (const [region, idsToCheck] of [
      ['alpha', alpha],
      ['beta', beta],
    ] as const) {
      const named = new Set<string>();
      for (const id of idsToCheck) {
        const data = location(id);
        for (const property of Object.keys(
          (data['properties'] ?? {}) as Record<string, JsonValue>,
        )) {
          named.add(property);
        }
        for (const slot of (data['source_slots'] ?? []) as readonly Record<string, JsonValue>[]) {
          const type = slot['type'];
          if (typeof type === 'string') named.add(type);
        }
      }
      properties.set(region, named);
    }
    const alphaNames = properties.get('alpha') ?? new Set<string>();
    const betaNames = properties.get('beta') ?? new Set<string>();
    for (const name of betaNames) expect(alphaNames.has(name)).toBe(false);
    expect(betaNames.has('ref.tier.property.suitability_p3')).toBe(true);
    expect(betaNames.has('ref.tier.slot.v_b')).toBe(true);
  });
});

describe('[REF-7] R3 start state', () => {
  const startSession = (): ReturnType<typeof createSession> => {
    const content = loaded.content;
    if (content === null) throw new Error('reference content failed to load');
    const created = createSession(content, {
      sessionId: 'ref.tier.start',
      seed: [0, 0],
      tickDurationMs: 1000,
      world: null,
      enabledModules: [],
      hashInterval: 0,
      journal: false,
      actor: 0 as never,
      actorId: 'owner.0',
    });
    if (!created.ok) throw new Error('session creation failed');
    return created;
  };

  it('[REF-7] the start state knows one neighbour and the home exchange', () => {
    const world = definitionData('world', 'ref.tier.world.prototype');
    const owners = (world?.['owners'] ?? []) as readonly Record<string, JsonValue>[];
    expect(owners).toHaveLength(1);
    const owner = owners[0] ?? {};
    expect(owner['established_locations']).toEqual(['ref.tier.loc.alpha_1']);
    const known = (owner['known_locations'] ?? []) as readonly string[];
    // One adjacent location plus the location that hosts the α exchange.
    expect([...known].sort()).toEqual(['ref.tier.loc.alpha_2', 'ref.tier.loc.alpha_3']);
    expect(definitionData('exchange', 'ref.tier.exchange.alpha')?.['location']).toBe(
      'ref.tier.location.alpha_3',
    );
  });

  it('[CONT-6.6][A15] the authored start layout is placed and connected', () => {
    const created = startSession();
    if (!created.ok) throw new Error('session creation failed');
    const session = created.value;
    expect(instantiateWorldContent(session.world, registry(), 'ref.tier.world.prototype')).toEqual(
      [],
    );
    const world = session.world;
    const definitions = world.stores.get<{ definition: number }>('definition');
    const location = world.stores.get('location').ids()[0];
    if (location === undefined) throw new Error('missing location');
    const grid = locationGridOf(world, location);
    expect(grid).toBeDefined();
    const definitionId = (entity: number): string | null =>
      registry().stringIdOf('entity', definitions.get(entity)?.definition as never);

    // Every authored position is a transform with the declared footprint.
    const expected: Record<string, { x: number; y: number }> = {
      'ref.tier.entity.hub': { x: 2, y: 2 },
      'ref.tier.entity.slot_extractor_p2': { x: 16, y: 2 },
    };
    let placed = 0;
    for (const entity of definitions.ids()) {
      const transform = transformOf(world, entity);
      if (transform === undefined || transform.location !== location) continue;
      placed += 1;
      const id = definitionId(entity);
      if (id !== null && expected[id] !== undefined) {
        expect(transform.position).toEqual(expected[id]);
      }
    }
    // 8 of the 9 initial entities declare a position; the transport does not.
    expect(placed).toBe(8);

    // Reserved cells are buildable even though the mask is seeded.
    if (grid !== undefined) {
      for (const cell of [2 * grid.width + 2, 2 * grid.width + 8, 2 * grid.width + 16]) {
        expect(grid.blocked).not.toContain(cell);
      }
    }

    // Networked entities carry a connectivity node and are connected, so their
    // source is not blocked with `missing_inventory_access`.
    const sources = world.stores.get<{ blockReasons: readonly string[] }>('resourceSource');
    expect(sources.ids().length).toBeGreaterThanOrEqual(3);
    for (const entity of sources.ids()) {
      expect(isConnected(world, entity)).toBe(true);
      expect(sources.get(entity)?.blockReasons ?? []).not.toContain('missing_inventory_access');
    }
    for (const entity of world.stores.get('producer').ids()) {
      expect(isConnected(world, entity)).toBe(true);
    }
  });

  it('[REF-7][GDD-23.5] the start state can build the first chain and stays satisfied', () => {
    const created = startSession();
    if (!created.ok) throw new Error('session creation failed');
    const session = created.value;
    expect(instantiateWorldContent(session.world, registry(), 'ref.tier.world.prototype')).toEqual(
      [],
    );

    const location = session.world.stores.get('location').ids()[0];
    expect(location).toBeDefined();
    const residences = session.world.stores.get('residence').ids();
    expect(residences.length).toBe(2);

    let lowest = 1000;
    for (let index = 0; index < 600; index += 1) {
      const outcome = advance(session, 1);
      const satisfactionStore = session.world.stores.get<Satisfaction>('satisfaction');
      for (const entity of satisfactionStore.ids()) {
        const z = satisfactionStore.get(entity)?.z;
        if (typeof z === 'number' && z < lowest) lowest = z;
      }
      expect(outcome.outputs.length).toBeGreaterThanOrEqual(0);
    }
    expect(lowest).toBeGreaterThanOrEqual(800);
  });
});

describe('[REF-7] R4 catalogue and cross-region pressure', () => {
  it('[REF-7] the advanced tiers provide AK3 and AK4', () => {
    const s3 = definitionData('tier', 'ref.tier.population.s3');
    const s4 = definitionData('tier', 'ref.tier.population.s4');
    expect(s3?.['consumption_factor']).toBe(2250);
    expect(s4?.['consumption_factor']).toBe(3400);
    expect(s3?.['outputs']).toContainEqual({
      resource: 'ref.tier.capability.ak3',
      scope: 'location',
      rate_per_population_per_tick: 1,
    });
    expect(s4?.['outputs']).toContainEqual({
      resource: 'ref.tier.capability.ak4',
      scope: 'location',
      rate_per_population_per_tick: 1,
    });
    expect(s3?.['outputs']).toContainEqual({
      resource: 'ref.tier.resource.credits',
      scope: 'owner',
      rate_per_population_per_tick: 55,
      satisfaction_curve: 'ref.tier.curve.income',
    });
    expect(s4?.['outputs']).toContainEqual({
      resource: 'ref.tier.resource.credits',
      scope: 'owner',
      rate_per_population_per_tick: 120,
      satisfaction_curve: 'ref.tier.curve.income',
    });
  });

  it('[REF-7] S2 to S3 and S3 to S4 advance automatically', () => {
    const s2s3 = definitionData('transition', 'ref.tier.transition.s2_s3');
    expect(s2s3?.['trigger']).toBe('automatic');
    expect(s2s3?.['costs']).toEqual([
      { resource: 'ref.tier.resource.bm2', quantity: 84000 },
      { resource: 'ref.tier.resource.bm3', quantity: 48000 },
    ]);
    const s3s4 = definitionData('transition', 'ref.tier.transition.s3_s4');
    expect(s3s4?.['costs']).toEqual([
      { resource: 'ref.tier.resource.bm3', quantity: 108000 },
      { resource: 'ref.tier.resource.bm4', quantity: 60000 },
    ]);
    for (const id of ['ref.tier.transition.s3_s2', 'ref.tier.transition.s4_s3']) {
      expect(definitionData('transition', id)?.['refund_policy']).toEqual({ policy: 'none' });
      expect(
        (definitionData('transition', id)?.['conversion'] as Record<string, JsonValue>)[
          'population'
        ],
      ).toBe('clamp_to_target_capacity');
    }
  });

  it('[REF-7][GDD-3.3] every B4 member combines inputs from both regions', () => {
    // Resources sourced in α, including the intermediates refined there.
    const alpha = new Set(['p1', 'p2', 'p5', 'p6', 'h1', 'h3', 'h5', 'bm1', 'bm2']);
    // Resources sourced in β, including their intermediates.
    const beta = new Set(['p3', 'p4', 'p7', 'p8', 'h2', 'h4', 'h6', 'bm3', 'bm4']);
    const short = (value: JsonValue | undefined): string =>
      typeof value === 'string' ? (value.split('.').at(-1) ?? '') : '';
    const recipe = (id: string): readonly string[] =>
      (
        (definitionData('recipe', id)?.['inputs'] ?? []) as readonly Record<string, JsonValue>[]
      ).map((entry) => short(entry['resource']));
    const b4 = (
      (definitionData('needCategory', 'ref.tier.need_category.b4')?.['members'] ??
        []) as readonly Record<string, JsonValue>[]
    ).map((member) => short(member['need']));
    expect(b4.sort()).toEqual(['c10', 'c11', 'c12', 'c9']);
    for (const member of b4) {
      const inputs = recipe(`ref.tier.recipe.combine_${member}`);
      expect(inputs.some((input) => alpha.has(input))).toBe(true);
      expect(inputs.some((input) => beta.has(input))).toBe(true);
    }
  });

  it('[REF-7] the advanced combiners need AK3 and unlock at 400 S2', () => {
    const producer = componentsOf('ref.tier.entity.advanced_combiner_c9')['producer'] as Record<
      string,
      JsonValue
    >;
    const recipeId = String((producer['recipes'] as readonly string[])[0]);
    const capabilities = definitionData('recipe', recipeId)?.[
      'capability_requirements'
    ] as readonly Record<string, JsonValue>[];
    expect(capabilities).toEqual([{ resource: 'ref.tier.capability.ak3', quantity: 30 }]);
    const unlock = definitionData('unlock', 'ref.tier.unlock.s2_400');
    expect(unlock?.['targets']).toContainEqual({
      type: 'entity_definition',
      id: 'ref.tier.entity.advanced_combiner_c9',
    });
    expect(unlock?.['condition']).toBe('ref.tier.condition.s2_population_400');
  });

  it('[REF-7] T2 and T3 declare their cargo, speed, cost, and upkeep', () => {
    const t2 = definitionData('transportType', 'ref.tier.transport.t2');
    expect((t2?.['cargo'] as Record<string, JsonValue>)['slots']).toBe(4);
    expect((t2?.['cargo'] as Record<string, JsonValue>)['slot_capacity']).toBe(600000);
    expect((t2?.['movement'] as Record<string, JsonValue>)['speed_permille']).toBe(800);
    expect(t2?.['maintenance']).toMatchObject({
      inputs: [{ resource: 'ref.tier.resource.credits', quantity: 360000 }],
    });
    const t3 = definitionData('transportType', 'ref.tier.transport.t3');
    expect((t3?.['cargo'] as Record<string, JsonValue>)['slots']).toBe(6);
    expect((t3?.['movement'] as Record<string, JsonValue>)['speed_permille']).toBe(700);
  });
});

describe('[REF-7] R3 resource catalogue', () => {
  it('[REF-7] every catalogue resource carries its role tag', () => {
    const roles = new Map<string, string>([
      ['p1', 'primary'],
      ['p2', 'primary'],
      ['p3', 'primary'],
      ['p4', 'primary'],
      ['h1', 'intermediate'],
      ['h2', 'intermediate'],
      ['c1', 'consumer'],
      ['c2', 'consumer'],
      ['c3', 'consumer'],
      ['c4', 'consumer'],
      ['bm1', 'construction'],
      ['bm2', 'construction'],
      ['ep', 'establishment'],
    ]);
    for (const [code, role] of roles) {
      const tags = (definitionData('resource', `ref.tier.resource.${code}`)?.['tags'] ??
        []) as readonly string[];
      expect(tags).toContain(`ref.tier.role.${role}`);
      expect(scaleOf(`ref.tier.resource.${code}`)).toBe(6000);
    }
    const credits = definitionData('resource', 'ref.tier.resource.credits');
    expect(credits?.['allow_negative']).toBe(true);
    expect((credits?.['tags'] ?? []) as readonly string[]).toContain('balance');
  });

  it('[REF-7] EP is an establishment resource', () => {
    const ep = definitionData('resource', 'ref.tier.resource.ep');
    expect(ep?.['transportable']).toBe(true);
    const establishment = definitionData('establishment', 'ref.tier.establishment.hub');
    expect(establishment?.['costs']).toEqual([
      { resource: 'ref.tier.resource.ep', quantity: 6000 },
    ]);
  });

  it('[REF-7] consumer complexity equals the B.5 need weight', () => {
    for (const [code, complexity] of [
      ['c1', 1],
      ['c2', 2],
      ['c3', 2],
      ['c4', 3],
    ] as const) {
      expect(definitionData('resource', `ref.tier.resource.${code}`)?.['complexity']).toBe(
        complexity,
      );
    }
  });
});

describe('[REF-7] R3 tiers and needs', () => {
  it('[REF-7] the tiers provide distinct capabilities', () => {
    const s1 = definitionData('tier', 'ref.tier.population.s1');
    const s2 = definitionData('tier', 'ref.tier.population.s2');
    expect(s1?.['consumption_factor']).toBe(1000);
    expect(s2?.['consumption_factor']).toBe(1500);
    expect(s1?.['outputs']).toContainEqual({
      resource: 'ref.tier.capability.ak1',
      scope: 'location',
      rate_per_population_per_tick: 1,
    });
    expect(s2?.['outputs']).toContainEqual({
      resource: 'ref.tier.capability.ak2',
      scope: 'location',
      rate_per_population_per_tick: 1,
    });
    // Income is retuned by the balance corpus (10 -> 100 and 25 -> 250), see
    // the add-balance-runner-strategies design.
    expect(s1?.['outputs']).toContainEqual({
      resource: 'ref.tier.resource.credits',
      scope: 'owner',
      rate_per_population_per_tick: 100,
      satisfaction_curve: 'ref.tier.curve.income',
    });
    expect(s2?.['outputs']).toContainEqual({
      resource: 'ref.tier.resource.credits',
      scope: 'owner',
      rate_per_population_per_tick: 250,
      satisfaction_curve: 'ref.tier.curve.income',
    });
  });

  it('[REF-7] B1 and B2 weigh by complexity with per-tier scores', () => {
    const b1 = definitionData('needCategory', 'ref.tier.need_category.b1');
    expect((b1?.['evaluation'] as Record<string, JsonValue>)['mode']).toBe('weighted_score');
    expect(b1?.['members']).toEqual([
      { need: 'ref.tier.need.c1', weight: 1000 },
      { need: 'ref.tier.need.c2', weight: 2000 },
    ]);
    const b2 = definitionData('needCategory', 'ref.tier.need_category.b2');
    expect(b2?.['members']).toEqual([
      { need: 'ref.tier.need.c3', weight: 2000 },
      { need: 'ref.tier.need.c4', weight: 3000 },
    ]);
  });

  it('[REF-7] B3 is a coverage category', () => {
    expect(definitionData('needCategory', 'ref.tier.need_category.b3')?.['members']).toEqual([
      { need: 'ref.tier.need.coverage', weight: 1000 },
    ]);
    const coverage = definitionData('need', 'ref.tier.need.coverage');
    expect((coverage?.['demand'] as Record<string, JsonValue>)['type']).toBe('spatial_coverage');
    expect(definitionData('service', 'ref.tier.service.b3')?.['mode']).toBe('coverage');
    const provider = componentsOf('ref.tier.entity.coverage_service')['service_provider'] as Record<
      string,
      JsonValue
    >;
    expect(provider['service']).toBe('ref.tier.service.b3');
    expect(provider['relation']).toEqual({ type: 'radius', cells: 18 });
  });
});

describe('[REF-7] R3 bands and transitions', () => {
  it('[REF-7] the band table matches Appendix B.6', () => {
    const s1 = definitionData('band', 'ref.tier.bands.s1');
    const bands = (s1?.['bands'] ?? []) as readonly Record<string, JsonValue>[];
    expect(bands.map((band) => band['min'])).toEqual([0, 250, 500, 800]);
    expect(bands[3]?.['effects']).toEqual([
      { type: 'growth', policy: 'ref.tier.growth.default' },
      { type: 'enable_advancement' },
    ]);
    const s2 = definitionData('band', 'ref.tier.bands.s2');
    const s2Bands = (s2?.['bands'] ?? []) as readonly Record<string, JsonValue>[];
    expect(s2Bands[1]?.['effects']).toEqual([
      {
        type: 'trigger_decline',
        transition: 'ref.tier.transition.s2_s1',
        grace_ticks: 60,
      },
    ]);
    expect(definitionData('growthPolicy', 'ref.tier.growth.default')?.['interval_ticks']).toBe(8);
    expect(definitionData('growthPolicy', 'ref.tier.growth.emigration')?.['interval_ticks']).toBe(
      4,
    );
  });

  it('[REF-7] the income curve steps at 0.50 and 0.80', () => {
    const curve = definitionData('curve', 'ref.tier.curve.income');
    expect(curve?.['type']).toBe('step');
    expect(curve?.['points']).toEqual([
      [0, 400],
      [499, 700],
      [799, 1000],
    ]);
  });

  it('[REF-7] the S1 to S2 advancement is automatic and gated', () => {
    const advanceTransition = definitionData('transition', 'ref.tier.transition.s1_s2');
    expect(advanceTransition?.['trigger']).toBe('automatic');
    expect(advanceTransition?.['condition']).toBe('ref.tier.condition.advance_s1_s2');
    expect(advanceTransition?.['costs']).toEqual([
      { resource: 'ref.tier.resource.bm1', quantity: 60000 },
      { resource: 'ref.tier.resource.bm2', quantity: 36000 },
    ]);
    expect(advanceTransition?.['cost_access_purpose']).toBe('population_transition');
    const unlock = definitionData('unlock', 'ref.tier.unlock.s1_150');
    expect(unlock?.['condition']).toBe('ref.tier.condition.s1_population_150');
    expect(unlock?.['targets']).toContainEqual({
      type: 'transition',
      id: 'ref.tier.transition.s1_s2',
    });
    const condition = definitionData('condition', 'ref.tier.condition.advance_s1_s2');
    const expression = condition?.['expression'] as Record<string, JsonValue>;
    const clauses = expression['all'] as readonly Record<string, JsonValue>[];
    expect(clauses).toHaveLength(3);
    expect(clauses[1]?.['sustained']).toEqual({
      ticks: 60,
      condition: {
        greater_equal: { left: { aggregate_need_fulfillment: 'current_entity' }, right: 800 },
      },
    });
    expect(clauses[2]).toEqual({
      greater_equal: {
        left: { population_count: { tier: 'ref.tier.population.s1' } },
        right: 150,
      },
    });
  });

  it('[REF-7] decline refunds nothing and clamps', () => {
    const decline = definitionData('transition', 'ref.tier.transition.s2_s1');
    expect(decline?.['refund_policy']).toEqual({ policy: 'none' });
    expect((decline?.['conversion'] as Record<string, JsonValue>)['population']).toBe(
      'clamp_to_target_capacity',
    );
    expect(
      (
        definitionData('entity', 'ref.tier.entity.residence_s1')?.['components'] as Record<
          string,
          JsonValue
        >
      )?.['residence'],
    ).toMatchObject({ capacity: 10 });
  });
});

describe('[REF-7] R3 economy, transport, and exchanges', () => {
  it('[REF-7] maintenance is charged while enabled at B.3 rates', () => {
    const refiner = componentsOf('ref.tier.entity.refiner_h1')['maintenance'] as Record<
      string,
      JsonValue
    >;
    expect(refiner['charge_policy']).toBe('while_enabled');
    expect(refiner['interval_ticks']).toBe(60);
    expect(refiner['inputs']).toEqual([{ resource: 'ref.tier.resource.credits', quantity: 90000 }]);
    // 15 credits/min × 6000 base units.
    const combiner = componentsOf('ref.tier.entity.combiner_c1')['maintenance'] as Record<
      string,
      JsonValue
    >;
    expect(combiner['inputs']).toEqual([
      { resource: 'ref.tier.resource.credits', quantity: 180000 },
    ]);
  });

  it('[REF-7] each region has one exchange', () => {
    const exchanges = idsWithPrefix('exchange', 'ref.tier.exchange.');
    expect(exchanges).toHaveLength(2);
    const alpha = definitionData('exchange', 'ref.tier.exchange.alpha');
    const beta = definitionData('exchange', 'ref.tier.exchange.beta');
    expect(alpha?.['location']).toBe('ref.tier.location.alpha_3');
    expect(beta?.['location']).toBe('ref.tier.location.beta_1');
    for (const exchange of [alpha, beta]) {
      expect(exchange?.['elasticity']).toMatchObject({
        window_ticks: 600,
        step_quantity: 600000,
        step_change_permille: 20,
        recovery_permille_per_interval: 50,
        recovery_interval_ticks: 60,
      });
    }
  });

  it('[REF-7] T1 declares typed cargo', () => {
    const unit = definitionData('transportType', 'ref.tier.transport.t1');
    expect(unit?.['entity_definition']).toBe('ref.tier.entity.transport_t1');
    const cargo = unit?.['cargo'] as Record<string, JsonValue>;
    expect(cargo['compartment_policy']).toBe('typed_slots');
    expect(cargo['slots']).toBe(2);
    expect(cargo['slot_capacity']).toBe(300000);
    expect((unit?.['movement'] as Record<string, JsonValue>)['speed_permille']).toBe(1000);
    expect(unit?.['maintenance']).toMatchObject({
      interval_ticks: 60,
      inputs: [{ resource: 'ref.tier.resource.credits', quantity: 150000 }],
    });
  });

  it('[REF-7] the deficit policy pauses by highest maintenance', () => {
    const policy = definitionData('deficitPolicy', 'ref.tier.deficit.default');
    expect(policy?.['action']).toBe('pause_entities');
    expect(policy?.['order']).toEqual(['maintenance_desc', 'entity_id_asc']);
    expect(policy?.['resume']).toMatchObject({ policy: 'automatic_reverse_order' });
  });
});

describe('[REF-5] presentation package', () => {
  it('[REF-5] the presentation package declares its dependency', () => {
    const manifest = readPresentation('package.yaml') as Record<string, JsonValue>;
    const pkg = manifest['package'] as Record<string, JsonValue>;
    expect(pkg['id']).toBe('ref.tier.presentation');
    const dependencies = pkg['dependencies'] as readonly Record<string, JsonValue>[];
    expect(dependencies.some((entry) => entry['package'] === 'ref.tier')).toBe(true);
    expect(pkg['files']).toEqual(['localization.en.yaml', 'mappings.yaml', 'formatting.yaml']);
    expect((readPresentation('mappings.yaml') as Record<string, JsonValue>)['fallback']).toEqual({
      shape: 'box',
      locale: 'en',
      color: '#888888',
    });
  });

  it('[PIC-19] the presentation package validates against the simulation package', () => {
    const files = ['package.yaml', 'localization.en.yaml', 'mappings.yaml', 'formatting.yaml'].map(
      (name) => ({
        package: 'ref.tier.presentation',
        path: name,
        document: readPresentation(name),
      }),
    );
    const registryValue = registry();
    const simulationIds = new Map<string, ReadonlySet<string>>();
    const all = new Set<string>();
    for (const definition of registryValue.definitionsOf('entity')) {
      all.add(definition.id);
    }
    simulationIds.set('entity_definitions', all);
    const diagnostics = validatePresentationPackage(files, {
      simulationIds,
    });
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'warning')).toEqual([]);
  });

  it('[REF-5] every R3 definition is localized', () => {
    const document = readPresentation('localization.en.yaml') as Record<string, JsonValue>;
    const entries = (document['localization'] as Record<string, JsonValue>)['entries'] as Record<
      string,
      string
    >;
    const missing: string[] = [];
    for (const type of [
      'resource',
      'location',
      'region',
      'property',
      'slot',
      'connectivity',
      'connection',
      'world',
      'establishment',
      'entity',
      'recipe',
      'tier',
      'needCategory',
      'need',
      'service',
      'satisfactionBands',
      'growthPolicy',
      'curve',
      'transition',
      'unlock',
      'condition',
      'transportType',
      'transportOrder',
      'exchange',
      'deficitPolicy',
      'distributionRule',
    ] as const) {
      for (const definition of registry().definitionsOf(type as never)) {
        if (typeof entries[definition.id] !== 'string') missing.push(definition.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('[REF-5] locked definitions carry an unlock hint', () => {
    const document = readPresentation('localization.en.yaml') as Record<string, JsonValue>;
    const entries = (document['localization'] as Record<string, JsonValue>)['entries'] as Record<
      string,
      string
    >;
    const unlock = definitionData('unlock', 'ref.tier.unlock.s1_150');
    const targets = (unlock?.['targets'] ?? []) as readonly Record<string, string>[];
    const gated = targets
      .filter((target) => target['type'] === 'entity_definition' || target['type'] === 'transition')
      .map((target) => String(target['id']))
      .filter((id) => id !== 'ref.tier.transition.s1_s2');
    expect(gated.length).toBeGreaterThan(0);
    for (const id of gated) {
      expect(entries[`${id}.unlock_hint`]).toContain('150');
    }
  });

  it('[REF-5] the build menu maps every placeable definition', () => {
    const mappings = (readPresentation('mappings.yaml') as Record<string, JsonValue>)[
      'presentation_mapping'
    ] as readonly Record<string, JsonValue>[];
    const placeable = registry()
      .definitionsOf('entity')
      .filter((definition) => {
        const components = (definition.data as Record<string, JsonValue>)['components'] as
          Record<string, JsonValue> | undefined;
        return components?.['placement'] !== undefined;
      })
      .map((definition) => definition.id)
      .sort();
    expect(mappings.map((entry) => entry['target_definition']).sort()).toEqual(placeable);
    for (const entry of mappings) {
      const display = entry['display'] as Record<string, JsonValue>;
      expect([
        'ref.tier.category.s1',
        'ref.tier.category.s2',
        'ref.tier.category.s3',
        'ref.tier.category.s4',
      ]).toContain(display['category_key'] as string);
      expect(typeof display['sort_order']).toBe('number');
      const visual = entry['visual'] as Record<string, JsonValue>;
      expect(typeof visual['fallback_shape']).toBe('string');
    }
  });

  it('[REF-5] the presentation formatting uses the reference base scale', () => {
    const document = readPresentation('formatting.yaml') as Record<string, JsonValue>;
    const formatting = document['formatting'] as Record<string, JsonValue>;
    expect(formatting['base_scale']).toBe(6000);
    const rates = formatting['rates'] as Record<string, JsonValue>;
    expect(rates['tick_duration_ms']).toBe(1000);
    expect(rates['per_minute']).toBe(true);
  });
});
