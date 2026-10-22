import { describe, expect, it } from 'vitest';
import { createI18n } from './index.js';

describe('[REF-14.4] i18n', () => {
  it('[REF-14.4] a missing key falls back to the key', () => {
    const i18n = createI18n({});
    expect(i18n.t('ref.tier.resource.p1')).toBe('ref.tier.resource.p1');
  });

  it('[REF-14.4] a known key is translated', () => {
    const i18n = createI18n({ 'ref.tier.resource.p1': 'P1' });
    expect(i18n.t('ref.tier.resource.p1')).toBe('P1');
  });

  it('[REF-14.4] base units are formatted with grouping', () => {
    const i18n = createI18n({});
    expect(i18n.formatBaseUnits(1204500, 1000)).toBe('1,205');
  });
});
