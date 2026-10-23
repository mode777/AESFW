/**
 * The planning metrics read model (PIC-10.5, TDS-18.5). Computes nominal net
 * production rates as exact rationals, per-tier supported population, and
 * chain metrics with integer stage ratios. Utilization- and throttle-adjusted
 * rates arrive with M5 in separate fields.
 *
 * Source: PIC-10.5, TDS-18.5, GDD-3.8, GDD-10.6
 */
import { det } from '@aesfw/core';
import type { DefinitionHandle, EntityId, OwnerHandle, World, fx } from '@aesfw/core';

type Int = fx.Int;
import type {
  PlanningChainDto,
  PlanningChainStageDto,
  PlanningDto,
  PlanningScopeDto,
  PlanningTierDto,
} from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

/** An exact rational `num / den` with `den > 0`, gcd-reduced. */
interface Rational {
  readonly n: number;
  readonly d: number;
}

const gcd = (a: number, b: number): number => {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left === 0 ? 1 : left;
};

const rational = (n: number, d: number): Rational => {
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return { n: (sign * n) / divisor, d: Math.abs(d) / divisor };
};

const ofInt = (n: number): Rational => ({ n, d: 1 });

const addR = (left: Rational, right: Rational): Rational =>
  rational(left.n * right.d + right.n * left.d, left.d * right.d);

const divR = (left: Rational, right: Rational): Rational =>
  right.n === 0 ? ofInt(0) : rational(left.n * right.d, left.d * right.n);

const floorR = (value: Rational): Int => Math.floor(value.n / value.d);

const isNegativeR = (value: Rational): boolean => value.n < 0;

const ZERO: Rational = ofInt(0);

const ownerComponentOf = (world: World, entity: EntityId): OwnerHandle | null =>
  world.stores.get<{ owner: OwnerHandle }>('owner').get(entity)?.owner ?? null;

interface ProducerRow {
  readonly entity: EntityId;
  readonly definition: DefinitionHandle | null;
  readonly location: EntityId | null;
  readonly outputs: readonly { readonly resource: DefinitionHandle; readonly rate: Rational }[];
  readonly inputs: readonly { readonly resource: DefinitionHandle; readonly rate: Rational }[];
  readonly capabilities: readonly { readonly resource: DefinitionHandle; readonly quantity: Int }[];
  readonly maintenancePerInterval: Int;
  readonly footprintCells: Int;
}

const producerRows = (world: World, owner: OwnerHandle): readonly ProducerRow[] => {
  const store = world.stores.get('producer');
  const footprintStore = world.stores.get<{ readonly width: Int; readonly height: Int }>(
    'footprint',
  );
  const maintenanceStore = world.stores.get<{
    readonly intervalTicks: Int;
    readonly inputs: readonly { readonly resource: DefinitionHandle; readonly quantity: Int }[];
  }>('maintenance');
  const rows: ProducerRow[] = [];
  for (const entity of store.ids()) {
    if (ownerComponentOf(world, entity) !== owner) continue;
    const producer = store.get(entity) as
      | {
          readonly recipe: DefinitionHandle | null;
          readonly recipes: readonly {
            readonly recipe: DefinitionHandle;
            readonly mode: 'batch' | 'continuous';
            readonly duration: Int;
            readonly inputs: readonly {
              readonly resource: DefinitionHandle;
              readonly quantity: Int;
            }[];
            readonly outputs: readonly {
              readonly resource: DefinitionHandle;
              readonly quantity: Int;
            }[];
            readonly capabilities: readonly {
              readonly resource: DefinitionHandle;
              readonly quantity: Int;
            }[];
          }[];
          readonly location: EntityId | null;
        }
      | undefined;
    if (producer === undefined) continue;
    const selected = producer.recipes.find((entry) => entry.recipe === producer.recipe);
    if (selected === undefined) continue;
    const perTick = (quantity: Int): Rational =>
      selected.mode === 'continuous' ? ofInt(quantity) : rational(quantity, selected.duration);
    const definition =
      world.stores.get<{ definition: DefinitionHandle }>('definition').get(entity)?.definition ??
      null;
    const maintenance = maintenanceStore.get(entity);
    const maintenancePerInterval =
      maintenance === undefined
        ? 0
        : maintenance.inputs.reduce((total, line) => total + line.quantity, 0);
    const footprint = footprintStore.get(entity);
    rows.push({
      entity,
      definition,
      location: producer.location,
      outputs: selected.outputs.map((line) => ({
        resource: line.resource,
        rate: perTick(line.quantity),
      })),
      inputs: selected.inputs.map((line) => ({
        resource: line.resource,
        rate: perTick(line.quantity),
      })),
      capabilities: selected.capabilities.map((line) => ({
        resource: line.resource,
        quantity: line.quantity,
      })),
      maintenancePerInterval,
      footprintCells: footprint === undefined ? 0 : footprint.width * footprint.height,
    });
  }
  return rows;
};

