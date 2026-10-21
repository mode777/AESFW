import { describe, expect, it } from 'vitest';
import { entityId } from '../../ids/index.js';
import { allocateModel } from './models.js';
import type { CapabilityRequest } from './models.js';

const request = (id: number, amount: number, priority = 0, weight = 1000): CapabilityRequest => ({
  entity: entityId(id),
  request: amount,
  priority,
  weight,
});

describe('[GDD-14.2][TDS-6.3] capability allocation models', () => {
  it('[GDD-14.2] a pool within demand is fully granted', () => {
    expect(allocateModel('proportional', 100, [request(1, 60)])).toEqual([60]);
  });

  it('[GDD-14.2] proportional allocation splits deterministically', () => {
    expect(allocateModel('proportional', 100, [request(1, 100), request(2, 100)])).toEqual([
      50, 50,
    ]);
  });

  it('[GDD-14.2] binary allocation grants all or nothing', () => {
    expect(allocateModel('binary', 100, [request(1, 60), request(2, 50)])).toEqual([60, 0]);
  });

  it('[GDD-14.2] priority allocation serves lower priority numbers first', () => {
    expect(allocateModel('priority', 100, [request(1, 60, 2), request(2, 60, 1)])).toEqual([
      40, 60,
    ]);
  });

  it('[GDD-14.2] weighted allocation follows weights', () => {
    expect(
      allocateModel('weighted', 300, [request(1, 300, 0, 1000), request(2, 300, 0, 2000)]),
    ).toEqual([100, 200]);
  });

  it('[GDD-14.2] weighted allocation with equal weights is proportional', () => {
    expect(
      allocateModel('weighted', 100, [request(1, 100, 0, 1000), request(2, 100, 0, 1000)]),
    ).toEqual([50, 50]);
  });

  it('[INV-05] total grants do not exceed supply', () => {
    const grants = allocateModel('proportional', 100, [
      request(1, 100),
      request(2, 100),
      request(3, 100),
    ]);
    expect(grants.reduce((total, grant) => total + grant, 0)).toBeLessThanOrEqual(100);
  });
});
