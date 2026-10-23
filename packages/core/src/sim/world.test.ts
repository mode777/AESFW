import { describe, expect, it } from 'vitest';
import { runPhases } from '../pipeline/step.js';
import { createEmptyRegistry } from '../registry/types.js';
import { createWorld } from '../world/create.js';
import type { ScheduledCommand, World } from '../world/types.js';
import { definitionHandle, entityId, ownerHandle, tick } from '../ids/index.js';
import type { Command } from '../commands/types.js';
import { instantiateWorld } from './instantiate.js';
import type { WorldPlan } from './instantiate.js';
import { locationOf } from './location.js';

const worldWithLocation = (): World => {
  const created = createWorld(createEmptyRegistry(), {
    seed: [0, 0],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  const plan: WorldPlan = {
    owner: ownerHandle(0),
    owners: [{ handle: ownerHandle(0), accounts: [], knowledge: [] }],
    locations: [
      {
        template: definitionHandle(0),
        spatialPolicy: 'framework.spatial.abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [],
      },
    ],
  };
  instantiateWorld(world, plan);
  return world;
};

const scheduled = (command: Command, actor = 0): ScheduledCommand => ({
  commandId: `command.${command.type}`,
  actor: ownerHandle(actor),
  tick: tick(1),
  seq: 0,
  command,
});

const run = (world: World, command: ScheduledCommand) =>
  runPhases(world, createEmptyRegistry(), [1], {
    commands: [command],
    options: { journal: false, hash: false },
  });

describe('[GDD-6.2][ARCH-7.3] location activation commands', () => {
  it('[GDD-6.2] the owner deactivates and reactivates a location', () => {
    const world = worldWithLocation();
    const deactivated = run(
      world,
      scheduled({ type: 'DeactivateLocation', location: entityId(1) }),
    );
    expect(deactivated.outcomes[0]?.status).toBe('applied');
    expect(locationOf(world, entityId(1))?.active).toBe(false);

    const reactivated = run(world, scheduled({ type: 'ActivateLocation', location: entityId(1) }));
    expect(reactivated.outcomes[0]?.status).toBe('applied');
    expect(locationOf(world, entityId(1))?.active).toBe(true);
  });

  it('[GDD-6.2] a non-owner cannot deactivate a location', () => {
    const world = worldWithLocation();
    const output = run(world, scheduled({ type: 'DeactivateLocation', location: entityId(1) }, 1));
    expect(output.outcomes[0]?.status).toBe('rejected');
    expect(output.outcomes[0]?.status === 'rejected' && output.outcomes[0].errors[0]?.code).toBe(
      'not_owner',
    );
    expect(locationOf(world, entityId(1))?.active).toBe(true);
  });

  it('[GDD-6.2] an entity without a location component is rejected', () => {
    const world = worldWithLocation();
    const output = run(world, scheduled({ type: 'ActivateLocation', location: entityId(99) }));
    expect(output.outcomes[0]?.status).toBe('rejected');
    expect(output.outcomes[0]?.status === 'rejected' && output.outcomes[0].errors[0]?.code).toBe(
      'unknown_location',
    );
  });
});
