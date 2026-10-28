/**
 * Number formatting from the presentation package (REF-14.4, PIC-7). Manual
 * grouping keeps it deterministic and testable (no `Intl`).
 *
 * Source: REF-14.4, PIC-7
 */

/** The formatting subset the client needs. */
export interface Formatting {
  readonly baseScale: number;
  readonly grouping: boolean;
  readonly decimals: number;
  readonly perMinute: boolean;
  readonly tickDurationMs: number;
}

/** Formatting for the reference package's declared values. */
export interface Formatter {
  /** Base units to display units, grouped (e.g. `1,234`). */
  format(value: number): string;
  /** Base units per tick as the declared rate unit (e.g. `+12/min`). */
  formatRate(perTick: number): string;
  /** The display unit suffix of a rate (`/min` or `/tick`). */
  readonly rateUnit: string;
}

const groupDigits = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Creates a formatter for `formatting` (PIC-7). */
export function createFormatter(formatting: Formatting): Formatter {
  const scale = formatting.baseScale > 0 ? formatting.baseScale : 1;
  const unit = formatting.perMinute ? '/min' : '/tick';
  const perMinuteFactor =
    60_000 / (formatting.tickDurationMs > 0 ? formatting.tickDurationMs : 1000);

  const format = (value: number): string => {
    const display = value / scale;
    const factor = 10 ** formatting.decimals;
    const rounded = Math.round(display * factor) / factor;
    const sign = rounded < 0 ? '-' : '';
    const absolute = Math.abs(rounded);
    const [whole = '0', fraction] = absolute.toFixed(formatting.decimals).split('.');
    const grouped = formatting.grouping ? groupDigits(whole) : whole;
    return fraction === undefined ? `${sign}${grouped}` : `${sign}${grouped}.${fraction}`;
  };

  return {
    rateUnit: unit,
    format,
    formatRate(perTick) {
      const value = formatting.perMinute ? perTick * perMinuteFactor : perTick;
      const sign = value < 0 ? '-' : '+';
      return `${sign}${format(Math.abs(value))}${unit}`;
    },
  };
}
