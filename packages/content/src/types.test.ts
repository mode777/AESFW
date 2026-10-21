import { describe, expect, it } from 'vitest';

import { diag } from './diagnostics/diagnostics.js';
import type { ContentResult } from './types.js';

describe('[TDS-20.1] content result types', () => {
  it('[TDS-20.1] a failed content result carries null content', () => {
    const result: ContentResult = { content: null, diagnostics: [diag('manifest_invalid')] };
    expect(result.content).toBeNull();
    expect(result.diagnostics).toHaveLength(1);
  });
});
