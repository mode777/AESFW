/**
 * Store-level world builder (VER-5.2). Builds a `World` through `@aesfw/core`
 * public paths so a test never bypasses the world model. The content-driven
 * `content()` builder arrives with `add-testkit-content-builders` (1.5).
 *
 * Source: VER-5.2
 */
import {
  InvariantViolation,
  createEmptyRegistry,
  createWorld,
  det,
  ids,
  world as core,
} from '@aesfw/core';
import type { Registry } from '@aesfw/core';

type World = core.World;
type ComponentKind = core.ComponentKind;
type OwnerState = core.OwnerState;
type Seed = det.Seed;
type JsonValue = det.JsonValue;
type EntityId = ids.EntityId;

/** A fluent builder for test worlds (VER-5.2). */
export interface WorldBuilder {
  seed(seed: Seed): WorldBuilder;
  tick(value: number): WorldBuilder;
  owner(owner: OwnerState): WorldBuilder;
  store<T extends JsonValue>(kind: ComponentKind, entity: EntityId, value: T): WorldBuilder;
  build(): World;
}

/**
 * Creates a world builder with an optional registry (defaults to empty).
 *
 * Source: VER-5.2
 */
export function world(registry: Registry = createEmptyRegistry()): WorldBuilder {
  let seed: Seed = [0, 0];
  let startTick = 0;
  const owners: OwnerState[] = [];
  const entries: { kind: ComponentKind; entity: EntityId; value: JsonValue }[] = [];

  const builder: WorldBuilder = {
    seed(value) {
      seed = value;
      return builder;
    },
    tick(value) {
      startTick = value;
      return builder;
    },
    owner(value) {
      owners.push(value);
      return builder;
    },
    store(kind, entity, value) {
      entries.push({ kind, entity, value });
      return builder;
    },
    build() {
      const result = createWorld(registry, {
        seed,
        tickDurationMs: 1000,
        world: null,
        enabledModules: [],
      });
      if (!result.ok) {
        throw new InvariantViolation('world_build_failed', { diagnostics: result.error.length });
      }
      const built = result.value;
      built.tick = ids.tick(startTick);
      built.owners = { owners: [...owners].sort((a, b) => a.handle - b.handle) };
      let maxEntity = built.nextEntityId - 1;
      for (const entry of entries) {
        built.stores.get(entry.kind).set(entry.entity, entry.value);
        if (entry.entity > maxEntity) maxEntity = entry.entity;
      }
      if (maxEntity >= built.nextEntityId) {
        built.nextEntityId = ids.entityId(maxEntity + 1);
      }
      return built;
    },
  };

  return builder;
}
