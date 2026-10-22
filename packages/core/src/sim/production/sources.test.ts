import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, stringId } from '../../ids/index.js';
import { advanceSource } from './sources.js';
import type { ResourceSource } from './types.js';

const res = (value: number) => definitionHandle(value);

describe('[GDD-9.5][GDD-10.4] resource sources', () => {
  it('[GDD-9.5] an infinite source deposits its rate', () => {
    const source: ResourceSource = {
      policy: 'infinite_rate',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 1000, remaining: null }],
    };
    const tick = advanceSource(source);
    expect(tick.amounts).toEqual([{ resource: 0, quantity: 1000 }]);
    expect(tick.source.outputs[0]?.remaining).toBeNull();
  });

  it('[GDD-9.5] a finite source depletes', () => {
    const source: ResourceSource = {
      policy: 'finite_deposit',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 1000, remaining: 1500 }],
    };
    const first = advanceSource(source);
    expect(first.amounts).toEqual([{ resource: 0, quantity: 1000 }]);
    const second = advanceSource(first.source);
    expect(second.amounts).toEqual([{ resource: 0, quantity: 500 }]);
    expect(second.source.outputs[0]?.remaining).toBe(0);
  });

  it('[GDD-9.5] an exhausted finite source deposits nothing', () => {
    const source: ResourceSource = {
      policy: 'finite_deposit',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 1000, remaining: 0 }],
    };
    expect(advanceSource(source).amounts).toEqual([]);
  });

  it('[GDD-9.5] a regenerating deposit replenishes', () => {
    const source: ResourceSource = {
      policy: 'regenerating_deposit',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 100, remaining: 300, regeneration: 200, maximum: 500 }],
    };
    const tick = advanceSource(source);
    expect(tick.amounts).toEqual([{ resource: 0, quantity: 100 }]);
    expect(tick.source.outputs[0]?.remaining).toBe(400);
  });

  it('[GDD-9.5] a regenerating deposit is capped at its maximum', () => {
    const source: ResourceSource = {
      policy: 'regenerating_deposit',
      location: entityId(1),
      inventory: entityId(2),
      outputs: [{ resource: res(0), rate: 100, remaining: 400, regeneration: 200, maximum: 500 }],
    };
    const tick = advanceSource(source);
    expect(tick.amounts).toEqual([{ resource: 0, quantity: 100 }]);
    expect(tick.source.outputs[0]?.remaining).toBe(500);
  });

  it('[GDD-6.5] an area source scales by its property', () => {
    const source: ResourceSource = {
      policy: 'area_dependent',
      location: entityId(1),
      inventory: entityId(2),
      scaleByProperty: stringId('test.property.suitability'),
      outputs: [{ resource: res(0), rate: 66, remaining: null }],
    };
    expect(advanceSource(source, 500).amounts).toEqual([{ resource: 0, quantity: 33 }]);
    expect(advanceSource(source, 1000).amounts).toEqual([{ resource: 0, quantity: 66 }]);
    expect(advanceSource(source, 0).amounts).toEqual([]);
  });
});
