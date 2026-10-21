/**
 * The pure content source (TDS-20.1). `@aesfw/content` never touches the file
 * system or the network; a host supplies one `PackageSource` per package
 * directory. `createMemorySource` builds a source from in-memory text for
 * tests and fixtures.
 *
 * Source: TDS-20.1, CONT-2
 */
import { det } from '@aesfw/core';

/** A read-only view over one package directory (TDS-20.1). */
export interface PackageSource {
  /** The package root, for diagnostics. */
  readonly packageRoot: string;
  /** Relative paths of the files the source exposes, in ascending code-unit order. */
  list(): readonly string[];
  /** The UTF-8 text of a relative path, or `null` when it is absent. */
  read(path: string): string | null;
}

/**
 * Builds a `PackageSource` over in-memory files. Keys are sorted so `list()`
 * is deterministic regardless of insertion order. Not authoritative state.
 *
 * Source: TDS-20.1
 */
export function createMemorySource(
  packageRoot: string,
  files: Readonly<Record<string, string>>,
): PackageSource {
  const paths = Object.keys(files).sort(det.compareStrings);
  return {
    packageRoot,
    list: () => paths.slice(),
    read: (path) =>
      Object.prototype.hasOwnProperty.call(files, path) ? (files[path] ?? null) : null,
  };
}
