/**
 * The tick runner (TDS-10.1, TDS-10.3). `step` runs every phase in canonical
 * order; `runPhases` runs a subset inside one tick; `runSystem` runs a single
 * descriptor with write-set checks. All three use owned mutation (TDS-5.2) and
 * stamp the computed tick (TDS-11.3 rule 5).
 *
 * Source: TDS-10.1, TDS-10.3, TDS-11.2, TDS-11.3
 */
import { createEventWriter } from '../events/event-writer.js';
import type { EventWriter } from '../events/event-writer.js';
import { tick as makeTick } from '../ids/index.js';
import type { Tick } from '../ids/index.js';
import type { Registry } from '../registry/types.js';
import { createTransactionWriter } from '../tx/index.js';
import { hashWorld } from '../world/codec.js';
import type { World } from '../world/types.js';
import { PHASE_TABLE } from './phase-table.js';
import { EMPTY_POLICY_SET } from './policies.js';
import { createTickScratch } from './scratch.js';
import type {
  PhaseId,
  PolicySet,
  SystemDescriptor,
  TickContext,
  TickInput,
  TickMetrics,
  TickOutput,
  TickScratch,
  Transaction,
  TransactionWriter,
} from './types.js';
import { guardStores } from './write-set.js';

interface RunnerState {
  readonly registry: Registry;
  readonly world: World;
  readonly tick: Tick;
  readonly tx: TransactionWriter;
  readonly events: EventWriter;
  readonly scratch: TickScratch;
  readonly policies: PolicySet;
}

const runOne = (descriptor: SystemDescriptor, state: RunnerState): void => {
  const original = state.world.stores;
  state.world.stores = guardStores(original, descriptor.writes);
  try {
    const context: TickContext = {
      tick: state.tick,
      registry: state.registry,
      world: state.world,
      tx: state.tx,
      events: state.events,
      scratch: state.scratch,
      policies: state.policies,
    };
    descriptor.run(context);
  } finally {
    state.world.stores = original;
  }
};

const execute = (
  world: World,
  registry: Registry,
  descriptors: readonly SystemDescriptor[],
  input: TickInput,
): TickOutput => {
  const computed = makeTick(world.tick + 1);
  const events = createEventWriter(computed);
  const journal: Transaction[] | null = input.options.journal ? [] : null;
  const state: RunnerState = {
    registry,
    world,
    tick: computed,
    tx: createTransactionWriter(world, journal),
    events,
    scratch: createTickScratch(),
    policies: EMPTY_POLICY_SET,
  };

  for (const descriptor of descriptors) {
    runOne(descriptor, state);
  }

  world.tick = computed;
  const hash = input.options.hash ? hashWorld(world, registry) : null;
  const metrics: TickMetrics = {};
  return { world, tick: computed, events: events.events, outcomes: [], journal, hash, metrics };
};

/**
 * Runs every phase 01–31 in canonical order and advances the world one tick
 * (TDS-10.1).
 *
 * Source: TDS-10.1, TDS-11.1
 */
export function step(world: World, registry: Registry, input: TickInput): TickOutput {
  return execute(world, registry, PHASE_TABLE, input);
}

/**
 * Runs only the listed phases, in canonical order, inside one tick
 * (TDS-10.3).
 *
 * Source: TDS-10.3
 */
export function runPhases(
  world: World,
  registry: Registry,
  phases: readonly PhaseId[],
  input: TickInput,
): TickOutput {
  const selected = new Set<PhaseId>(phases);
  const descriptors = PHASE_TABLE.filter((descriptor) => selected.has(descriptor.phase));
  return execute(world, registry, descriptors, input);
}

/**
 * Runs a single descriptor with write-set checks (TDS-10.3, amendment A-05).
 *
 * Source: TDS-10.3, TDS-11.2
 */
export function runSystem(
  descriptor: SystemDescriptor,
  world: World,
  registry: Registry,
  input: TickInput,
): TickOutput {
  return execute(world, registry, [descriptor], input);
}
