import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, reservationId } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { createWorld } from '../world/create.js';
import type { Reservation, World } from '../world/types.js';
import {
  capacityReserved,
  capacityReservedTotal,
  findReservation,
  quantityReserved,
} from './ledger.js';

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

const reservation = (
  id: number,
  inventory: number,
  resource: number,
  quantity: number,
  capacity: boolean,
): Reservation => ({
  id: reservationId(id),
  inventory: entityId(inventory),
  resource: definitionHandle(resource),
  quantity,
  purpose: 'production_input',
  holder: entityId(1),
  expiryTick: null,
  capacity,
});

describe('[TDS-12.3] reservation ledger queries', () => {
  it('[TDS-12.3] quantity and capacity reservations are summed separately', () => {
    const world = makeWorld();
    world.ledger = {
      reservations: [
        reservation(1, 1, 0, 300, false),
        reservation(2, 1, 0, 200, false),
        reservation(3, 1, 0, 400, true),
        reservation(4, 2, 0, 50, false),
      ],
    };
    expect(quantityReserved(world, entityId(1), definitionHandle(0))).toBe(500);
    expect(capacityReserved(world, entityId(1), definitionHandle(0))).toBe(400);
    expect(capacityReservedTotal(world, entityId(1))).toBe(400);
    expect(quantityReserved(world, entityId(2), definitionHandle(0))).toBe(50);
  });

  it('[TDS-12.3] a reservation is found by id', () => {
    const world = makeWorld();
    world.ledger = { reservations: [reservation(7, 1, 0, 10, false)] };
    expect(findReservation(world, reservationId(7))?.quantity).toBe(10);
    expect(findReservation(world, reservationId(8))).toBeNull();
  });
});
