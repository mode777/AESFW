/**
 * Scripted player strategies for the reference content (REF-8). Each strategy
 * is a player-command scenario: placements through `PlaceEntityPlan`, purpose
 * locks through `SetResourcePurposeLock`, and transports through the transport
 * commands. Definition handles are resolved from the compiled registry, so the
 * corpus follows content retunes instead of pinning handle numbers.
 *
 * Source: REF-8
 */
import type { Scenario, ScenarioCommand } from '@aesfw/testkit/scenario';
import type { JsonValue } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';

/** The build step of a strategy: one entity definition and its footprint. */
export interface BuildStep {
  /** The entity definition string ID. */
  readonly definition: string;
  /** The tick the command is issued at. */
  readonly tick: number;
}

/** A placed build step with its resolved position. */
export interface Placement extends BuildStep {
  readonly x: number;
  readonly y: number;
}

const footprintOf = (registry: ContentRegistry, id: string): readonly [number, number] => {
  const definition = registry.definitionsOf('entity').find((entry) => entry.id === id);
  const components = (definition?.data as Record<string, JsonValue> | undefined)?.['components'] as
    Record<string, JsonValue> | undefined;
  const placement = components?.['placement'] as Record<string, JsonValue> | undefined;
  const footprint = placement?.['footprint'];
  if (!Array.isArray(footprint) || footprint.length !== 2) {
    throw new Error(`${id} declares no footprint`);
  }
  const width: unknown = footprint[0];
  const height: unknown = footprint[1];
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new Error(`${id} declares an invalid footprint`);
  }
  return [width, height];
};

/** The grid a strategy builds on. */
export interface GridSpec {
  readonly width: number;
  readonly height: number;
  readonly blocked: readonly number[];
  /** Cells already occupied by authored entities, kept free by the packer. */
  readonly occupied?: readonly number[];
}

/**
 * Packs the steps into the first free rectangle of each footprint, scanning
 * row-major and marking every claimed cell (REF-8 D6: deterministic layout).
 * Returns `null` when a step does not fit, so the caller can fail loudly
 * instead of running a half-built strategy.
 *
 * Source: REF-8
 */
export function packPlacements(
  registry: ContentRegistry,
  grid: GridSpec,
  steps: readonly BuildStep[],
): readonly Placement[] | null {
  const used = new Set<number>([...grid.blocked, ...(grid.occupied ?? [])]);
  const placed = new Map<number, { x: number; y: number }>();
  // Largest footprint first: fragmentation makes the order matter, and a few
  // 4x4 fits are what fail first when the small blocks are packed greedily.
  const order = steps
    .map((step, index) => {
      const [width, height] = footprintOf(registry, step.definition);
      return { index, step, area: width * height };
    })
    .sort((a, b) => (a.area === b.area ? a.index - b.index : b.area - a.area));
  for (const entry of order) {
    const [width, height] = footprintOf(registry, entry.step.definition);
    let found: { x: number; y: number } | null = null;
    for (let y = 0; y <= grid.height - height && found === null; y += 1) {
      for (let x = 0; x <= grid.width - width && found === null; x += 1) {
        let free = true;
        for (let dy = 0; dy < height && free; dy += 1) {
          for (let dx = 0; dx < width && free; dx += 1) {
            if (used.has((y + dy) * grid.width + (x + dx))) free = false;
          }
        }
        if (free) found = { x, y };
      }
    }
    if (found === null) return null;
    for (let dy = 0; dy < height; dy += 1) {
      for (let dx = 0; dx < width; dx += 1) {
        used.add((found.y + dy) * grid.width + (found.x + dx));
      }
    }
    placed.set(entry.index, found);
  }
  const placements: Placement[] = [];
  steps.forEach((step, index) => {
    const position = placed.get(index);
    if (position !== undefined) placements.push({ ...step, ...position });
  });
  return placements;
}

/** Turns placements into `PlaceEntityPlan` wire commands. */
export const placementCommands = (
  _registry: ContentRegistry,
  location: number,
  placements: readonly Placement[],
  actor: string,
): readonly ScenarioCommand[] =>
  placements.map((placement) => ({
    tick: placement.tick,
    actor,
    type: 'PlaceEntityPlan',
    payload: {
      definition_id: placement.definition,
      location_id: location,
      logical_transform: { position: [placement.x, placement.y], orientation: 0 },
    },
  }));

/** Builds a scenario shell with the reference world and the given commands. */
export const scenarioOf = (
  id: string,
  commands: readonly ScenarioCommand[],
  ticks: number,
  seed: readonly [number, number] = [1, 2],
): Scenario => ({
  id,
  requirements: ['REF-8'],
  content: { packages: ['reference/content/ref.tier'] },
  setup: { seed, tickDurationMs: 1000, world: 'ref.tier.world.prototype' },
  commands,
  run: { ticks, hashInterval: 0, invariants: true, metricsInterval: 60 },
  golden: null,
  expect: [],
});
