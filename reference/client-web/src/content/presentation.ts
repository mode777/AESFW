/**
 * Presentation data for the client (REF-14.4, PIC-6, PIC-7). The catalogue is
 * generated from `ref.tier.presentation` at build time (design D1) because a
 * headless host never loads presentation packages (PIC-5); the client imports
 * plain data and never parses YAML.
 *
 * Source: REF-14.4, PIC-6, PIC-7
 */
import { PRESENTATION_DATA } from './generated/presentation.generated.js';

/** One mapping entry resolved from the presentation package (PIC-6). */
export interface PresentationMapping {
  readonly definition_id: string;
  readonly category_key: string | null;
  readonly sort_order: number;
  readonly fallback_shape: string | null;
}

/** The client-side presentation catalogue (REF-14.4). */
export interface Presentation {
  readonly packageId: string;
  readonly packageVersion: string;
  readonly locale: string;
  readonly entries: Readonly<Record<string, string>>;
  readonly mappings: readonly PresentationMapping[];
  readonly fallback: { readonly shape: string; readonly locale: string } | null;
  readonly formatting: {
    readonly base_scale: number;
    readonly number: { readonly grouping: boolean; readonly decimals: number };
    readonly rates: {
      readonly per_minute: boolean;
      readonly tick_duration_ms: number;
    };
  };
}

interface GeneratedPresentation {
  readonly package_id: string;
  readonly package_version: string;
  readonly locale: string;
  readonly entries: Readonly<Record<string, string>>;
  readonly mappings: readonly PresentationMapping[];
  readonly fallback: { readonly shape: string; readonly locale: string } | null;
  readonly formatting: Presentation['formatting'];
}

const data = PRESENTATION_DATA as GeneratedPresentation;

/** The reference presentation catalogue. */
export const PRESENTATION: Presentation = {
  packageId: data.package_id,
  packageVersion: data.package_version,
  locale: data.locale,
  entries: data.entries,
  mappings: data.mappings,
  fallback: data.fallback,
  formatting: data.formatting,
};

/** The mapping of one definition, or `null` (04 §6 allows missing mappings). */
export const mappingOf = (definitionId: string): PresentationMapping | null =>
  PRESENTATION.mappings.find((mapping) => mapping.definition_id === definitionId) ?? null;

/** The localization entries as the i18n table (PIC-7). */
export const presentationEntries = (): Readonly<Record<string, string>> => PRESENTATION.entries;

/** The unlock hint key of a definition (PIC-7). */
export const unlockHintKey = (definitionId: string): string => `${definitionId}.unlock_hint`;

/** The description key of a definition (PIC-7). */
export const descriptionKey = (definitionId: string): string => `${definitionId}.description`;
