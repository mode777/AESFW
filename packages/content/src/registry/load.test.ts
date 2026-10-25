import { describe, expect, it } from 'vitest';

import { createMemorySource } from '../package/source.js';
import { loadContent } from './load.js';

const manifestYaml = (files: readonly string[]): string =>
  [
    'package:',
    '  id: test.game',
    '  version: 1.0.0',
    '  schema_version: 1',
    '  type: simulation_content',
    '  files:',
    ...files.map((file) => `    - ${file}`),
  ].join('\n') + '\n';

const source = (contentYaml: string) =>
  createMemorySource('test.game', {
    'package.yaml': manifestYaml(['content.yaml']),
    'content.yaml': contentYaml,
  });

const validContent = [
  'resources:',
  '  - id: test.resource.a',
  '    tags: [storable]',
  '    quantity: { precision: fixed, scale: 1000 }',
  '    storage: { policy: normal, scope: inventory }',
  '    transportable: true',
  '  - id: test.capability.tier_1',
  '    tags: [capability]',
  '    quantity: { precision: integer, scale: 1 }',
  '    storage: { policy: recomputed, scope: location }',
  '    transportable: false',
  'recipes:',
  '  - id: test.recipe.a',
  '    mode: batch',
  '    duration_ticks: 10',
  '    inputs: [{ resource: test.resource.a, quantity: 1000 }]',
  '    outputs: []',
  '    capability_requirements: [{ resource: test.capability.tier_1, quantity: 1 }]',
  'entity_definitions:',
  '  - id: test.entity.producer',
  '    components:',
  '      producer:',
  '        recipes: [test.recipe.a]',
  '        process_slots: 1',
  '        input_inventory: location.shared',
  '        output_inventory: location.shared',
  '',
].join('\n');

describe('[CONT-12][TDS-20.1] content load orchestration', () => {
  it('[TDS-20.1] valid sources compile to content', () => {
    const result = loadContent([source(validContent)]);
    expect(result.diagnostics).toEqual([]);
    expect(result.content).not.toBeNull();
    expect(typeof result.content?.checksum).toBe('string');
    expect(result.content?.packages).toEqual([
      { id: 'test.game', version: '1.0.0', type: 'simulation_content' },
    ]);
  });

  it('[TDS-20.1] an error yields null content', () => {
    const broken = validContent.replace(
      'test.resource.a, quantity: 1000',
      'test.resource.absent, quantity: 1000',
    );
    const result = loadContent([source(broken)]);
    expect(result.content).toBeNull();
    expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
  });

  it('[TDS-20.2] an invalid condition fails the load', () => {
    const yaml = [
      'conditions:',
      '  - id: test.condition.a',
      '    expression: { telepathy: 1 }',
      '',
    ].join('\n');
    const result = loadContent([source(yaml)]);
    expect(result.content).toBeNull();
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'unknown_operator')).toBe(
      true,
    );
  });

  it('[CONT-12][CONT-11.5] a graph error fails the load before registry compilation', () => {
    const yaml = [
      'resources:',
      '  - id: test.resource.a',
      '    tags: [storable]',
      '    quantity: { precision: fixed, scale: 1000 }',
      '    storage: { policy: normal, scope: inventory }',
      '    transportable: true',
      'recipes:',
      '  - id: test.recipe.a',
      '    mode: batch',
      '    duration_ticks: 10',
      '    inputs: [{ resource: test.resource.a, quantity: 1000 }]',
      '    outputs: []',
      'entity_definitions:',
      '  - id: test.entity.producer',
      '    components:',
      '      producer:',
      '        recipes: [test.recipe.a]',
      '        process_slots: 1',
      '        input_inventory: location.shared',
      '        output_inventory: location.shared',
      'location_templates:',
      '  - id: test.location.a',
      '    spatial_policy: framework.spatial.abstract_capacity',
      '    spatial_parameters: { total_capacity: 100 }',
      '    inventories:',
      '      - id: shared',
      '        capacity: { mode: total, quantity: 1000000 }',
      '        access_policy: framework.inventory.shared_location',
      '    activation: { initial: true }',
      'worlds:',
      '  - id: test.world',
      '    locations:',
      '      - { id: test.loc.0, template: test.location.a }',
      '',
    ].join('\n');
    const result = loadContent([source(yaml)]);
    expect(result.content).toBeNull();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'unsourceable_resource',
    );
  });
});
