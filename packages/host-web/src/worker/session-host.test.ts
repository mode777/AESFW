import { describe, expect, it } from 'vitest';
import { GRID_POLICY_ID, createEmptyRegistry, ids } from '@aesfw/core';
import type { Inventory, Location, LocationHub } from '@aesfw/core';
import type { SaveDocument, SessionState } from '@aesfw/app';
import type { CompiledContent, CompiledDefinition, ContentRegistry } from '@aesfw/content';
import type { WorkerResponseDto } from '@aesfw/protocol';
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import { createSessionHost } from './session-host.js';
import type { SaveStorage, SessionHostPort } from './session-host.js';

const registry: ContentRegistry = {
  ...createEmptyRegistry(),
  definitionOf: () => null,
  definitionsOf: () => [],
  tagsOf: () => [],
};

const content: CompiledContent = {
  registry,
  checksum: 'test',
  packages: [],
  presentation: null,
};

const PLACEMENT_ENTITY = 'test.entity.builder';
const PLACEMENT_CONDITION = 'test.condition.place_ok';

const placementDefinitions = new Map<string, CompiledDefinition>([
  [
    PLACEMENT_ENTITY,
    {
      id: PLACEMENT_ENTITY,
      handle: ids.definitionHandle(10),
      type: 'entity',
      data: {
        components: {
          placement: { footprint: [1, 1], conditions: [PLACEMENT_CONDITION] },
        },
      },
    },
  ],
  [
    PLACEMENT_CONDITION,
    {
      id: PLACEMENT_CONDITION,
      handle: ids.definitionHandle(7),
      type: 'condition',
      data: {
        id: PLACEMENT_CONDITION,
        expression: {
          greater: {
            left: { location_property: { property: 'test.property.suitability' } },
            right: 500,
          },
        },
      },
    },
  ],
]);

const placementRegistry: ContentRegistry = {
  stringIdOf: (type, handle) => {
    for (const definition of placementDefinitions.values()) {
      if (definition.type === type && definition.handle === handle)
        return ids.stringId(definition.id);
    }
    return null;
  },
  handleOf: (type, id) => {
    const definition = placementDefinitions.get(id);
    return definition !== undefined && definition.type === type ? definition.handle : null;
  },
  definitionOf: (type, handle) => {
    for (const definition of placementDefinitions.values()) {
      if (definition.type === type && definition.handle === handle) return definition;
    }
    return null;
  },
  definitionDataOf: (type, handle) => {
    for (const definition of placementDefinitions.values()) {
      if (definition.type === type && definition.handle === handle) return definition.data;
    }
    return null;
  },
  definitionsOf: (type) =>
    [...placementDefinitions.values()].filter((definition) => definition.type === type),
  tagsOf: () => [],
};

const placementContent: CompiledContent = {
  registry: placementRegistry,
  checksum: 'test',
  packages: [],
  presentation: null,
};

