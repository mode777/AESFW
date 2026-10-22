import { describe, expect, it } from 'vitest';
import { decodeDefinitionMetadata } from '../index.js';

describe('[PIC-4] definition metadata codec', () => {
  it('[PIC-4] definition metadata decodes', () => {
    const decoded = decodeDefinitionMetadata({
      definition_id: 'test.entity.producer',
      definition_type: 'entity',
      tags: ['test.tag.a'],
      parameters: { rate: 10 },
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.definition_id).toBe('test.entity.producer');
  });

  it('[PIC-4] metadata without a definition id is rejected', () => {
    const decoded = decodeDefinitionMetadata({
      definition_type: 'entity',
      tags: [],
      parameters: {},
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('definition_id');
  });
});
