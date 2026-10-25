/**
 * Content load orchestration (TDS-20.1, TDS-20.2). Runs the stages implemented
 * so far in order and returns a `ContentResult`; content is `null` when any
 * error-severity diagnostic is present.
 *
 * Source: TDS-20.1, TDS-20.2
 */
import type { Diagnostic } from '@aesfw/core';

import { composeDefinitions } from '../composition/compose.js';
import { compileExpressions } from '../conditions/compile.js';
import { parseFiles } from '../package/parse.js';
import { resolveManifests } from '../package/resolve.js';
import type { PackageSource } from '../package/source.js';
import { validateSchemas } from '../schemas/validate.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { ContentResult, LoadOptions } from '../types.js';
import { validateGraphs } from '../validation/index.js';
import { buildRegistry } from './build.js';
import { checksum } from './normalize.js';

/**
 * Loads and compiles content from package sources (TDS-20.1).
 *
 * Source: TDS-20.1, TDS-20.2
 */
export function loadContent(
  sources: readonly PackageSource[],
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): ContentResult {
  const manifests = resolveManifests(sources, options);
  const parsed = parseFiles(manifests.manifests, options);
  const validated = validateSchemas(parsed.files, options);
  const composed = composeDefinitions(validated.definitions, options);
  const graphDiagnostics = validateGraphs(composed.definitions, options);
  const built = buildRegistry(composed.definitions, options);
  const expressionDiagnostics = compileExpressions(composed.definitions, built.registry);

  const diagnostics: Diagnostic[] = [
    ...manifests.diagnostics,
    ...parsed.diagnostics,
    ...validated.diagnostics,
    ...composed.diagnostics,
    ...graphDiagnostics,
    ...built.diagnostics,
    ...expressionDiagnostics,
  ];

  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    return { content: null, diagnostics };
  }

  return {
    content: {
      registry: built.registry,
      checksum: checksum(built.definitions),
      packages: manifests.manifests.map((manifest) => ({
        id: manifest.id,
        version: manifest.version,
        type: manifest.type,
      })),
      presentation: null,
    },
    diagnostics,
  };
}
