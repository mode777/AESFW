/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { COLLECTION_ORDER } from './collections.js';
import { exportJsonSchemas } from './export.js';

const schemasBase = new URL('../../schemas/', import.meta.url);

describe('[TDS-20.4] published JSON Schema', () => {
  it('[TDS-20.4] exported schemas match the committed files', () => {
    const exported = exportJsonSchemas();
    for (const collection of COLLECTION_ORDER) {
      const name = `${collection}.json`;
      const committed: unknown = JSON.parse(readFileSync(new URL(name, schemasBase), 'utf8'));
      expect(committed).toEqual(exported[name]);
    }
  });
});
