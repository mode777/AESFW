/**
 * The graph-validation stage of the content pipeline (CONT-11.4, CONT-11.5,
 * CONT-12 step 9). Runs the per-graph checks over a composed definition set
 * and concatenates their diagnostics in a fixed order.
 *
 * Source: CONT-11.4, CONT-11.5
 */
import type { Diagnostic } from '@aesfw/core';

import type { RawDefinitions } from '../schemas/validate.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { LoadOptions } from '../types.js';
import { validateCompositionCompatibility } from './composition.js';
import { validateEconomics } from './economic.js';
import { validateExchangeGraph } from './exchange.js';
import { validatePopulationGraph } from './population.js';
import { validateProductionGraph } from './production.js';
import { validateSpatialGraph } from './spatial.js';
import { validateUnlockGraph } from './unlock.js';

export { GRAPH_VALIDATION_CODES } from '../diagnostics/catalogue.js';
export { validateCompositionCompatibility } from './composition.js';
export { validateEconomics } from './economic.js';
export { validateExchangeGraph } from './exchange.js';
export { validatePopulationGraph } from './population.js';
export { validateProductionGraph } from './production.js';
export { validateSpatialGraph } from './spatial.js';
export { validateUnlockGraph } from './unlock.js';

/**
 * Runs every graph and economic check over a composed definition set
 * (CONT-12 step 9).
 *
 * Source: CONT-11.4, CONT-11.5, CONT-11.6
 */
export function validateGraphs(
  definitions: RawDefinitions,
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): readonly Diagnostic[] {
  return [
    ...validateCompositionCompatibility(definitions),
    ...validateProductionGraph(definitions),
    ...validatePopulationGraph(definitions),
    ...validateSpatialGraph(definitions),
    ...validateExchangeGraph(definitions),
    ...validateUnlockGraph(definitions),
    ...validateEconomics(definitions, options),
  ];
}
