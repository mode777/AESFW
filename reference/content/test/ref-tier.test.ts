import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  createMemorySource,
  loadContent,
  parseYamlStrict,
  validatePresentationPackage,
} from '@aesfw/content';
import type { ContentRegistry, JsonValue } from '@aesfw/content';
import { runScenario } from '@aesfw/testkit/scenario';
import type { Scenario } from '@aesfw/testkit/scenario';
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

const source = createMemorySource('ref.tier', {
  'package.yaml': read('package.yaml'),
  'content.yaml': read('content.yaml'),
});

const loaded = loadContent([source], { strictness: 'strict' });

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

describe('[REF-5] reference content package', () => {
  it('[REF-5] the reference content validates strictly', () => {
    expect(loaded.content).not.toBeNull();
    expect(loaded.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('[REF-5] the reference content defines the closed loop', () => {
    expect(definitionData('recipe', 'ref.tier.recipe.refine')).not.toBeNull();
    expect(definitionData('recipe', 'ref.tier.recipe.combine')).not.toBeNull();
    expect(definitionData('need', 'ref.tier.need.c1')).not.toBeNull();
  });

  it('[REF-5] every storable resource uses the reference base scale', () => {
    for (const code of ['p1', 'p2', 'h1', 'c1', 'bm1']) {
      expect(scaleOf(`ref.tier.resource.${code}`)).toBe(6000);
    }
  });
  it('[REF-5] the reference content runs', () => {
    const content = loaded.content;
    if (content === null) throw new Error('reference content failed to load');
    const scenario: Scenario = {
      id: 'ref.tier.scenario.builder',
      requirements: [],
      content: { packages: ['ref.tier'] },
      setup: { seed: [0, 0], tickDurationMs: 1000, world: null },
      commands: [],
      run: { ticks: 100, hashInterval: 0, invariants: true },
      golden: null,
      expect: [],
    };
    const report = runScenario(scenario, content);
    expect(report.findings).toEqual([]);
  });
});

describe('[REF-7] R1 builder content', () => {
  it('[REF-7] the grid location declares its geometry, property, and slot', () => {
    const location = definitionData('location', 'ref.tier.location.a');
    expect(location?.['spatial_policy']).toBe('framework.spatial.grid');
    const parameters = location?.['spatial_parameters'] as Record<string, JsonValue>;
    expect(parameters['width']).toBe(40);
    expect(parameters['height']).toBe(40);
    expect(parameters['buildable_ratio']).toEqual({ min: 400, max: 700 });
    expect(location?.['properties']).toEqual({ 'ref.tier.property.suitability_p1': 1000 });
    expect(location?.['source_slots']).toEqual([{ type: 'ref.tier.slot.v_a', count: 2 }]);
  });

  it('[REF-7] BM1 is a construction resource', () => {
    const bm1 = definitionData('resource', 'ref.tier.resource.bm1');
    expect(bm1?.['tags']).toContain('ref.tier.role.construction');
    expect(bm1?.['transportable']).toBe(true);
    expect(scaleOf('ref.tier.resource.bm1')).toBe(6000);
  });

  it('[REF-7] the slot extractor declares a slot-dependent source', () => {
    const components = componentsOf('ref.tier.entity.slot_extractor_p2');
    const source = components['resource_source'] as Record<string, JsonValue>;
    expect(source['policy']).toBe('slot_dependent');
    expect(source['outputs']).toEqual([
      { resource: 'ref.tier.resource.p2', quantity_per_tick: 400 },
    ]);
    const placement = components['placement'] as Record<string, JsonValue>;
    expect(placement['requires_slot']).toBe('ref.tier.slot.v_a');
  });

  it('[REF-7] the area extractor declares a property-scaled source', () => {
    const components = componentsOf('ref.tier.entity.area_extractor_p1');
    const source = components['resource_source'] as Record<string, JsonValue>;
    expect(source['policy']).toBe('area_dependent');
    expect(source['scale_by_property']).toBe('ref.tier.property.suitability_p1');
    const placement = components['placement'] as Record<string, JsonValue>;
    expect(placement['working_area']).toEqual({ cells: 12, exclusive: true });
  });

  it('[REF-7] the refiner declares the refining recipe', () => {
    const components = componentsOf('ref.tier.entity.refiner');
    const producer = components['producer'] as Record<string, JsonValue>;
    expect(producer['recipes']).toEqual(['ref.tier.recipe.refine']);
    const recipe = definitionData('recipe', 'ref.tier.recipe.refine');
    expect(recipe?.['duration_ticks']).toBe(30);
    expect(recipe?.['inputs']).toEqual([
      { resource: 'ref.tier.resource.p1', quantity: 6000 },
      { resource: 'ref.tier.resource.p2', quantity: 6000 },
    ]);
    expect(recipe?.['outputs']).toEqual([{ resource: 'ref.tier.resource.h1', quantity: 6000 }]);
  });

  it('[REF-7] the connector provides the hub network', () => {
    const components = componentsOf('ref.tier.entity.connector');
    expect(components['connectivity']).toEqual({
      provides: 'ref.tier.connectivity.hub_network',
    });
    expect(components['producer']).toBeUndefined();
  });
});

describe('[REF-5] presentation skeleton', () => {
  it('[REF-5] the presentation package declares its dependency', () => {
    const manifest = readPresentation('package.yaml') as Record<string, JsonValue>;
    const pkg = manifest['package'] as Record<string, JsonValue>;
    expect(pkg['id']).toBe('ref.tier.presentation');
    const dependencies = pkg['dependencies'] as readonly Record<string, JsonValue>[];
    expect(dependencies.some((entry) => entry['package'] === 'ref.tier')).toBe(true);
    expect(pkg['files']).toEqual(['localization.en.yaml', 'mappings.yaml', 'formatting.yaml']);
  });

  it('[PIC-19] the presentation package validates against the simulation package', () => {
    const manifest = readPresentation('package.yaml') as Record<string, JsonValue>;
    expect((manifest['package'] as Record<string, JsonValue>)['type']).toBe('presentation');
    const files = ['package.yaml', 'localization.en.yaml', 'mappings.yaml', 'formatting.yaml'].map(
      (name) => ({
        package: 'ref.tier.presentation',
        path: name,
        document: readPresentation(name),
      }),
    );
    const loaded = loadContent([source], { strictness: 'strict' });
    const registry = loaded.content?.registry;
    expect(registry).not.toBeNull();
    const simulationIds = new Map<string, ReadonlySet<string>>();
    for (const type of ['resources', 'entity_definitions'] as const) {
      simulationIds.set(
        type,
        new Set((registry as ContentRegistry).definitionsOf(type as never).map((d) => d.id)),
      );
    }
    const diagnostics = validatePresentationPackage(files, { simulationIds });
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('[REF-5] the presentation formatting uses the reference base scale', () => {
    const document = readPresentation('formatting.yaml') as Record<string, JsonValue>;
    const formatting = document['formatting'] as Record<string, JsonValue>;
    expect(formatting['base_scale']).toBe(6000);
    const rates = formatting['rates'] as Record<string, JsonValue>;
    expect(rates['tick_duration_ms']).toBe(1000);
  });
});

describe('[REF-7] R2 world and transport content', () => {
  it('[REF-7] the R2 world has two connected locations', () => {
    const world = definitionData('world', 'ref.tier.world.r2');
    expect(world).not.toBeNull();
    const locations = world?.['locations'] as readonly Record<string, JsonValue>[];
    expect(locations).toHaveLength(2);
    const connections = world?.['connections'] as readonly Record<string, JsonValue>[];
    expect(connections).toHaveLength(1);
    expect(connections[0]?.['origin']).toBe('ref.tier.loc.a');
    expect(connections[0]?.['destination']).toBe('ref.tier.loc.b');
  });

  it('[REF-7] the R2 transport unit declares typed cargo and handling', () => {
    const unit = definitionData('transportType', 'ref.tier.transport.basic');
    expect(unit?.['entity_definition']).toBe('ref.tier.entity.transport');
    const cargo = unit?.['cargo'] as Record<string, JsonValue>;
    expect(cargo['compartment_policy']).toBe('typed_slots');
    expect(cargo['slots']).toBe(2);
    const handling = unit?.['handling'] as Record<string, JsonValue>;
    expect(handling['loading_rate_per_tick']).toBe(10000);
  });
});
