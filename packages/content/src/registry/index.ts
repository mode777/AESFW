/**
 * Registry compilation (TDS-7, TDS-20.2).
 *
 * Source: TDS-7, TDS-20.2
 */
export type { CompiledDefinition, ContentRegistry } from './types.js';
export { assignHandles } from './handles.js';
export type { HandleAssignment, HandleSpace } from './handles.js';
export { resolveReferences } from './references.js';
export { buildIndexes } from './indexes.js';
export type { RegistryIndexes } from './indexes.js';
export { checksum, normalize } from './normalize.js';
export { buildRegistry } from './build.js';
export type { BuildResult } from './build.js';
export { loadContent } from './load.js';
