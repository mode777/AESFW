/**
 * The `checkInvariants` framework (VER-6). This M0 subset evaluates INV-10,
 * INV-18, INV-21, and INV-24; INV-17 is checked by the clone-run harness. Each
 * later system row extends the catalogue without changing the runner.
 *
 * Source: VER-6, INV-10, INV-18, INV-21, INV-24
 */
import {
  InvariantViolation,
  decodeWorld,
  encodeWorld,
  hashWorld,
  world as core,
} from '@aesfw/core';
import type { Registry, TickOutput } from '@aesfw/core';

type World = core.World;

/** A violated invariant, returned as data (VER-6). */
export interface InvariantFinding {
  readonly id: string;
  readonly message: string;
}

const checkEntityIds = (world: World, findings: InvariantFinding[]): void => {
  for (const kind of world.stores.kinds) {
    const store = world.stores.get(kind);
    for (const id of store.ids()) {
      if (id >= world.nextEntityId) {
        findings.push({
          id: 'INV-10',
          message: `${kind} entity ${id} is not below nextEntityId ${world.nextEntityId}`,
        });
      }
    }
  }
};

const checkAscending = (world: World, findings: InvariantFinding[]): void => {
  for (const kind of world.stores.kinds) {
    const ids = world.stores.get(kind).ids();
    for (let index = 1; index < ids.length; index += 1) {
      if ((ids[index] ?? 0) <= (ids[index - 1] ?? 0)) {
        findings.push({ id: 'INV-24', message: `${kind} ids are not in ascending order` });
      }
    }
  }
};

const checkPersistence = (world: World, registry: Registry, findings: InvariantFinding[]): void => {
  const decoded = decodeWorld(registry, encodeWorld(world, registry));
  if (!decoded.ok) {
    findings.push({ id: 'INV-18', message: 'encode/decode round-trip failed' });
    return;
  }
  if (hashWorld(decoded.value, registry) !== hashWorld(world, registry)) {
    findings.push({ id: 'INV-18', message: 'round-trip state hash mismatch' });
  }
};

/**
 * Evaluates the M0 invariant subset over a completed tick (VER-6).
 *
 * Source: VER-6, INV-10, INV-18, INV-21, INV-24
 */
export function checkInvariants(
  before: World,
  output: TickOutput,
  registry: Registry,
): readonly InvariantFinding[] {
  const findings: InvariantFinding[] = [];
  checkEntityIds(output.world, findings);
  checkAscending(output.world, findings);
  checkPersistence(output.world, registry, findings);
  if (output.tick !== before.tick + 1) {
    findings.push({
      id: 'INV-21',
      message: `output tick ${output.tick} is not before.tick + 1 (${before.tick + 1})`,
    });
  }
  return findings;
}

/**
 * Throws `InvariantViolation` when any invariant is violated (VER-6).
 *
 * Source: VER-6
 */
export function expectInvariants(before: World, output: TickOutput, registry: Registry): void {
  const findings = checkInvariants(before, output, registry);
  const first = findings[0];
  if (first !== undefined) {
    throw new InvariantViolation('invariant_violation', { id: first.id, message: first.message });
  }
}
