/**
 * The package manifest model and schema (CONT-3). The TypeBox schema is the
 * single source for both runtime validation and the published JSON Schema
 * artifact (`add-core-definition-schemas`, 1.2, extends the published set).
 *
 * Source: CONT-3
 */
import { Type, type Static } from '@sinclair/typebox';

import type { PackageType } from '../types.js';
import type { PackageSource } from './source.js';

const DependencySchema = Type.Object(
  {
    package: Type.String({ minLength: 1 }),
    version: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const MigrationSchema = Type.Object(
  {
    from: Type.String({ minLength: 1 }),
    file: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

/** The `package.yaml` schema of CONT-3. */
export const ManifestSchema = Type.Object(
  {
    package: Type.Object(
      {
        id: Type.String({ minLength: 1 }),
        version: Type.String({ minLength: 1 }),
        schema_version: Type.Literal(1),
        type: Type.Union([
          Type.Literal('simulation_content'),
          Type.Literal('optional_module'),
          Type.Literal('presentation'),
        ]),
        dependencies: Type.Optional(Type.Array(DependencySchema)),
        files: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        migrations: Type.Optional(Type.Array(MigrationSchema)),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

/** The parsed manifest data of CONT-3. */
export type ManifestData = Static<typeof ManifestSchema>;

/** A declared dependency with its version range (CONT-3). */
export interface ManifestDependency {
  readonly package: string;
  readonly version: string;
}

/** A declared migration (CONT-3). */
export interface ManifestMigration {
  readonly from: string;
  readonly file: string;
}

/** A resolved package manifest, tied to the source it came from. */
export interface Manifest {
  readonly source: PackageSource;
  /** The manifest file path within the package; always `package.yaml`. */
  readonly file: string;
  readonly id: string;
  readonly version: string;
  readonly schemaVersion: number;
  readonly type: PackageType;
  readonly dependencies: readonly ManifestDependency[];
  readonly files: readonly string[];
  readonly migrations: readonly ManifestMigration[];
}
