/**
 * Pure grid selectors for the location grid view (REF-10.2, REF-10.3,
 * REF-12.2, REF-14.3). Every shape, state, and overlay the grid draws is
 * derived here from protocol DTOs; no mechanics are computed (PIC-2.2) and no
 * DOM work happens (REF-14.2).
 *
 * Source: REF-10.2, REF-10.3, REF-12.2, REF-14.3, PIC-9.1, PIC-10.2
 */
import type {
  DefinitionMetadataDto,
  EntityDto,
  JsonObject,
  JsonValue,
  LocationDto,
} from '@aesfw/protocol';

/** The REF-10.2 shape kinds. */
export type ShapeKind =
  | 'square_inner_square'
  | 'line'
  | 'triangle_ring'
  | 'triangle_area'
  | 'square'
  | 'square_notches'
  | 'circle'
  | 'diamond'
  | 'square_bars'
  | 'dot'
  | 'box';

/** The REF-10.2 interior encodings. */
export type InteriorEncoding =
  'storage_bar' | 'progress_rise' | 'progress_sweep' | 'occupancy_rings' | 'none';

/** The archetypes of GDD-9.11 as the grid renders them (REF-10.2). */
export type ShapeArchetype =
  | 'location_hub'
  | 'connector'
  | 'slot_extractor'
  | 'area_extractor'
  | 'refiner'
  | 'combiner'
  | 'advanced_combiner'
  | 'residence'
  | 'coverage_service'
  | 'storage_module'
  | 'transport_unit'
  | 'unknown';

/** One shape grammar entry (REF-10.2). */
export interface ShapeDescriptor {
  readonly kind: ShapeKind;
  readonly interior: InteriorEncoding;
}

const SHAPES: Readonly<Record<ShapeArchetype, ShapeDescriptor>> = {
  location_hub: { kind: 'square_inner_square', interior: 'storage_bar' },
  connector: { kind: 'line', interior: 'none' },
  slot_extractor: { kind: 'triangle_ring', interior: 'progress_rise' },
  area_extractor: { kind: 'triangle_area', interior: 'progress_rise' },
  refiner: { kind: 'square', interior: 'progress_sweep' },
  combiner: { kind: 'square_notches', interior: 'progress_sweep' },
  advanced_combiner: { kind: 'square_notches', interior: 'progress_sweep' },
  residence: { kind: 'circle', interior: 'occupancy_rings' },
  coverage_service: { kind: 'diamond', interior: 'none' },
  storage_module: { kind: 'square_bars', interior: 'none' },
  transport_unit: { kind: 'dot', interior: 'none' },
  unknown: { kind: 'box', interior: 'none' },
};

/**
 * Maps an archetype to its REF-10.2 shape and interior encoding.
 *
 * Source: REF-10.2
 */
export function shapeGrammar(archetype: ShapeArchetype): ShapeDescriptor {
  return SHAPES[archetype];
}

const asObject = (value: JsonValue | undefined): JsonObject | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;

const asString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * Derives the shape archetype of an entity definition from mechanically safe
 * metadata (PIC-4), without computing mechanics. A producer renders as the
 * refiner square until recipe input counts reach the client.
 *
 * Source: REF-10.2, PIC-4
 */
export function archetypeOf(metadata: DefinitionMetadataDto): ShapeArchetype {
  const components = asObject(metadata.parameters['components']);
  if (components === undefined) return 'unknown';
  if (components['residence'] !== undefined) return 'residence';
  if (components['producer'] !== undefined) return 'refiner';
  const source = asObject(components['resource_source']);
  if (source !== undefined) {
    const policy = asString(source['policy']);
    if (policy === 'slot_dependent') return 'slot_extractor';
    if (policy === 'area_dependent') return 'area_extractor';
  }
  const connectivity = asObject(components['connectivity']);
  if (connectivity !== undefined && connectivity['provides'] !== undefined) return 'connector';
  if (components['storage_access'] !== undefined) return 'storage_module';
  return 'unknown';
}

/** One grid cell (REF-12.2). */
export interface GridCell {
  readonly x: number;
  readonly y: number;
  readonly blocked: boolean;
}

/** The cell model of a grid location (REF-12.2). */
export interface GridCellModel {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly GridCell[];
}

/**
 * Builds the cell model of a grid-policy location, ordered by ascending packed
 * index (`y * width + x`). Returns `null` for a location without a grid.
 *
 * Source: REF-12.2, PIC-9.1
 */
export function gridCells(location: LocationDto): GridCellModel | null {
  const grid = location.grid;
  if (grid === undefined) return null;
  const blocked = new Set(grid.blocked);
  const cells: GridCell[] = [];
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      cells.push({ x, y, blocked: blocked.has(y * grid.width + x) });
    }
  }
  return { width: grid.width, height: grid.height, cells };
}

