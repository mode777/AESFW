/**
 * Localization with key fallback and number formatting (REF-14.4, PIC-7).
 * Formatting is manual (no `Intl`) so it is deterministic and unit-testable.
 *
 * Source: REF-14.4, PIC-7
 */

/** Localization and formatting for the client (REF-14.4). */
export interface I18n {
  t(key: string): string;
  formatBaseUnits(value: number, scale: number): string;
}

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Creates the localization helper (REF-14.4). Missing keys fall back to the
 * key itself (PIC-7).
 *
 * Source: REF-14.4, PIC-7
 */
export function createI18n(entries: Readonly<Record<string, string>> = {}): I18n {
  return {
    t(key) {
      return entries[key] ?? key;
    },
    formatBaseUnits(value, scale) {
      if (scale <= 0) return String(value);
      const rounded = Math.round(value / scale);
      const sign = rounded < 0 ? '-' : '';
      return `${sign}${group(String(Math.abs(rounded)))}`;
    },
  };
}
