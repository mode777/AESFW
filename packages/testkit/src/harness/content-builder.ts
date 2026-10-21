/**
 * The content builder (VER-5.2). Builds content through the real content
 * pipeline from in-memory definitions, so a test exercises the same loading,
 * parsing, validation, composition, and compilation a host does.
 *
 * Source: VER-5.2
 */
import { InvariantViolation, ids } from '@aesfw/core';
import type { DefinitionType, Diagnostic } from '@aesfw/core';
import { createMemorySource, loadContent } from '@aesfw/content';
import type {
  CompiledContent,
  CompiledDefinition,
  ContentRegistry,
  DefinitionCollection,
  JsonValue,
  LoadOptions,
} from '@aesfw/content';

/** The outcome of a content build. */
export interface ContentBuildResult {
  readonly content: CompiledContent | null;
  readonly registry: ContentRegistry | null;
  readonly checksum: string | null;
  readonly diagnostics: readonly Diagnostic[];
}

/** A fluent content builder (VER-5.2). */
export interface ContentBuilder {
  package(id: string, version?: string): ContentBuilder;
  define(collection: DefinitionCollection, definition: JsonValue): ContentBuilder;
  options(options: LoadOptions): ContentBuilder;
  build(): ContentBuildResult;
}

const manifestYaml = (id: string, version: string): string =>
  [
    'package:',
    `  id: ${id}`,
    `  version: ${version}`,
    '  schema_version: 1',
    '  type: simulation_content',
    '  files:',
    '    - content.yaml',
    '',
  ].join('\n');

/**
 * Creates a content builder that compiles through `loadContent` (VER-5.2).
 *
 * Source: VER-5.2
 */
export function content(): ContentBuilder {
  let packageId = 'test.content';
  let packageVersion = '1.0.0';
  let loadOptions: LoadOptions = { strictness: 'strict' };
  const definitions = new Map<DefinitionCollection, JsonValue[]>();

  const builder: ContentBuilder = {
    package(id, version = '1.0.0') {
      packageId = id;
      packageVersion = version;
      return builder;
    },
    define(collection, definition) {
      const bucket = definitions.get(collection) ?? [];
      bucket.push(definition);
      definitions.set(collection, bucket);
      return builder;
    },
    options(value) {
      loadOptions = value;
      return builder;
    },
    build() {
      const document: { [collection: string]: JsonValue } = {};
      for (const [collection, entries] of definitions) {
        document[collection] = entries;
      }
      const source = createMemorySource(packageId, {
        'package.yaml': manifestYaml(packageId, packageVersion),
        'content.yaml': JSON.stringify(document),
      });
      const result = loadContent([source], loadOptions);
      return {
        content: result.content,
        registry: (result.content?.registry as ContentRegistry | undefined) ?? null,
        checksum: result.content?.checksum ?? null,
        diagnostics: result.diagnostics,
      };
    },
  };

  return builder;
}

/**
 * Returns the compiled definitions of a type (VER-5.2).
 *
 * Source: VER-5.2
 */
export function definitionsOf(
  registry: ContentRegistry,
  type: DefinitionType,
): readonly CompiledDefinition[] {
  return registry.definitionsOf(type);
}

/**
 * Returns the compiled definition for an id, or `null` (VER-5.2).
 *
 * Source: VER-5.2
 */
export function definitionById(
  registry: ContentRegistry,
  type: DefinitionType,
  id: string,
): CompiledDefinition | null {
  const handle = registry.handleOf(type, ids.stringId(id));
  return handle === null ? null : registry.definitionOf(type, handle);
}

/**
 * Returns the diagnostic codes of a build result in order (VER-5.2).
 *
 * Source: VER-5.2
 */
export function diagnosticCodes(result: ContentBuildResult): readonly string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

/**
 * Returns the compiled content or throws an `InvariantViolation` carrying the
 * diagnostic codes (VER-5.2).
 *
 * Source: VER-5.2
 */
export function expectContentOk(result: ContentBuildResult): CompiledContent {
  if (result.content === null) {
    throw new InvariantViolation('content_build_failed', {
      diagnostics: diagnosticCodes(result).join(','),
    });
  }
  return result.content;
}

/**
 * Throws an `InvariantViolation` when the result carries any diagnostic
 * (VER-5.2).
 *
 * Source: VER-5.2
 */
export function expectNoDiagnostics(result: ContentBuildResult): void {
  if (result.diagnostics.length > 0) {
    throw new InvariantViolation('content_build_diagnostics', {
      diagnostics: diagnosticCodes(result).join(','),
    });
  }
}
