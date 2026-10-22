import { describe, expect, it } from 'vitest';
import type { DefinitionMetadataDto, EntityDto, JsonObject, LocationDto } from '@aesfw/protocol';
import {
  archetypeOf,
  connectivityOverlay,
  entityShapes,
  gridCells,
  shapeGrammar,
  stateEncoding,
  suitabilityOverlay,
} from './grid.js';
import type { ShapeArchetype } from './grid.js';

const metadata = (components: JsonObject): DefinitionMetadataDto => ({
  definition_id: 'test.entity.a',
  definition_type: 'entity',
  tags: [],
  parameters: { components },
});

const entity = (overrides: Partial<EntityDto> = {}): EntityDto => ({
  entity_id: 1,
  ...overrides,
});

const location = (overrides: Partial<LocationDto> = {}): LocationDto => ({
  entity_id: 100,
  ...overrides,
});

const archetypes = new Map<string, ShapeArchetype>([['test.entity.a', 'refiner']]);

describe('[REF-12.2] gridCells', () => {
  it('[REF-12.2] a grid exposes its cells and blocked set', () => {
    const model = gridCells(location({ grid: { width: 4, height: 3, blocked: [1, 6] } }));
    expect(model?.cells).toHaveLength(12);
    expect(model?.cells.find((cell) => cell.x === 1 && cell.y === 0)?.blocked).toBe(true);
    expect(model?.cells.find((cell) => cell.x === 2 && cell.y === 1)?.blocked).toBe(true);
  });

  it('[REF-12.2] an abstract location has no grid', () => {
    expect(gridCells(location())).toBeNull();
  });
});

describe('[REF-10.2] shapeGrammar', () => {
  it('[REF-10.2] a connector is a line', () => {
    expect(shapeGrammar('connector')).toEqual({ kind: 'line', interior: 'none' });
  });

  it('[REF-10.2] a residence is a circle', () => {
    expect(shapeGrammar('residence').kind).toBe('circle');
  });

  it('[REF-10.2] a slot extractor is a triangle on a slot ring', () => {
    expect(shapeGrammar('slot_extractor')).toEqual({
      kind: 'triangle_ring',
      interior: 'progress_rise',
    });
  });

  it('[REF-10.2] an unknown archetype falls back to a box', () => {
    expect(shapeGrammar('unknown').kind).toBe('box');
  });
});

describe('[REF-10.2] archetypeOf', () => {
  it('[REF-10.2] a slot-dependent source is a slot extractor', () => {
    const value = metadata({ resource_source: { policy: 'slot_dependent', outputs: [] } });
    expect(archetypeOf(value)).toBe('slot_extractor');
  });

  it('[REF-10.2] an area-dependent source is an area extractor', () => {
    const value = metadata({ resource_source: { policy: 'area_dependent', outputs: [] } });
    expect(archetypeOf(value)).toBe('area_extractor');
  });

  it('[REF-10.2] a residence is a residence', () => {
    expect(archetypeOf(metadata({ residence: {} }))).toBe('residence');
  });

  it('[REF-10.2] a producer is a refiner', () => {
    expect(archetypeOf(metadata({ producer: {} }))).toBe('refiner');
  });

  it('[REF-10.2] a connectivity provider is a connector', () => {
    expect(archetypeOf(metadata({ connectivity: { provides: 'test.connectivity.hub' } }))).toBe(
      'connector',
    );
  });

  it('[REF-10.2] a definition with no known component is unknown', () => {
    expect(archetypeOf(metadata({}))).toBe('unknown');
  });
});

describe('[REF-12.2][REF-14.3] entityShapes', () => {
  it('[REF-12.2][REF-14.3] a placed entity is drawn at its logical position', () => {
    const shapes = entityShapes(
      location(),
      [
        entity({
          location_id: 100,
          definition_id: 'test.entity.a',
          spatial: {
            logical_position: [10, 12],
            orientation: 0,
            footprint: { width: 2, height: 3 },
          },
        }),
      ],
      archetypes,
    );
    expect(shapes).toHaveLength(1);
    expect(shapes[0]).toMatchObject({ x: 10, y: 12, width: 2, height: 3 });
  });

  it('[REF-12.2][REF-14.3] orientation swaps the footprint axes', () => {
    const shapes = entityShapes(
      location(),
      [
        entity({
          location_id: 100,
          definition_id: 'test.entity.a',
          spatial: { logical_position: [0, 0], orientation: 1, footprint: { width: 2, height: 3 } },
        }),
      ],
      archetypes,
    );
    expect(shapes[0]).toMatchObject({ width: 3, height: 2 });
  });

  it('[REF-12.2][REF-14.3] an unplaced entity is omitted', () => {
    const shapes = entityShapes(
      location(),
      [entity({ location_id: 100, definition_id: 'test.entity.a' })],
      archetypes,
    );
    expect(shapes).toHaveLength(0);
  });
});

describe('[REF-10.3] stateEncoding', () => {
  it('[REF-10.3] a constructing entity is planned', () => {
    expect(stateEncoding(entity({ lifecycle: 'constructing' }))).toMatchObject({
      state: 'planned',
      dashed: true,
    });
  });

  it('[REF-10.3] a missing input is blocked with an input glyph', () => {
    const value = entity({
      production: {
        state: 'blocked',
        progress: 0,
        progress_scale: 1000,
        block_reasons: ['missing_input'],
      },
    });
    expect(stateEncoding(value)).toMatchObject({ state: 'blocked', glyph: 'I' });
  });

  it('[REF-10.3] a throughput block is throttled', () => {
    const value = entity({
      production: {
        state: 'blocked',
        progress: 0,
        progress_scale: 1000,
        block_reasons: ['throughput_throttled'],
      },
    });
    expect(stateEncoding(value)).toMatchObject({ state: 'throttled', glyph: 'T' });
  });

  it('[REF-10.3] a processing producer reports progress', () => {
    const value = entity({
      production: {
        state: 'processing',
        progress: 500,
        progress_scale: 1000,
        block_reasons: [],
      },
    });
    expect(stateEncoding(value)).toMatchObject({ state: 'processing', progressPermille: 500 });
  });
});

describe('[REF-12.2] overlays', () => {
  it('[REF-12.2] a connected requirement is listed', () => {
    const markers = connectivityOverlay([
      entity({
        connectivity: {
          role: 'requirement',
          network: 'test.connectivity.hub',
          connected: true,
        },
      }),
    ]);
    expect(markers).toEqual([
      {
        entityId: 1,
        network: 'test.connectivity.hub',
        role: 'requirement',
        connected: true,
      },
    ]);
  });

  it('[REF-12.2] an entity without connectivity is omitted', () => {
    expect(connectivityOverlay([entity()])).toHaveLength(0);
  });

  it('[REF-12.2] a suitability property is read', () => {
    const value = location({
      properties: { tags: [], values: { 'test.property.suitability': 1000 } },
    });
    expect(suitabilityOverlay(value, 'test.property.suitability')).toBe(1000);
  });

  it('[REF-12.2] a missing property returns null', () => {
    expect(suitabilityOverlay(location(), 'test.property.suitability')).toBeNull();
  });
});
