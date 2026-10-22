/**
 * Pure placement selectors for the build palette and the placement ghost
 * (REF-13.1–13.4, REF-10.2, REF-10.3). Every view model the placement mode
 * draws or submits is derived here from protocol DTOs and client-local view
 * state; no placement mechanics are computed (REF-17, PIC-2.2) and no DOM work
 * happens (REF-14.2). Placement validity comes only from the authoritative
 * `placement_result` (PIC-12.1).
 *
 * Source: REF-13.1, REF-13.2, REF-13.3, REF-13.4, REF-10.2, REF-10.3, PIC-4,
 * PIC-12.1, PIC-13
 */
import type {
  CommandResultDto,
  DefinitionMetadataDto,
  JsonObject,
  JsonValue,
  PlacementReasonDto,
  PlacementResultDto,
} from '@aesfw/protocol';
import type { I18n } from '../i18n/index.js';
import type { PlacementCursor } from '../store/view-state.js';
import { archetypeOf, shapeGrammar } from './grid.js';
import type { ShapeArchetype, ShapeDescriptor } from './grid.js';

const asObject = (value: JsonValue | undefined): JsonObject | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;

const componentsOf = (metadata: DefinitionMetadataDto): JsonObject | undefined =>
  asObject(metadata.parameters['components']);

const placementOf = (metadata: DefinitionMetadataDto): JsonObject | undefined =>
  asObject(componentsOf(metadata)?.['placement']);

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** One build-palette entry (REF-13.3, REF-12.4). */
export interface PaletteEntry {
  readonly definitionId: string;
  readonly label: string;
  readonly archetype: ShapeArchetype;
}

/**
 * Lists the placeable entity definitions: those whose metadata carries a
 * `placement` component, ordered by ascending definition ID, each with its
 * localized label and shape archetype. Definitions without a `placement`
 * component are omitted.
 *
 * Source: REF-13.3, REF-12.4, PIC-4
 */
export function paletteEntries(
  definitions: readonly DefinitionMetadataDto[],
  i18n: I18n,
): readonly PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  for (const metadata of definitions) {
    if (placementOf(metadata) === undefined) continue;
    entries.push({
      definitionId: metadata.definition_id,
      label: i18n.t(metadata.definition_id),
      archetype: archetypeOf(metadata),
    });
  }
  return entries.sort((a, b) => compareIds(a.definitionId, b.definitionId));
}

/** A placement footprint in cells (REF-13.3). */
export interface Footprint {
  readonly width: number;
  readonly height: number;
}

/**
 * Reads the `placement.footprint` `[width, height]` from entity-definition
 * metadata, or `null` when it is absent or malformed.
 *
 * Source: REF-13.3, PIC-4
 */
export function placementFootprint(metadata: DefinitionMetadataDto): Footprint | null {
  const raw = placementOf(metadata)?.['footprint'];
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const list = raw as readonly JsonValue[];
  const width = list[0];
  const height = list[1];
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    return null;
  }
  return { width, height };
}

/** The oriented footprint of the placement ghost (REF-13.3, REF-10.2). */
export interface GhostShape {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly shape: ShapeDescriptor;
}

/**
 * Places the ghost footprint at the cursor, swapping the axes for an odd
 * orientation and rendering the definition's shape grammar.
 *
 * Source: REF-13.3, REF-10.2
 */
export function ghostShape(
  cursor: PlacementCursor,
  footprint: Footprint,
  archetype: ShapeArchetype,
): GhostShape {
  const swap = cursor.orientation % 2 === 1;
  return {
    x: cursor.position[0],
    y: cursor.position[1],
    width: swap ? footprint.height : footprint.width,
    height: swap ? footprint.width : footprint.height,
    shape: shapeGrammar(archetype),
  };
}

/** The REF-10.3 placement-ghost states. */
export type GhostValidity = 'unknown' | 'valid' | 'invalid';

/**
 * Derives the ghost visual state from the authoritative placement result
 * (REF-10.3, REF-13.3): `unknown` before any result, otherwise `valid` or
 * `invalid`. It reads no world state and computes no mechanics.
 *
 * Source: REF-13.3, REF-10.3, PIC-12.1, REF-17
 */
export function ghostValidity(result: PlacementResultDto | null): GhostValidity {
  if (result === null) return 'unknown';
  return result.valid ? 'valid' : 'invalid';
}

/**
 * Localizes the authoritative placement rejection reasons in their returned
 * order (REF-13.3, PIC-12.1).
 *
 * Source: REF-13.3, PIC-12.1
 */
export function reasonLabels(
  reasons: readonly PlacementReasonDto[],
  i18n: I18n,
): readonly string[] {
  return reasons.map((reason) => i18n.t(reason.code));
}

