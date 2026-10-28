/**
 * Scripted player strategies for the reference content (REF-8). Each strategy
 * is a player-command scenario: placements through `PlaceEntityPlan`, enable
 * toggles through `SetEntityEnabled`, and purpose locks where they pace
 * advancement. Scene entities are addressed with the `@<definition>#<n>`
 * syntax VER-9.1 defines, which the runner resolves at the command's tick, so
 * a strategy never predicts entity IDs.
 *
 * Source: REF-8
 */
import type { JsonValue } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import type { Scenario, ScenarioCommand } from '@aesfw/testkit/scenario';

/** The build step of a strategy: one entity definition and its tick. */
export interface BuildStep {
  readonly definition: string;
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
  const raw = placement?.['footprint'];
  const width = Array.isArray(raw) ? (raw as readonly JsonValue[])[0] : undefined;
  const height = Array.isArray(raw) ? (raw as readonly JsonValue[])[1] : undefined;
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new Error(`${id} declares no footprint`);
  }
  return [width, height];
};

/** A grid a strategy builds on. */
export interface GridSpec {
  readonly width: number;
  readonly height: number;
  readonly blocked: readonly number[];
  /** Cells already occupied by authored entities, kept free by the packer. */
  readonly occupied?: readonly number[];
}

/**
 * Packs the steps into the first free rectangle of each footprint, largest
 * footprint first, scanning row-major and marking every claimed cell (REF-8
 * D6). Returns `null` when a step does not fit, so the caller fails loudly
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

/** A `SetEntityEnabled` command addressed by definition and ordinal. */
export const toggle = (
  definition: string,
  ordinal: number,
  enabled: boolean,
  tick: number,
  actor = 'owner.0',
): ScenarioCommand => ({
  tick,
  actor,
  type: 'SetEntityEnabled',
  payload: { entity_id: `@${definition}#${ordinal}`, enabled },
});

/** Builds a scenario shell with the reference world and the given commands. */
export const scenarioOf = (
  id: string,
  commands: readonly ScenarioCommand[],
  ticks: number,
  seed: readonly [number, number] = [1, 2],
  metricsInterval = 60,
): Scenario => ({
  id,
  requirements: ['REF-8'],
  content: { packages: ['reference/content/ref.tier'] },
  setup: { seed, tickDurationMs: 1000, world: 'ref.tier.world.prototype' },
  commands,
  run: { ticks, hashInterval: 0, invariants: true, metricsInterval },
  golden: null,
  expect: [],
});

/**
 * The entities a build places beside the authored start state. `advancedBranch`
 * adds the BM2 refiner and the C1 combiner; the pyramid strategy leaves them
 * out so the base cannot be rebuilt after the first advancement.
 *
 * Source: REF-8
 */
export function openingBuild(
  residences = 14,
  options: { readonly bm2?: boolean; readonly combiner?: boolean } = {},
): readonly BuildStep[] {
  const bm2 = options.bm2 ?? true;
  const combiner = options.combiner ?? true;
  return [
    ...Array.from({ length: residences }, () => ({
      definition: 'ref.tier.entity.residence_s1',
      tick: 1,
    })),
    { definition: 'ref.tier.entity.slot_extractor_p2', tick: 1 },
    { definition: 'ref.tier.entity.slot_extractor_p2', tick: 1 },
    { definition: 'ref.tier.entity.slot_extractor_p2', tick: 1 },
    { definition: 'ref.tier.entity.area_extractor_p1', tick: 1 },
    { definition: 'ref.tier.entity.refiner_bm1', tick: 1 },
    { definition: 'ref.tier.entity.refiner_bm1', tick: 1 },
    { definition: 'ref.tier.entity.refiner_bm1', tick: 1 },
    { definition: 'ref.tier.entity.storage_module', tick: 1 },
    // The advanced branch is built when its upkeep is affordable, so it never
    // needs a disable toggle: placement is the enable.
    ...(bm2 ? [{ definition: 'ref.tier.entity.refiner_bm2', tick: 740 }] : []),
    ...(combiner
      ? [
          { definition: 'ref.tier.entity.combiner_c1', tick: 900 },
          { definition: 'ref.tier.entity.coverage_service', tick: 900 },
        ]
      : []),
  ];
}

/** The entities the opening places (REF-8 task 3.1). */
export const OPENING_BUILD: readonly BuildStep[] = openingBuild();

/**
 * The opening: build the S1 chain, keep only the construction-material
 * refiners enabled while AK1 is scarce, then start the advanced branch in time
 * to bank the advancement cost, and switch the combiner on once the first S2
 * residents provide AK2 (REF-8 task 3.1).
 *
 * Source: REF-8
 */
export function openingCommands(
  location: number,
  placements: readonly Placement[],
): readonly ScenarioCommand[] {
  return [
    ...placementCommands(location, placements, 'owner.0'),
    // AK1 is the bottleneck: the authored H1 refiners stay off until BM2 is
    // needed for the advancement cost.
    toggle('ref.tier.entity.refiner_h1', 1, false, 3),
    toggle('ref.tier.entity.refiner_h1', 2, false, 3),
    // Bank BM2 for the S1→S2 cost before the population reaches 150.
    toggle('ref.tier.entity.refiner_h1', 1, true, 740),
  ];
}

/**
 * Overexpansion: the same opening, but the advanced branch is switched on
 * immediately, so maintenance outruns the young economy and the deficit policy
 * has to pause and recover (REF-8 task 3.2).
 *
 * Source: REF-8
 */
export function overexpansionCommands(
  location: number,
  placements: readonly Placement[],
): readonly ScenarioCommand[] {
  // Everything runs from tick 1: the advanced branch's upkeep outruns the
  // young economy and the deficit policy has to intervene.
  return placementCommands(location, placements, 'owner.0');
}

/**
 * Pyramid pressure: advance every S1 residence instead of keeping a base
 * (REF-8 task 3.2). The strategy locks nothing, so as soon as one residence is
 * eligible the transition starts; the check asserts that primary production
 * starves once more than 60 % of residences have advanced.
 *
 * Source: REF-8, SCN-07
 */
export function pyramidCommands(
  location: number,
  placements: readonly Placement[],
): readonly ScenarioCommand[] {
  // Same pacing as the opening, but without the extra residence and the
  // combiner, so advancing the first residence drops S1 below the unlock and
  // the base cannot be rebuilt.
  return [
    ...placementCommands(location, placements, 'owner.0'),
    toggle('ref.tier.entity.refiner_h1', 1, false, 3),
    toggle('ref.tier.entity.refiner_h1', 2, false, 3),
    toggle('ref.tier.entity.refiner_h1', 1, true, 740),
  ];
}
