/**
 * `persistence` — the versioned save document and the pure save/load functions
 * (TDS-19.1).
 *
 * Source: TDS-19.1, ARCH-15
 */
export { save } from './save.js';
export { load } from './load.js';
export { FRAMEWORK_VERSION, HASH_ALGORITHM } from './types.js';
export type { SaveDocument, SaveHeader, SaveSessionState } from './types.js';
