import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Location } from '../../sim/location.js';
import { ABSTRACT_CAPACITY_POLICY_ID, abstractCapacityPolicy } from './abstract-capacity.js';
import { resolveSpatialPolicy } from './registry.js';

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

const setLocation = (world: World, id: number, overrides: Partial<Location> = {}): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: ABSTRACT_CAPACITY_POLICY_ID,
      capacity: 100,
      used: 30,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
      ...overrides,
    });
};

describe('[GDD-6.1][ARCH-11] abstract capacity policy', () => {
  it('[ARCH-11] a known policy resolves', () => {
    expect(resolveSpatialPolicy(ABSTRACT_CAPACITY_POLICY_ID)).toBe(abstractCapacityPolicy);
  });

  it('[ARCH-11] an unknown policy does not resolve', () => {
    expect(resolveSpatialPolicy('framework.spatial.unknown')).toBeNull();
  });

  it('[ARCH-11] capacity is reported', () => {
    const world = makeWorld();
    setLocation(world, 1);
    expect(abstractCapacityPolicy.capacity(world, entityId(1))).toEqual({
      total: 100,
      used: 30,
      free: 70,
    });
  });

  it('[ARCH-11] a placement within capacity succeeds', () => {
    const world = makeWorld();
    setLocation(world, 1);
    expect(abstractCapacityPolicy.validatePlacement(world, entityId(1), 70)).toEqual({ ok: true });
  });

  it('[ARCH-11] a placement beyond capacity is rejected', () => {
    const world = makeWorld();
    setLocation(world, 1);
    expect(abstractCapacityPolicy.validatePlacement(world, entityId(1), 71)).toEqual({
      ok: false,
      code: 'insufficient_capacity',
    });
  });

  it('[ARCH-11] a placement at an inactive location is rejected', () => {
    const world = makeWorld();
    setLocation(world, 1, { active: false });
    expect(abstractCapacityPolicy.validatePlacement(world, entityId(1), 1)).toEqual({
      ok: false,
      code: 'location_inactive',
    });
  });

  it('[ARCH-11] a placement at an unknown location is rejected', () => {
    const world = makeWorld();
    expect(abstractCapacityPolicy.validatePlacement(world, entityId(9), 1)).toEqual({
      ok: false,
      code: 'unknown_location',
    });
  });

  it('[ARCH-11] occupancy is added and removed', () => {
    const world = makeWorld();
    setLocation(world, 1, { used: 0 });
    abstractCapacityPolicy.add(world, entityId(1), 40);
    expect(abstractCapacityPolicy.capacity(world, entityId(1)).used).toBe(40);
    abstractCapacityPolicy.remove(world, entityId(1), 40);
    expect(abstractCapacityPolicy.capacity(world, entityId(1)).used).toBe(0);
  });
});
