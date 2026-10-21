/**
 * Reference codes that must never appear in framework source or fixtures
 * (TDS-4.3 rule 7). The change that introduces a new reference code extends
 * this list in the same change; the scanner builds one word-boundary pattern
 * per entry, case-sensitive.
 */
export const REFERENCE_CODE_DENYLIST = ['P1', 'AK1', 'S1'];