const addPlacementGridLocation = (session: SessionState): void => {
  const world = session.world;
  world.nextEntityId = ids.entityId(100);
  world.owners = {
    owners: [
      {
        handle: ids.ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  world.stores.get<Location>('location').set(ids.entityId(1), {
    template: ids.definitionHandle(0),
    spatialPolicy: GRID_POLICY_ID,
    capacity: 16,
    used: 0,
    properties: [{ property: ids.stringId('test.property.suitability'), value: 800 }],
    region: null,
    active: true,
    owner: ids.ownerHandle(0),
    grid: { width: 4, height: 4, blocked: [0] },
  });
  world.stores
    .get<LocationHub>('locationHub')
    .set(ids.entityId(1), { inventories: [ids.entityId(2)] });
  world.stores.get<Inventory>('inventory').set(ids.entityId(2), {
    owner: ids.ownerHandle(0),
    policy: 'framework.inventory.shared_location',
    revision: 0,
    entries: [],
    capacity: { total: null, perResource: null },
    acceptance: { accepts: [] },
  });
};

class FakePort implements SessionHostPort {
  readonly messages: WorkerResponseDto[] = [];
  private handler: ((data: unknown) => void) | null = null;
  postMessage(message: WorkerResponseDto): void {
    this.messages.push(message);
  }
  onMessage(handler: (data: unknown) => void): void {
    this.handler = handler;
  }
  send(data: unknown): void {
    void this.handler?.(data);
  }
  of(kind: WorkerResponseDto['kind']): WorkerResponseDto[] {
    return this.messages.filter((message) => message.kind === kind);
  }
}

class FakeClock {
  private readonly timers = new Map<number, () => void>();
  private next = 1;
  setTimer = (fn: () => void): number => {
    const id = this.next++;
    this.timers.set(id, fn);
    return id;
  };
  clearTimer = (id: number): void => {
    this.timers.delete(id);
  };
  fire(): void {
    const callbacks = [...this.timers.values()];
    this.timers.clear();
    for (const callback of callbacks) callback();
  }
}

class FakeStorage implements SaveStorage {
  private readonly saves = new Map<string, SaveDocument>();
  get(slot: string): SaveDocument | null {
    return this.saves.get(slot) ?? null;
  }
  put(slot: string, doc: SaveDocument): void {
    this.saves.set(slot, doc);
  }
}

const setup = (
  prepare?: (session: import('@aesfw/app').SessionState) => void,
  hostContent: CompiledContent = content,
) => {
  const port = new FakePort();
  const clock = new FakeClock();
  const storage = new FakeStorage();
  const host = createSessionHost({
    port,
    storage,
    tickDurationMs: 100,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
    content: hostContent,
    maxCatchUpTicks: 8,
    setTimer: (fn) => clock.setTimer(fn),
    clearTimer: (id) => clock.clearTimer(id),
    ...(prepare === undefined ? {} : { prepare }),
  });
  host.start();
  return { port, clock, storage };
};

const init = (port: FakePort): void =>
  port.send({ kind: 'init', protocol_version: PROTOCOL_VERSION });

describe('[TDS-21.1] session host', () => {
  it('[TDS-21.1] init yields a ready message', () => {
    const { port } = setup();
    init(port);
    const ready = port.of('ready');
    expect(ready).toHaveLength(1);
    if (ready[0]?.kind === 'ready') expect(ready[0].tick).toBe(0);
  });

  it('[TDS-21.1] subscribe yields a snapshot', () => {
    const { port } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    expect(port.of('snapshot')).toHaveLength(1);
  });

  it('[TDS-21.1] a command yields a result', () => {
    const { port } = setup();
    init(port);
    port.send({
      kind: 'command',
      protocol_version: PROTOCOL_VERSION,
      command: {
        command_id: 'c1',
        actor_id: 'test.owner.1',
        type: 'SetEntityEnabled',
        payload: { entity_id: 1, enabled: false },
      },
    });
    expect(port.of('command_result')).toHaveLength(1);
  });

  it('[TDS-21.1] stepping advances the tick and posts one delta', () => {
    const { port } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'step', ticks: 3 });
    expect(port.of('delta')).toHaveLength(1);
  });

  it('[TDS-21.1] catch-up is limited', () => {
    const { port, clock } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'speed', speed: 100 });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'run' });
    clock.fire();
    const deltas = port.of('delta');
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'pause' });
  });

  it('[TDS-21.1] a save round-trips through storage', async () => {
    const { port } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'step', ticks: 2 });
    port.send({ kind: 'save', protocol_version: PROTOCOL_VERSION, slot: 'auto' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    port.send({ kind: 'load', protocol_version: PROTOCOL_VERSION, slot: 'auto' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(port.of('saved')).toHaveLength(1);
    expect(port.of('loaded')).toHaveLength(1);
  });

  it('[TDS-21.1] a violation stops the clock', () => {
    const { port } = setup((session) => {
      session.world.stores
        .get<{ definition: number }>('definition')
        .set(ids.entityId(1), { definition: 1.5 });
    });
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'step', ticks: 1 });
    const errors = port.of('error');
    expect(errors).toHaveLength(1);
    if (errors[0]?.kind === 'error') expect(errors[0].code).toBe('non_canonical_value');
  });

  it('[TDS-21.1] an entity-detail query yields a read model', () => {
    const { port } = setup((session) => {
      session.world.stores.get('producer').set(ids.entityId(3), {
        recipes: [],
        recipe: null,
        processSlots: 1,
        location: null,
        inputInventory: null,
        outputInventory: null,
        state: 'idle',
        blockReasons: [],
        progress: 0,
        inputReservations: [],
        capacityReservations: [],
      });
    });
    init(port);
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: { kind: 'entity_detail', entity_id: 3 },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      expect(results[0].result['entity_detail']).toMatchObject({ entity_id: 3 });
    }
  });

  it('[PIC-10.7] an exchange-quotes query yields the read model', () => {
    const exchangeRegistry: ContentRegistry = {
      ...registry,
      stringIdOf: (type, handle) =>
        type === 'exchange' && handle === ids.definitionHandle(0)
          ? ids.stringId('test.exchange.a')
          : type === 'resource'
            ? ids.stringId(`test.resource.${handle}`)
            : null,
      handleOf: (type, id) =>
        type === 'exchange' && id === 'test.exchange.a'
          ? ids.definitionHandle(0)
          : type === 'resource' && id === 'test.resource.credits'
            ? ids.definitionHandle(1)
            : null,
      definitionDataOf: (type, handle) =>
        type === 'exchange' && handle === ids.definitionHandle(0)
          ? {
              id: 'test.exchange.a',
              location: 'test.location.a',
              currency: 'test.resource.credits',
              goods: [
                {
                  resource: 'test.resource.credits',
                  buy_from_exchange: { base_price: 1000, enabled: true },
                  sell_to_exchange: { base_price: 800, enabled: true },
                },
              ],
              elasticity: {
                window_ticks: 10,
                step_quantity: 100,
                step_change_permille: 100,
                recovery_permille_per_interval: 200,
                recovery_interval_ticks: 5,
                min_price_permille: 500,
                max_price_permille: 1500,
              },
              shared_between_owners: true,
            }
          : null,
    };
    const { port } = setup(
      (session) => {
        session.world.stores
          .get('exchangeRef')
          .set(ids.entityId(9), { exchange: ids.definitionHandle(0), location: ids.entityId(1) });
        session.world.exchanges = {
          prices: [
            {
              exchange: ids.entityId(9),
              resource: ids.definitionHandle(1),
              buy: 1000,
              sell: 800,
              soldVolume: [],
              boughtVolume: [],
            },
          ],
        };
        const owners = [...session.world.owners.owners];
        const first = owners[0];
        if (first !== undefined) {
          owners[0] = {
            ...first,
            knowledge: [{ location: ids.entityId(1), level: 'established' }],
          };
        }
        session.world.owners = { owners };
      },
      { ...content, registry: exchangeRegistry },
    );
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: { kind: 'exchange_quotes', entity_id: 9 },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      expect(results[0].result['exchange_quotes']).toMatchObject({ entity_id: 9 });
    }
  });

  it('[PIC-12.1] a placement query yields a valid result', () => {
    const { port } = setup(addPlacementGridLocation, placementContent);
    init(port);
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: {
        kind: 'placement_query',
        definition_id: PLACEMENT_ENTITY,
        location_id: 1,
        logical_transform: { position: [1, 1], orientation: 0 },
      },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      expect(results[0].result['placement_result']).toMatchObject({ valid: true, reasons: [] });
    }
  });

  it('[PIC-12.1] a rejected placement query yields its reasons', () => {
    const { port } = setup(addPlacementGridLocation, placementContent);
    init(port);
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: {
        kind: 'placement_query',
        definition_id: PLACEMENT_ENTITY,
        location_id: 1,
        logical_transform: { position: [0, 0], orientation: 0 },
      },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      const placement = results[0].result['placement_result'] as {
        readonly valid: boolean;
        readonly reasons: readonly { readonly code: string }[];
      };
      expect(placement.valid).toBe(false);
      expect(placement.reasons[0]?.code).toBe('not_buildable');
    }
  });

  it('[PIC-12.1] a malformed placement query yields an empty result', () => {
    const { port } = setup(addPlacementGridLocation, placementContent);
    init(port);
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: { kind: 'placement_query', location_id: 1 },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      expect(results[0].result).toEqual({});
    }
  });
});

describe('[PIC-10.5] planning query through the web host', () => {
  it('[PIC-10.5] a planning query returns the read model', () => {
    const { port } = setup();
    init(port);
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: { kind: 'planning' },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      const planning = results[0].result['planning'] as { owner_id?: string } | undefined;
      expect(planning?.owner_id).toBe('owner.0');
    }
  });

  it('[PIC-10.5] a planning query without a session returns empty', () => {
    const { port } = setup();
    port.send({
      kind: 'query',
      protocol_version: PROTOCOL_VERSION,
      actor_id: 'test.owner.1',
      query: { kind: 'planning' },
    });
    const results = port.of('query_result');
    expect(results).toHaveLength(1);
    if (results[0]?.kind === 'query_result') {
      expect(results[0].result).toEqual({});
    }
  });
});
