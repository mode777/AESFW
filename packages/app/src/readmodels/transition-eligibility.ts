/**
 * Transition eligibility read model (PIC-10.1, GDD-13.1). Reports, for each
 * transition whose source tier matches a residence, whether it is eligible
 * and the per-condition checklist including sustained-timer progress.
 *
 * Source: PIC-10.1, GDD-13.1, TDS-14.3
 */
import { declineTransitionsOf, readWorld, transitionDefinitionOf } from '@aesfw/core';
import type { DefinitionHandle, World } from '@aesfw/core';
import { compileCondition } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import type { Expr } from '@aesfw/content';
import type { TransitionConditionDto, TransitionEligibilityDto } from '@aesfw/protocol';

import { buildConditionEvaluator } from '../session/placement.js';
import type { SessionState } from '../session/types.js';

const registryOf = (content: CompiledContent): ContentRegistry =>
  content.registry as ContentRegistry;

const timerTicks = (
  world: World,
  condition: DefinitionHandle,
  slot: number,
  subject: number,
): number =>
  world.timers.timers.find(
    (timer) => timer.condition === condition && timer.slot === slot && timer.subject === subject,
  )?.consecutiveTrueTicks ?? 0;

const collectSustained = (expr: Expr, out: { slot: number; ticks: number }[]): void => {
  switch (expr.t) {
    case 'sustained':
      out.push({ slot: expr.slot, ticks: expr.ticks });
      collectSustained(expr.inner, out);
      return;
    case 'int':
    case 'bool':
    case 'query':
    case 'agg':
      return;
    case 'all':
    case 'any':
    case 'arith':
      expr.args.forEach((arg) => collectSustained(arg, out));
      return;
    case 'not':
      collectSustained(expr.arg, out);
      return;
    case 'cmp':
      collectSustained(expr.l, out);
      collectSustained(expr.r, out);
      return;
    case 'clamp':
      collectSustained(expr.v, out);
      collectSustained(expr.lo, out);
      collectSustained(expr.hi, out);
      return;
  }
};

/**
 * Builds the transition eligibility checklist for a residence (PIC-10.1).
 *
 * Source: PIC-10.1, GDD-13.1
 */
export function transitionEligibility(
  session: SessionState,
  actor: number,
  entity: number,
): readonly TransitionEligibilityDto[] {
  const world = session.world;
  const registry = registryOf(session.content);
  const residence = world.stores
    .get<{ readonly tier: DefinitionHandle; readonly location?: number }>('residence')
    .get(entity as never);
  if (residence === undefined) return [];
  const reader = readWorld(world, registry);
  if (
    session.settings.fog &&
    residence.location !== undefined &&
    residence.location !== null &&
    reader.knowledge(actor as never, residence.location as never) === 'unknown'
  ) {
    return [];
  }
  const bandState = world.stores
    .get<{ readonly advancementEnabled: boolean }>('bandState')
    .get(entity as never);
  const advancementEnabled = bandState?.advancementEnabled ?? true;
  const evaluator = buildConditionEvaluator(session.content);
  const declines = new Set(declineTransitionsOf(registry, residence.tier));
  const result: TransitionEligibilityDto[] = [];
  for (const handle of registry.handlesOf?.('transition') ?? []) {
    const definition = transitionDefinitionOf(registry, handle);
    if (definition === null || definition.sourceTier !== residence.tier) continue;
    const transitionId = registry.stringIdOf('transition', handle) ?? `transition.${handle}`;
    const conditions: TransitionConditionDto[] = [];
    let conditionMet = true;
    if (definition.condition !== null) {
      const conditionId =
        registry.stringIdOf('condition', definition.condition) ??
        `condition.${definition.condition}`;
      const data = registry.definitionOf('condition', definition.condition)?.data ?? null;
      const compiled = compileCondition(data, registry);
      if (compiled.condition !== null) {
        const sustained: { slot: number; ticks: number }[] = [];
        collectSustained(compiled.condition.root, sustained);
        for (const node of sustained) {
          const progress = timerTicks(world, definition.condition, node.slot, entity);
          conditions.push({
            kind: 'sustained',
            condition_id: conditionId,
            ticks: node.ticks,
            progress,
            met: progress >= node.ticks,
          });
        }
      }
      conditionMet = evaluator(world, definition.condition, entity as never);
      conditions.push({ kind: 'condition', condition_id: conditionId, met: conditionMet });
    }
    // `enable_advancement` gates advancement only, not a tier's decline.
    const gated = !declines.has(handle) && !advancementEnabled;
    result.push({
      transition_id: transitionId,
      eligible: conditionMet && !gated,
      advancement_enabled: advancementEnabled,
      conditions,
    });
  }
  return result;
}
