/**
 * Public entry point of `@aesfw/content`, the content pipeline.
 *
 * Roadmap row 1.1 (`add-content-package-loader`) delivers the entry stages:
 * the pure `PackageSource` view, the manifest model and schema, deterministic
 * manifest resolution with semantic-version dependency checks, and strict YAML
 * parsing. Later rows add schemas (1.2), composition (1.3), registry
 * compilation (1.4), conditions and curves (1.6), and validation (10.x).
 */
import type { Diagnostic } from '@aesfw/core';

export const CONTENT_PACKAGE_ID = '@aesfw/content' as const;

export type { Diagnostic } from '@aesfw/core';

export { diag, hasError } from './diagnostics/diagnostics.js';
export type { DiagFields } from './diagnostics/diagnostics.js';

export { parseFiles, parseYamlStrict } from './package/parse.js';
export type { ParsedFile, ParseResult, YamlContext, YamlParseOutcome } from './package/parse.js';

export { resolveManifests } from './package/resolve.js';
export type { ManifestResolution } from './package/resolve.js';

export { ManifestSchema } from './package/manifest.js';
export type {
  Manifest,
  ManifestData,
  ManifestDependency,
  ManifestMigration,
} from './package/manifest.js';

export { createMemorySource } from './package/source.js';
export type { PackageSource } from './package/source.js';

export * from './schemas/index.js';
export * from './composition/index.js';
export * from './registry/index.js';
export * from './conditions/index.js';
export { defaultWorldPlan } from './world/plan.js';
export type { DefaultWorldPlanResult } from './world/plan.js';

export { compareVersions, isValidRange, parseVersion, satisfies } from './semver/semver.js';
export type { Version } from './semver/semver.js';

export { DEFAULT_LOAD_OPTIONS } from './types.js';
export type {
  CompiledContent,
  CompiledPackage,
  ContentResult,
  JsonValue,
  LoadOptions,
  PackageType,
  PresentationRegistry,
} from './types.js';

/** Re-exported so hosts can name the diagnostic type without importing core. */
export type ContentDiagnostic = Diagnostic;