/**
 * Builds the read-only `placement_query` for the ghost, or `null` when no
 * definition is selected (REF-13.3, PIC-12.1).
 *
 * Source: REF-13.3, PIC-12.1
 */
export function placementQueryPayload(
  cursor: PlacementCursor,
  locationId: number,
): JsonObject | null {
  if (cursor.definitionId === null) return null;
  return {
    kind: 'placement_query',
    definition_id: cursor.definitionId,
    location_id: locationId,
    logical_transform: {
      position: [cursor.position[0], cursor.position[1]],
      orientation: cursor.orientation,
    },
  };
}

/** The placement keyboard actions of REF-13.2 (REF-13.3). */
export type PlacementActionKind = 'move' | 'rotate' | 'confirm' | 'cancel' | 'none';

/** A placement keyboard action and the cursor it produces (REF-13.2). */
export interface PlacementAction {
  readonly kind: PlacementActionKind;
  readonly cursor: PlacementCursor;
}

/** Grid bounds the cursor is clamped to (REF-13.2). */
export interface GridBounds {
  readonly width: number;
  readonly height: number;
}

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

const moved = (cursor: PlacementCursor, x: number, y: number): PlacementCursor => ({
  ...cursor,
  position: [x, y],
  result: null,
});

/**
 * Maps a keyboard key to a placement action (REF-13.2, REF-13.3): arrows move
 * the cursor clamped to the grid bounds, `R`/`r` rotates it, `Enter` confirms,
 * `Escape` cancels, and any other key does nothing. A move or rotate clears
 * the stale placement result.
 *
 * Source: REF-13.1, REF-13.2, REF-13.3
 */
export function placementKeyAction(
  cursor: PlacementCursor,
  key: string,
  bounds: GridBounds,
): PlacementAction {
  const [x, y] = cursor.position;
  const maxX = Math.max(0, bounds.width - 1);
  const maxY = Math.max(0, bounds.height - 1);
  switch (key) {
    case 'ArrowUp':
      return { kind: 'move', cursor: moved(cursor, x, clamp(y - 1, 0, maxY)) };
    case 'ArrowDown':
      return { kind: 'move', cursor: moved(cursor, x, clamp(y + 1, 0, maxY)) };
    case 'ArrowLeft':
      return { kind: 'move', cursor: moved(cursor, clamp(x - 1, 0, maxX), y) };
    case 'ArrowRight':
      return { kind: 'move', cursor: moved(cursor, clamp(x + 1, 0, maxX), y) };
    case 'r':
    case 'R':
      return {
        kind: 'rotate',
        cursor: { ...cursor, orientation: (cursor.orientation + 1) % 4, result: null },
      };
    case 'Enter':
      return { kind: 'confirm', cursor };
    case 'Escape':
      return { kind: 'cancel', cursor };
    default:
      return { kind: 'none', cursor };
  }
}

/**
 * Builds the `PlaceEntityPlan` command payload for the ghost, or `null` when no
 * definition is selected (REF-13.3, PIC-12).
 *
 * Source: REF-13.3, PIC-12
 */
export function placeEntityPlanPayload(
  cursor: PlacementCursor,
  locationId: number,
): JsonObject | null {
  if (cursor.definitionId === null) return null;
  return {
    definition_id: cursor.definitionId,
    location_id: locationId,
    logical_transform: {
      position: [cursor.position[0], cursor.position[1]],
      orientation: cursor.orientation,
    },
  };
}

const NOT_YET_ACTIVE = new Set(['planned', 'awaiting_resources', 'constructing']);

/**
 * Returns the construction commands applicable to an entity lifecycle
 * (REF-12.2, REF-12.3, REF-13.3): a not-yet-active lifecycle offers cancel and
 * commit, an active lifecycle offers deconstruct, and any other lifecycle
 * offers none. Commands are ordered by ascending name.
 *
 * Source: REF-12.2, REF-12.3, REF-13.3
 */
export function constructionCommands(lifecycle: string): readonly string[] {
  if (NOT_YET_ACTIVE.has(lifecycle)) return ['CancelEntityPlan', 'CommitConstruction'];
  if (lifecycle === 'active') return ['DeconstructEntity'];
  return [];
}

/**
 * Builds the localized notice for a command result, or `null` when the command
 * was accepted (REF-13.4, PIC-13). A rejected command names its first error
 * code; the text is localized client-side.
 *
 * Source: REF-13.4, PIC-13
 */
export function commandNotice(result: CommandResultDto, i18n: I18n): string | null {
  if (result.status === 'accepted') return null;
  const error = result.errors[0];
  const reason = error === undefined ? '' : `: ${i18n.t(error.code)}`;
  return `${i18n.t('command.rejected')}${reason}`;
}
