/**
 * Content-pipeline result types (TDS-20.1). These are declared here so that
 * every stage of the loader can agree on the shapes before the registry
 * compilation stage exists (roadmap 1.4). The `Diagnostic` type is defined in
 * `@aesfw/core` and re-exported by `@aesfw/content` (amendment A-04).
 *
 * Source: TDS-20.1, TDS-20.3, CONT-2
 */
import type { det, Diagnostic, Registry } from '@aesfw/core';

/** The JSON data domain used by the content pipeline. */
export type JsonValue = det.JsonValue;

/** The three kinds of independently loadable package (CONT-2, CONT-3). */
export type PackageType = 'simulation_content' | 'optional_module' | 'presentation';

/** Loader options; `strictness` governs unknown-field handling in later stages (CONT-11.2). */
export interface LoadOptions {
  readonly strictness: 'strict' | 'lenient';
}

/** The default loader options: strict. */
export const DEFAULT_LOAD_OPTIONS: LoadOptions = { strictness: 'strict' };

/**
 * The presentation registry produced from presentation packages (PIC-19). The
 * concrete shape is delivered by `add-reference-content-seed` (2.7); this
 * placeholder keeps `CompiledContent` stable until then.
 */
export type PresentationRegistry = Readonly<Record<string, JsonValue>>;

/** A package that contributed to compiled content, ordered by ascending ID. */
export interface CompiledPackage {
  readonly id: string;
  readonly version: string;
  readonly type: PackageType;
}

/** Compiled, frozen content (TDS-20.1). Produced by `add-registry-compilation` (1.4). */
export interface CompiledContent {
  readonly registry: Registry;
  readonly checksum: string;
  readonly packages: readonly CompiledPackage[];
  readonly presentation: PresentationRegistry | null;
}

/** The outcome of a content load (TDS-20.1). */
export interface ContentResult {
  readonly content: CompiledContent | null;
  readonly diagnostics: readonly Diagnostic[];
}