interface ResidenceRow {
  readonly tier: DefinitionHandle;
  readonly location: EntityId | null;
  readonly count: Int;
  readonly consumptionFactor: Int;
  readonly needs: readonly {
    readonly type: 'resource_consumption' | 'resource_availability';
    readonly resource: DefinitionHandle;
    readonly quantityPerPopulationPerTick: Int;
  }[];
}

const residenceRows = (world: World, owner: OwnerHandle): readonly ResidenceRow[] => {
  const store = world.stores.get('residence');
  const groupStore = world.stores.get<{ readonly count: Int }>('populationGroup');
  const rows: ResidenceRow[] = [];
  for (const entity of store.ids()) {
    if (ownerComponentOf(world, entity) !== owner) continue;
    const residence = store.get(entity) as
      | {
          readonly tier: DefinitionHandle;
          readonly location: EntityId | null;
          readonly consumptionFactor: Int;
          readonly needs?:
            | readonly {
                readonly type: 'resource_consumption' | 'resource_availability';
                readonly resource: DefinitionHandle;
                readonly quantityPerPopulationPerTick: Int;
              }[]
            | undefined;
        }
      | undefined;
    if (residence === undefined) continue;
    const group = groupStore.get(entity);
    if (group === undefined) continue;
    rows.push({
      tier: residence.tier,
      location: residence.location,
      count: group.count,
      consumptionFactor: residence.consumptionFactor,
      needs: residence.needs ?? [],
    });
  }
  return rows;
};

const netRateOf = (
  rows: readonly ProducerRow[],
  resource: DefinitionHandle,
  inScope: (row: ProducerRow) => boolean,
): Rational => {
  let net = ZERO;
  for (const row of rows) {
    if (!inScope(row)) continue;
    for (const output of row.outputs) {
      if (output.resource === resource) net = addR(net, output.rate);
    }
    for (const input of row.inputs) {
      if (input.resource === resource) net = addR(net, { n: -input.rate.n, d: input.rate.d });
    }
  }
  return net;
};

const stringIdOf = (
  session: SessionState,
  type: 'tier' | 'resource' | 'entity',
  handle: DefinitionHandle,
): string => session.content.registry.stringIdOf(type, handle) ?? `${type}.${handle as number}`;

/**
 * Builds the planning read model for `actor` (PIC-10.5, TDS-18.5).
 *
 * Source: PIC-10.5, TDS-18.5, GDD-3.8, GDD-10.6
 */
export function planningMetrics(session: SessionState, actor: OwnerHandle): PlanningDto {
  const world = session.world;
  const producers = producerRows(world, actor);
  const residences = residenceRows(world, actor);

  // Resources consumed by resource_consumption needs (PIC-10.5).
  const consumed = new Set<DefinitionHandle>();
  for (const residence of residences) {
    for (const need of residence.needs) {
      if (need.type === 'resource_consumption') consumed.add(need.resource);
    }
  }

  const resourceEntries: { resource_id: string; scopes: PlanningScopeDto[] }[] = [];
  for (const resource of consumed) {
    const scopes: PlanningScopeDto[] = [];
    const ownerNet = netRateOf(producers, resource, () => true);
    scopes.push(buildScope(session, 'owner', null, ownerNet, residences, resource));
    const locations = new Set<EntityId>();
    for (const row of producers) {
      if (row.location !== null) locations.add(row.location);
    }
    for (const residence of residences) {
      if (residence.location !== null) locations.add(residence.location);
    }
    for (const location of locations) {
      const locationNet = netRateOf(producers, resource, (row) => row.location === location);
      scopes.push(buildScope(session, 'location', location, locationNet, residences, resource));
    }
    resourceEntries.push({ resource_id: stringIdOf(session, 'resource', resource), scopes });
  }

  return {
    owner_id: `owner.${actor as number}`,
    resources: resourceEntries,
    chains: chainsOf(session, producers),
  };
}

