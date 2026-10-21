#!/usr/bin/env node
/**
 * Writes the published JSON Schema files (TDS-20.4) from the built schemas.
 *
 * Run `pnpm --filter @aesfw/content export:schemas` after a build. The files
 * under `packages/content/schemas/` are committed and checked against the
 * schemas by `src/schemas/export.test.ts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { exportJsonSchemas } from '../dist/schemas/export.js';

const outputDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
mkdirSync(outputDir, { recursive: true });

for (const [name, schema] of Object.entries(exportJsonSchemas())) {
  writeFileSync(join(outputDir, name), `${JSON.stringify(schema, null, 2)}\n`);
}
