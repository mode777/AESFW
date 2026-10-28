/**
 * The build menu (REF-12.3, 04 §6): placeable definitions grouped into tabs by
 * the presentation mapping's display category (one tab per tier), ordered by
 * `sort_order` then ID. Locked definitions are shown greyed with their unlock
 * hint, and each entry shows its construction costs next to the viewed
 * location's stock. The client makes no affordability judgment (amendment A14).
 *
 * Source: REF-12.3, REF-12.4, 04 §4, 04 §6
 */
import type { DefinitionMetadataDto } from '@aesfw/protocol';

import { mappingOf, unlockHintKey } from '../content/presentation.js';
import type { I18n } from '../i18n/index.js';
import { archetypeOf } from './grid.js';
import type { ShapeArchetype } from './grid.js';

/** One resource amount (cost or stock). */
export interface ResourceAmount {
  readonly resourceId: string;
  readonly quantity: number;
}

/** One entry of the build menu (REF-12.3). */
export interface BuildMenuEntry {
  readonly definitionId: string;
  readonly label: string;
  readonly archetype: ShapeArchetype;
  readonly categoryKey: string;
  readonly sortOrder: number;
  readonly locked: boolean;
  readonly unlockHint: string | null;
  readonly costs: readonly ResourceAmount[];
  /** The viewed location's stock for each costed resource, in the same order. */
  readonly stock: readonly ResourceAmount[];
}

/** One tab of the build menu (REF-12.3). */
export interface BuildMenuTab {
  readonly categoryKey: string;
  readonly label: string;
  readonly entries: readonly BuildMenuEntry[];
}

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const costsOf = (metadata: DefinitionMetadataDto): readonly ResourceAmount[] => {
  const components = metadata.parameters['components'];
  if (components === null || typeof components !== 'object' || Array.isArray(components)) return [];
  const construction = (components as Record<string, unknown>)['construction'];
  if (construction === null || typeof construction !== 'object' || Array.isArray(construction)) {
    return [];
  }
  const costs = (construction as Record<string, unknown>)['costs'];
  if (!Array.isArray(costs)) return [];
  const amounts: ResourceAmount[] = [];
  for (const cost of costs) {
    if (cost === null || typeof cost !== 'object' || Array.isArray(cost)) continue;
    const record = cost as Record<string, unknown>;
    const resourceId = record['resource'];
    const quantity = record['quantity'];
    if (typeof resourceId !== 'string' || typeof quantity !== 'number') continue;
    amounts.push({ resourceId, quantity });
  }
  return amounts;
};

const placementOf = (metadata: DefinitionMetadataDto): boolean =>
  metadata.parameters['components'] !== null &&
  typeof metadata.parameters['components'] === 'object' &&
  !Array.isArray(metadata.parameters['components']) &&
  (metadata.parameters['components'] as Record<string, unknown>)['placement'] !== undefined;

/**
 * Builds the tabbed build menu (REF-12.3). Tabs ascend by category key; entries
 * within a tab by `sort_order`, then definition ID. Definitions without a
 * presentation mapping fall back to an `uncategorised` tab rather than
 * disappearing.
 *
 * Source: REF-12.3, 04 §6
 */
export function buildMenu(
  definitions: readonly DefinitionMetadataDto[],
  i18n: I18n,
  stock: Readonly<Record<string, number>>,
): readonly BuildMenuTab[] {
  const entries: BuildMenuEntry[] = [];
  for (const metadata of definitions) {
    if (!placementOf(metadata)) continue;
    const mapping = mappingOf(metadata.definition_id);
    const costs = costsOf(metadata);
    entries.push({
      definitionId: metadata.definition_id,
      label: i18n.t(metadata.definition_id),
      archetype: archetypeOf(metadata),
      categoryKey: mapping?.category_key ?? 'uncategorised',
      sortOrder: mapping?.sort_order ?? 0,
      locked: metadata.locked === true,
      unlockHint: metadata.locked === true ? i18n.t(unlockHintKey(metadata.definition_id)) : null,
      costs,
      stock: costs.map((cost) => ({
        resourceId: cost.resourceId,
        quantity: stock[cost.resourceId] ?? 0,
      })),
    });
  }
  const byCategory = new Map<string, BuildMenuEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.categoryKey) ?? [];
    list.push(entry);
    byCategory.set(entry.categoryKey, list);
  }
  return [...byCategory.entries()]
    .sort(([a], [b]) => compareIds(a, b))
    .map(([categoryKey, list]) => ({
      categoryKey,
      label: i18n.t(categoryKey),
      entries: [...list].sort((a, b) =>
        a.sortOrder === b.sortOrder
          ? compareIds(a.definitionId, b.definitionId)
          : a.sortOrder - b.sortOrder,
      ),
    }));
}