const buildScope = (
  session: SessionState,
  scope: 'owner' | 'location',
  location: EntityId | null,
  net: Rational,
  residences: readonly ResidenceRow[],
  resource: DefinitionHandle,
): PlanningScopeDto => {
  const inScope = (row: { readonly location: EntityId | null }): boolean =>
    scope === 'owner' || row.location === location;
  const tiers: PlanningTierDto[] = [];
  const tierRows = new Map<DefinitionHandle, ResidenceRow[]>();
  for (const residence of residences) {
    if (!inScope(residence)) continue;
    const consuming = residence.needs.some(
      (need) => need.type === 'resource_consumption' && need.resource === resource,
    );
    if (!consuming) continue;
    const existing = tierRows.get(residence.tier) ?? [];
    existing.push(residence);
    tierRows.set(residence.tier, existing);
  }
  for (const [tier, rows] of tierRows) {
    const perCapita = rows.reduce(
      (total, row) =>
        addR(
          total,
          rational(
            row.needs
              .filter((need) => need.type === 'resource_consumption' && need.resource === resource)
              .reduce((sum, need) => sum + need.quantityPerPopulationPerTick, 0) *
              row.consumptionFactor,
            1000,
          ),
        ),
      ZERO,
    );
    const population = rows.reduce((total, row) => total + row.count, 0);
    const supported =
      perCapita.n === 0 ? 0 : isNegativeR(net) ? 0 : Math.max(0, floorR(divR(net, perCapita)));
    const coverage = supported === 0 ? 0 : Math.floor((population * 1000) / supported);
    tiers.push({
      tier_id: stringIdOf(session, 'tier', tier),
      per_capita_permille: floorR({ n: perCapita.n * 1000, d: perCapita.d }),
      supported,
      consuming_population: population,
      coverage_permille: coverage,
    });
  }
  tiers.sort((left, right) => det.compareStrings(left.tier_id, right.tier_id));
  return {
    scope,
    ...(location === null ? {} : { location_id: location }),
    net_per_tick: floorR(net),
    tiers,
  };
};

const chainsOf = (
  session: SessionState,
  producers: readonly ProducerRow[],
): readonly PlanningChainDto[] => {
  const produced = new Set<DefinitionHandle>();
  for (const row of producers) {
    for (const output of row.outputs) produced.add(output.resource);
  }
  const chains: PlanningChainDto[] = [];
  for (const resource of produced) {
    const members = producers.filter(
      (row) =>
        row.outputs.some((output) => output.resource === resource) ||
        row.inputs.some((input) => input.resource === resource),
    );
    if (members.length === 0) continue;
    const byDefinition = new Map<DefinitionHandle, ProducerRow[]>();
    for (const row of members) {
      if (row.definition === null) continue;
      const existing = byDefinition.get(row.definition) ?? [];
      existing.push(row);
      byDefinition.set(row.definition, existing);
    }
    const counts = [...byDefinition.values()].map((rows) => rows.length);
    const divisor = counts.reduce((left, right) => gcd(left, right), 0) || 1;
    const stages: PlanningChainStageDto[] = [];
    let output = ZERO;
    for (const [definition, rows] of byDefinition) {
      const stageOutput = rows.reduce(
        (total, row) =>
          addR(
            total,
            row.outputs.reduce(
              (sum, line) => (line.resource === resource ? addR(sum, line.rate) : sum),
              ZERO,
            ),
          ),
        ZERO,
      );
      output = addR(output, stageOutput);
      const demand: Record<string, number> = {};
      let maintenance = 0;
      let footprint = 0;
      for (const row of rows) {
        maintenance += row.maintenancePerInterval;
        footprint += row.footprintCells;
        for (const capability of row.capabilities) {
          const id = stringIdOf(session, 'resource', capability.resource);
          demand[id] = (demand[id] ?? 0) + capability.quantity;
        }
      }
      stages.push({
        definition_id: stringIdOf(session, 'entity', definition),
        count: rows.length,
        ratio: rows.length / divisor,
        output_per_tick: floorR(stageOutput),
        footprint,
        maintenance_per_interval: maintenance,
        capability_demand: demand,
      });
    }
    stages.sort((left, right) => det.compareStrings(left.definition_id, right.definition_id));
    chains.push({
      resource_id: stringIdOf(session, 'resource', resource),
      output_per_tick: floorR(output),
      stages,
    });
  }
  chains.sort((left, right) => det.compareStrings(left.resource_id, right.resource_id));
  return chains;
};
