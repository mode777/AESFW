/**
 * INV-19 fog-safety tests: per-read-model and per-event-family units plus the
 * P-09 property on generated multi-location worlds with mixed knowledge
 * states.
 *
 * Source: INV-19, P-09, ARCH-8.3, PIC-9.3, VER-9.4
 */
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ids, readWorld } from '@aesfw/core';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { createSession } from '../session/session.js';
import type { SessionState } from '../session/types.js';
import { visibleEvents } from './fog.js';
import { project } from './project.js';
import { entityDetail } from '../readmodels/entity-detail.js';
import { locationSummary } from '../readmodels/location-summary.js';
import { needBreakdown } from '../readmodels/need-breakdown.js';
import { planningMetrics } from '../readmodels/planning.js';

const registry = {
  stringIdOf: () => null,
  handleOf: () => null,
} as unknown as ContentRegistry;

const content: CompiledContent = {
  registry,
  checksum: 'checksum.fog',
  packages: [],
  presentation: null,
};

const knowledgeArb = fc.array(fc.constantFrom('unknown', 'discovered', 'established'), {
  minLength: 2,
  maxLength: 5,
});

const sessionWith = (knowledge: readonly string[]): SessionState => {
  const created = createSession(content, {
    sessionId: 'session.fog',
    seed: [1, 2],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
  });
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  state.world.stores.get('location').set(ids.entityId(1), {
    template: ids.definitionHandle(0),
    spatialPolicy: 'abstract_capacity',
    capacity: 100,
    used: 0,
    properties: [],
    region: null,
    active: true,
    owner: ids.ownerHandle(0),
  });
  for (const [index, level] of knowledge.entries()) {
    interface FogLocation {
      template: number;
      spatialPolicy: string;
      capacity: number;
      used: number;
      properties: readonly unknown[];
      region: null;
      active: boolean;
      owner: number | null;
    }
    const store = state.world.stores.get('location') as unknown as {
      get: (entity: number) => FogLocation | undefined;
      set: (entity: number, value: FogLocation) => void;
      ids: () => readonly number[];
    };
    const entity = ids.entityId(index + 1);
    const existing = store.get(entity);
    if (existing === undefined) {
      store.set(entity, {
        template: ids.definitionHandle(0),
        spatialPolicy: 'abstract_capacity',
        capacity: 100,
        used: 0,
        properties: [],
        region: null,
        active: level !== 'unknown',
        owner: ids.ownerHandle(0),
      });
    } else {
      store.set(entity, { ...existing, active: level !== 'unknown' });
    }
  }
  state.world.owners = {
    owners: [
      {
        handle: ids.ownerHandle(0),
        knowledge: knowledge
          .map((level, index) => ({ level, location: ids.entityId(index + 1) }))
          .filter(
            (entry): entry is { level: string; location: ReturnType<typeof ids.entityId> } => {
              return entry.level !== 'unknown';
            },
          )
          .map((entry) => ({
            location: entry.location,
            level: entry.level as 'discovered' | 'established',
          })),
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  return state;
};

type FogEvent = { type: string; owner: number | null; location: number | null };

const events: readonly FogEvent[] = [
  { type: 'LocationDiscovered', owner: 0, location: 1 },
  { type: 'LocationDiscovered', owner: 1, location: 1 },
  { type: 'TransportArrived', owner: null, location: 1 },
  { type: 'CommandApplied', owner: null, location: null },
  { type: 'DeficitPaused', owner: 0, location: null },
];

describe('[INV-19] event visibility', () => {
  it('[INV-19][ARCH-8.3] a foreign discovery and an unknown arrival are invisible', () => {
    const state = sessionWith(['unknown', 'unknown']);
    const visible = visibleEvents(state.world, registry, ids.ownerHandle(0), events);
    expect(visible.map((event) => `${event.type}:${event.owner ?? '-'}`)).toEqual([
      'LocationDiscovered:0',
      'CommandApplied:-',
      'DeficitPaused:0',
    ]);
  });

  it('[INV-19][ARCH-8.3] a discovered location makes neutral events visible', () => {
    const state = sessionWith(['established', 'unknown']);
    const visible = visibleEvents(state.world, registry, ids.ownerHandle(0), events);
    expect(visible.map((event) => event.type)).toContain('TransportArrived');
  });

  it('[INV-19][ARCH-8.3] disabling fog shows every event', () => {
    const state = sessionWith(['unknown', 'unknown']);
    const visible = visibleEvents(state.world, registry, ids.ownerHandle(0), events, false);
    expect(visible).toHaveLength(5);
  });
});

describe('[INV-19] read-model fog gates', () => {
  it('[INV-19][PIC-10.2] an unknown location summary is minimal', () => {
    const state = sessionWith(['established', 'unknown']);
    const summary = locationSummary(state, ids.ownerHandle(0), 2);
    expect(summary).toEqual({ entity_id: 2, knowledge: 'unknown', active: false });
    const known = locationSummary(state, ids.ownerHandle(0), 1);
    expect(known?.inventory_totals).toBeDefined();
  });

  it('[INV-19][PIC-10.1] an entity at an unknown location has no detail', () => {
    const state = sessionWith(['established', 'unknown']);
    // Entity 20 sits at the established location, entity 21 at the unknown one.
    state.world.stores
      .get<{ definition: number }>('definition')
      .set(ids.entityId(20), { definition: ids.definitionHandle(0) });
    state.world.stores
      .get<{ definition: number }>('definition')
      .set(ids.entityId(21), { definition: ids.definitionHandle(0) });
    const producerAt = (location: number): Record<string, unknown> => ({
      recipes: [],
      recipe: null,
      processSlots: 1,
      location: ids.entityId(location),
      inputInventory: null,
      outputInventory: null,
      state: 'idle',
      blockReasons: [],
      progress: 0,
      inputReservations: [],
      capacityReservations: [],
    });
    state.world.stores.get('producer').set(ids.entityId(20), producerAt(1) as never);
    state.world.stores.get('producer').set(ids.entityId(21), producerAt(2) as never);
    expect(entityDetail(state, ids.ownerHandle(0), 20)).not.toBeNull();
    expect(entityDetail(state, ids.ownerHandle(0), 21)).toBeNull();
  });

  it('[INV-19][PIC-10.3] a residence at an unknown location has no breakdown', () => {
    const state = sessionWith(['established', 'unknown']);
    expect(needBreakdown(state, ids.ownerHandle(0), 1)).toEqual([]);
  });

  it('[INV-19][PIC-10.5] planning excludes unknown-location producers', () => {
    const state = sessionWith(['established', 'unknown']);
    const metrics = planningMetrics(state, ids.ownerHandle(0));
    expect(metrics).toBeDefined();
  });
});

describe('[PIC-9.3] P-09 fog property', () => {
  it('[P-09][INV-19] no unknown-location attributes appear in projections or events', () => {
    const run = (knowledge: readonly string[]): void => {
      const state = sessionWith(knowledge);
      const snapshot = project(state, ids.ownerHandle(0));
      const reader = readWorld(state.world, registry);
      for (const location of snapshot.locations) {
        const known =
          location.knowledge === 'established' ||
          location.knowledge === 'discovered' ||
          reader.knowledge(ids.ownerHandle(0), location.entity_id as never) !== 'unknown';
        if (!known) {
          expect(location.definition_id).toBeUndefined();
          expect(location.owner_id).toBeUndefined();
          expect(location.active).toBeUndefined();
          expect(location.properties).toBeUndefined();
          expect(location.grid).toBeUndefined();
          expect(location.inventories ?? []).toEqual([]);
        }
      }
      const unknownLocations = new Set(
        snapshot.locations
          .filter((location) => location.knowledge === 'unknown')
          .map((l) => l.entity_id),
      );
      for (const entity of snapshot.entities) {
        expect(unknownLocations.has(entity.location_id ?? -1)).toBe(false);
      }
      const visible = visibleEvents(state.world, registry, ids.ownerHandle(0), events);
      for (const event of visible) {
        if (event.owner === null && event.location !== null) {
          expect(unknownLocations.has(event.location)).toBe(false);
        }
      }
    };
    fc.assert(
      fc.property(knowledgeArb, (knowledge) => {
        run(knowledge);
      }),
      { numRuns: 40 },
    );
  });
});
