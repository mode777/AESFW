/**
 * The R0 content passed to the worker (REF-14.4). The reference client is
 * built with the reference content package; the raw YAML is bundled as text.
 *
 * `ref.tier` is split into the per-domain files of 07 §6, so every file listed
 * in `package.yaml` is imported explicitly here (`?raw`) and passed through in
 * manifest order. Adding a file to the manifest needs a matching import; the
 * list is enumerated rather than globbed because the bundler must see static
 * specifiers.
 *
 * Source: REF-14.4, REF-5
 */
import type { ContentSourceDto } from '@aesfw/protocol';
import conditionsYaml from '../../../content/ref.tier/conditions.yaml?raw';
import connectionsYaml from '../../../content/ref.tier/connections.yaml?raw';
import curvesYaml from '../../../content/ref.tier/curves.yaml?raw';
import distributionYaml from '../../../content/ref.tier/distribution.yaml?raw';
import economyYaml from '../../../content/ref.tier/economy.yaml?raw';
import entitiesYaml from '../../../content/ref.tier/entities.yaml?raw';
import establishmentYaml from '../../../content/ref.tier/establishment.yaml?raw';
import exchangesYaml from '../../../content/ref.tier/exchanges.yaml?raw';
import locationsYaml from '../../../content/ref.tier/locations.yaml?raw';
import needsYaml from '../../../content/ref.tier/needs.yaml?raw';
import packageYaml from '../../../content/ref.tier/package.yaml?raw';
import populationYaml from '../../../content/ref.tier/population.yaml?raw';
import recipesYaml from '../../../content/ref.tier/recipes.yaml?raw';
import regionsYaml from '../../../content/ref.tier/regions.yaml?raw';
import resourcesYaml from '../../../content/ref.tier/resources.yaml?raw';
import satisfactionYaml from '../../../content/ref.tier/satisfaction.yaml?raw';
import templatesYaml from '../../../content/ref.tier/templates.yaml?raw';
import transitionsYaml from '../../../content/ref.tier/transitions.yaml?raw';
import transportYaml from '../../../content/ref.tier/transport.yaml?raw';
import unlocksYaml from '../../../content/ref.tier/unlocks.yaml?raw';
import worldYaml from '../../../content/ref.tier/world.yaml?raw';

/**
 * The split `ref.tier` documents in `package.yaml` order. The manifest itself
 * is always first, because the loader resolves the file list from it.
 */
const TIER_FILES: readonly { readonly path: string; readonly text: string }[] = [
  { path: 'package.yaml', text: packageYaml },
  { path: 'resources.yaml', text: resourcesYaml },
  { path: 'regions.yaml', text: regionsYaml },
  { path: 'distribution.yaml', text: distributionYaml },
  { path: 'locations.yaml', text: locationsYaml },
  { path: 'connections.yaml', text: connectionsYaml },
  { path: 'establishment.yaml', text: establishmentYaml },
  { path: 'world.yaml', text: worldYaml },
  { path: 'conditions.yaml', text: conditionsYaml },
  { path: 'curves.yaml', text: curvesYaml },
  { path: 'needs.yaml', text: needsYaml },
  { path: 'population.yaml', text: populationYaml },
  { path: 'satisfaction.yaml', text: satisfactionYaml },
  { path: 'transitions.yaml', text: transitionsYaml },
  { path: 'recipes.yaml', text: recipesYaml },
  { path: 'templates.yaml', text: templatesYaml },
  { path: 'entities.yaml', text: entitiesYaml },
  { path: 'transport.yaml', text: transportYaml },
  { path: 'exchanges.yaml', text: exchangesYaml },
  { path: 'economy.yaml', text: economyYaml },
  { path: 'unlocks.yaml', text: unlocksYaml },
];

/** The R0 content sources (REF-5). */
export const R0_CONTENT: readonly ContentSourceDto[] = [
  {
    root: 'ref.tier',
    files: TIER_FILES,
  },
];