/** The REF-10.3 visual states. */
export type EntityState = 'processing' | 'idle' | 'blocked' | 'throttled' | 'planned' | 'nominal';

/** The REF-10.3 state encoding of an entity (REF-10.3). */
export interface StateEncoding {
  readonly state: EntityState;
  readonly glyph?: string;
  readonly dashed?: boolean;
  readonly progressPermille?: number;
}

const BLOCK_GLYPHS: Readonly<Record<string, string>> = {
  missing_input: 'I',
  no_source_slot: 'I',
  no_working_area: 'I',
  missing_capability: 'C',
  missing_inventory_access: 'A',
  missing_output_capacity: 'O',
  throughput_throttled: 'T',
};

const PLANNED_LIFECYCLES = new Set(['planned', 'awaiting_resources', 'constructing']);

/**
 * Encodes the REF-10.3 visual state from the entity's lifecycle, production
 * state, and block reasons.
 *
 * Source: REF-10.3
 */
export function stateEncoding(entity: EntityDto): StateEncoding {
  const lifecycle = entity.lifecycle;
  if (lifecycle !== undefined && PLANNED_LIFECYCLES.has(lifecycle)) {
    return { state: 'planned', dashed: true };
  }
  const production = entity.production;
  if (production !== undefined) {
    const reason = production.block_reasons[0];
    if (reason !== undefined) {
      const glyph = BLOCK_GLYPHS[reason];
      const state: EntityState = reason === 'throughput_throttled' ? 'throttled' : 'blocked';
      return glyph !== undefined ? { state, glyph } : { state };
    }
    if (production.state === 'processing') {
      const progressPermille =
        production.progress_scale > 0
          ? Math.round((production.progress * 1000) / production.progress_scale)
          : 0;
      return { state: 'processing', progressPermille };
    }
    if (production.state === 'idle') return { state: 'idle' };
  }
  return { state: 'nominal' };
}

/** One entity shape placed on the grid (REF-12.2, REF-14.3). */
export interface EntityShape {
  readonly entityId: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly shape: ShapeDescriptor;
  readonly state: StateEncoding;
  readonly label: string;
}

/**
 * Places the entities of a location as shapes, ordered by ascending entity ID.
 * Entities without spatial data are omitted.
 *
 * Source: REF-12.2, REF-14.3, PIC-9.1
 */
export function entityShapes(
  location: LocationDto,
  entities: readonly EntityDto[],
  archetypes: ReadonlyMap<string, ShapeArchetype>,
): readonly EntityShape[] {
  const shapes: EntityShape[] = [];
  for (const entity of entities) {
    if (entity.location_id !== location.entity_id) continue;
    const spatial = entity.spatial;
    if (spatial === undefined) continue;
    const definitionId = entity.definition_id;
    const archetype =
      definitionId !== undefined ? (archetypes.get(definitionId) ?? 'unknown') : 'unknown';
    const footprint = spatial.footprint;
    const baseWidth = footprint?.width ?? 1;
    const baseHeight = footprint?.height ?? 1;
    const swap = spatial.orientation % 2 === 1;
    shapes.push({
      entityId: entity.entity_id,
      x: spatial.logical_position[0],
      y: spatial.logical_position[1],
      width: swap ? baseHeight : baseWidth,
      height: swap ? baseWidth : baseHeight,
      shape: shapeGrammar(archetype),
      state: stateEncoding(entity),
      label: definitionId ?? String(entity.entity_id),
    });
  }
  return shapes.sort((a, b) => a.entityId - b.entityId);
}

/** One connectivity overlay marker (REF-12.2). */
export interface ConnectivityMarker {
  readonly entityId: number;
  readonly network: string;
  readonly role: string;
  readonly connected: boolean;
}

/**
 * Builds the connectivity overlay, ordered by ascending entity ID. Entities
 * without connectivity are omitted.
 *
 * Source: REF-12.2, PIC-10.2
 */
export function connectivityOverlay(entities: readonly EntityDto[]): readonly ConnectivityMarker[] {
  const markers: ConnectivityMarker[] = [];
  for (const entity of entities) {
    const connectivity = entity.connectivity;
    if (connectivity === undefined) continue;
    markers.push({
      entityId: entity.entity_id,
      network: connectivity.network,
      role: connectivity.role,
      connected: connectivity.connected,
    });
  }
  return markers.sort((a, b) => a.entityId - b.entityId);
}

/**
 * Reads the suitability value of a property from a location's property values,
 * or `null` when the location or value is absent.
 *
 * Source: REF-12.2, PIC-9.1, PIC-10.2
 */
export function suitabilityOverlay(location: LocationDto, propertyId: string): number | null {
  return location.properties?.values?.[propertyId] ?? null;
}
