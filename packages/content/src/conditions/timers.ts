/**
 * The phase 22 sustained-timer updater (TDS-14.3). Built from compiled
 * content, it enumerates the subjects of every condition usage the registry
 * knows, evaluates each `sustained` node's inner expression once per subject,
 * and rebuilds the timer table in `(condition handle, slot, subject)` order.
 *
 * Source: TDS-14.3, ARCH-5.2
 */
import type {
  DefinitionHandle,
  ResourceSource,
  SustainedTimerUpdater,
  TickContext,
  World,
} from '@aesfw/core';
import { ids } from '@aesfw/core';

import { compileCondition } from './compile.js';
import { evaluate } from './evaluate.js';
import type { EvalContext } from './evaluate.js';
import type { Expr, QueryRef } from './expr.js';
import type { ContentRegistry } from '../registry/types.js';
import type { CompiledContent } from '../types.js';

/** A tracked `sustained` node of a condition (TDS-14.3). */
interface TrackedNode {
  readonly slot: number;
  readonly ticks: number;
  readonly inner: Expr;
}

/** A condition that contains at least one `sustained` node. */
interface TrackedCondition {
  readonly handle: DefinitionHandle;
  readonly nodes: readonly TrackedNode[];
}

/** A pending timer update for one `(condition, slot, subject)`. */
interface PendingTimer {
  readonly condition: DefinitionHandle;
  readonly slot: number;
  readonly subject: ids.EntityId;
  readonly consecutiveTrueTicks: number;
}

/** Resolves a domain query for the phase 22 inner evaluation (design D4). */
export type SustainedQueryResolver = (
  world: World,
  subject: ids.EntityId,
  query: QueryRef,
) => number;

/** Resolves a domain query for an owner-scoped `sustained` timer (GDD-19). */
export type SustainedOwnerQueryResolver = (
  world: World,
  owner: ids.OwnerHandle,
  query: QueryRef,
) => number;

const timerKey = (condition: DefinitionHandle, slot: number, subject: ids.EntityId): string =>
  `${condition}|${slot}|${subject}`;

const compareTimers = (a: PendingTimer, b: PendingTimer): number =>
  a.condition - b.condition || a.slot - b.slot || a.subject - b.subject;

/** Collects the `sustained` nodes of a tree in pre-order (TDS-14.3). */
const collectNodes = (root: Expr): TrackedNode[] => {
  const nodes: TrackedNode[] = [];
  const walk = (expr: Expr): void => {
    switch (expr.t) {
      case 'sustained':
        nodes.push({ slot: expr.slot, ticks: expr.ticks, inner: expr.inner });
        walk(expr.inner);
        return;
      case 'int':
      case 'bool':
      case 'query':
      case 'agg':
        return;
      case 'all':
      case 'any':
      case 'arith':
        expr.args.forEach(walk);
        return;
      case 'not':
        walk(expr.arg);
        return;
      case 'cmp':
        walk(expr.l);
        walk(expr.r);
        return;
      case 'clamp':
        walk(expr.v);
        walk(expr.lo);
        walk(expr.hi);
        return;
    }
  };
  walk(root);
  return nodes;
};

/**
 * Builds the sustained-timer updater from compiled content (TDS-14.3, design
 * D4). Conditions without `sustained` nodes are skipped; v1 subjects are the
 * entities carrying a `resourceSource` whose resolved condition is the tracked
 * condition, in ascending entity id; the resulting table is ordered by
 * `(condition, slot, subject)`.
 *
 * Source: TDS-14.3
 */
