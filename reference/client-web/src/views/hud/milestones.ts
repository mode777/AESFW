/**
 * The milestone tracker (REF-12.6): five client-local milestones shown as
 * locked or complete with their descriptions. Completion is persisted per save
 * slot; the tracker never changes the session.
 *
 * Source: REF-12.6
 */
import { h } from '../../dom/h.js';
import type { Milestone } from '../../selectors/milestones.js';

/** A mounted milestone tracker. */
export interface MilestoneTracker {
  readonly el: HTMLElement;
  show(milestones: readonly Milestone[]): void;
}

/** Creates the milestone tracker (REF-12.6). */
export function createMilestoneTracker(): MilestoneTracker {
  const list = h('ol', { class: 'milestone-list', 'data-testid': 'milestone-list' });
  const el = h(
    'div',
    { class: 'milestone-tracker' },
    h('h3', { class: 'context-section-title', text: 'Milestones' }),
    list,
  );
  let signature = '';
  const show = (milestones: readonly Milestone[]): void => {
    const next = milestones.map((entry) => `${entry.id}:${entry.complete}`).join(',');
    if (next === signature) return;
    signature = next;
    list.replaceChildren(
      ...milestones.map((milestone) =>
        h(
          'li',
          {
            class: milestone.complete ? 'milestone milestone-complete' : 'milestone',
            'data-testid': `milestone-${milestone.id}`,
            'data-complete': milestone.complete ? 'true' : 'false',
          },
          h('span', { class: 'milestone-mark', text: milestone.complete ? '●' : '○' }),
          h('span', { class: 'milestone-text', text: milestone.description }),
        ),
      ),
    );
  };
  show([]);
  return { el, show };
}