export function buildSustainedTimerUpdater(
  content: CompiledContent,
  resolveQuery: SustainedQueryResolver = () => 0,
  resolveOwnerQuery?: SustainedOwnerQueryResolver,
): SustainedTimerUpdater {
  const registry = content.registry as ContentRegistry;
  const tracked = new Map<DefinitionHandle, TrackedCondition>();
  const definitions =
    typeof registry.definitionsOf === 'function' ? registry.definitionsOf('condition') : [];
  for (const definition of definitions) {
    const compiled = compileCondition(definition.data, registry);
    if (compiled.condition === null) continue;
    const nodes = collectNodes(compiled.condition.root);
    if (nodes.length > 0) tracked.set(definition.handle, { handle: definition.handle, nodes });
  }
  if (tracked.size === 0) return () => undefined;

  // Conditions referenced by unlock definitions are evaluated per owner
  // (TDS-14.3: "owners for unlocks"); their timer subjects are owner handles.
  const unlockConditions = new Set<DefinitionHandle>();
  const unlockDefinitions =
    typeof registry.definitionsOf === 'function' ? registry.definitionsOf('unlock') : [];
  for (const definition of unlockDefinitions) {
    const data = definition.data;
    if (typeof data !== 'object' || data === null || Array.isArray(data)) continue;
    const conditionId = (data as { readonly [key: string]: unknown })['condition'];
    if (typeof conditionId !== 'string') continue;
    const handle = registry.handleOf('condition', ids.stringId(conditionId));
    if (handle !== null) unlockConditions.add(handle);
  }

  return (ctx: TickContext): void => {
    const world: World = ctx.world;
    const existing = new Map<string, number>();
    for (const timer of world.timers.timers) {
      existing.set(
        timerKey(timer.condition, timer.slot, timer.subject),
        timer.consecutiveTrueTicks,
      );
    }
    const readTicks = (condition: DefinitionHandle, slot: number, subject: ids.EntityId): number =>
      existing.get(timerKey(condition, slot, subject)) ?? 0;

    const pending: PendingTimer[] = [];
    const sourceStore = world.stores.get<ResourceSource>('resourceSource');
    for (const entity of sourceStore.ids()) {
      const condition = sourceStore.get(entity)?.condition;
      const trackedCondition = condition !== undefined ? tracked.get(condition) : undefined;
      if (condition === undefined || trackedCondition === undefined) continue;
      const subject = ids.entityId(entity);
      for (const node of trackedCondition.nodes) {
        const context: EvalContext = {
          subject: { kind: 'entity', id: subject },
          query: (query) => resolveQuery(world, subject, query),
          aggregate: () => 0,
          timer: (slot) => readTicks(condition, slot, subject),
        };
        const holds = evaluate(node.inner, context) === true;
        pending.push({
          condition,
          slot: node.slot,
          subject,
          consecutiveTrueTicks: holds ? readTicks(condition, node.slot, subject) + 1 : 0,
        });
      }
    }
    if (resolveOwnerQuery !== undefined && unlockConditions.size > 0) {
      for (const owner of world.owners.owners) {
        for (const [condition, trackedCondition] of tracked) {
          if (!unlockConditions.has(condition)) continue;
          const subject = ids.entityId(owner.handle);
          for (const node of trackedCondition.nodes) {
            const context: EvalContext = {
              subject: { kind: 'owner', id: owner.handle },
              query: (query) => resolveOwnerQuery(world, owner.handle, query),
              aggregate: () => 0,
              timer: (slot) => readTicks(condition, slot, subject),
            };
            const holds = evaluate(node.inner, context) === true;
            pending.push({
              condition,
              slot: node.slot,
              subject,
              consecutiveTrueTicks: holds ? readTicks(condition, node.slot, subject) + 1 : 0,
            });
          }
        }
      }
    }
    if (pending.length === 0) return;

    pending.sort(compareTimers);
    const updated = new Map<string, number>();
    for (const timer of pending) {
      updated.set(timerKey(timer.condition, timer.slot, timer.subject), timer.consecutiveTrueTicks);
    }
    const seen = new Set(updated.keys());
    const merged = world.timers.timers
      .filter((timer) => !seen.has(timerKey(timer.condition, timer.slot, timer.subject)))
      .concat(
        pending.map((timer) => ({
          condition: timer.condition,
          slot: timer.slot,
          subject: timer.subject,
          consecutiveTrueTicks: timer.consecutiveTrueTicks,
        })),
      )
      .sort((a, b) => a.condition - b.condition || a.slot - b.slot || a.subject - b.subject);
    world.timers = { timers: merged };
  };
}
