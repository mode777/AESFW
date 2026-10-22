import { describe, expect, it } from 'vitest';
import type { DefinitionMetadataDto, JsonObject, PlacementResultDto } from '@aesfw/protocol';
import { createI18n } from '../i18n/index.js';
import {
  commandNotice,
  constructionCommands,
  ghostShape,
  ghostValidity,
  paletteEntries,
  placeEntityPlanPayload,
  placementFootprint,
  placementKeyAction,
  placementQueryPayload,
  reasonLabels,
} from './placement.js';
import type { PlacementCursor } from '../store/view-state.js';

const i18n = createI18n({});

const metadata = (components: JsonObject): DefinitionMetadataDto => ({
  definition_id: 'test.entity.a',
  definition_type: 'entity',
  tags: [],
  parameters: { components },
});

const cursor = (overrides: Partial<PlacementCursor> = {}): PlacementCursor => ({
  definitionId: 'test.entity.a',
  position: [0, 0],
  orientation: 0,
  result: null,
  ...overrides,
});

describe('[REF-13.3][REF-12.4][PIC-4] paletteEntries', () => {
  it('[REF-13.3][REF-12.4][PIC-4] a placeable definition is listed', () => {
    const value = metadata({
      placement: { footprint: [3, 3] },
      producer: { recipes: ['test.recipe.a'] },
    });
    expect(paletteEntries([value], i18n)).toEqual([
      { definitionId: 'test.entity.a', label: 'test.entity.a', archetype: 'refiner' },
    ]);
  });

  it('[REF-13.3][REF-12.4][PIC-4] a non-placeable definition is omitted', () => {
    expect(paletteEntries([metadata({ producer: {} })], i18n)).toEqual([]);
  });

  it('[REF-13.3][REF-12.4][PIC-4] entries are sorted by ascending definition ID', () => {
    const entries = paletteEntries(
      [
        { ...metadata({ placement: { footprint: [1, 1] } }), definition_id: 'test.entity.b' },
        { ...metadata({ placement: { footprint: [1, 1] } }), definition_id: 'test.entity.a' },
      ],
      i18n,
    );
    expect(entries.map((entry) => entry.definitionId)).toEqual(['test.entity.a', 'test.entity.b']);
  });
});

describe('[REF-13.3][REF-10.2][PIC-4] placementFootprint and ghostShape', () => {
  it('[REF-13.3][REF-10.2][PIC-4] a footprint is read', () => {
    expect(placementFootprint(metadata({ placement: { footprint: [3, 3] } }))).toEqual({
      width: 3,
      height: 3,
    });
  });

  it('[REF-13.3][REF-10.2][PIC-4] a missing footprint returns null', () => {
    expect(placementFootprint(metadata({ producer: {} }))).toBeNull();
  });

  it('[REF-13.3][REF-10.2][PIC-4] orientation swaps the ghost axes', () => {
    const shape = ghostShape(
      cursor({ position: [2, 2], orientation: 1 }),
      { width: 3, height: 4 },
      'refiner',
    );
    expect(shape).toMatchObject({ x: 2, y: 2, width: 4, height: 3 });
  });
});

describe('[REF-13.3][REF-10.3][PIC-12.1] authoritative placement preview', () => {
  it('[REF-13.3][REF-10.3][PIC-12.1] no result is unknown', () => {
    expect(ghostValidity(null)).toBe('unknown');
  });

  it('[REF-13.3][REF-10.3][PIC-12.1] a valid result is valid', () => {
    const result: PlacementResultDto = { valid: true, revision: 1, reasons: [] };
    expect(ghostValidity(result)).toBe('valid');
  });

  it('[REF-13.3][REF-10.3][PIC-12.1] an invalid result keeps its reasons', () => {
    const result: PlacementResultDto = {
      valid: false,
      revision: 1,
      reasons: [{ code: 'not_buildable', arguments: {} }],
    };
    expect(ghostValidity(result)).toBe('invalid');
    expect(reasonLabels(result.reasons, i18n)).toEqual(['not_buildable']);
  });

  it('[REF-13.3][REF-10.3][PIC-12.1] the placement query describes the ghost', () => {
    expect(placementQueryPayload(cursor({ position: [2, 3], orientation: 1 }), 100)).toEqual({
      kind: 'placement_query',
      definition_id: 'test.entity.a',
      location_id: 100,
      logical_transform: { position: [2, 3], orientation: 1 },
    });
  });

  it('[REF-13.3][REF-10.3][PIC-12.1] no definition has no query', () => {
    expect(placementQueryPayload(cursor({ definitionId: null }), 100)).toBeNull();
  });
});

describe('[REF-13.1][REF-13.2][REF-13.3] placementKeyAction', () => {
  const bounds = { width: 4, height: 4 };

  it('[REF-13.1][REF-13.2][REF-13.3] an arrow key moves the ghost', () => {
    const action = placementKeyAction(cursor({ position: [0, 0] }), 'ArrowRight', bounds);
    expect(action.kind).toBe('move');
    expect(action.cursor.position).toEqual([1, 0]);
  });

  it('[REF-13.1][REF-13.2][REF-13.3] movement is clamped at the grid edge', () => {
    const action = placementKeyAction(cursor({ position: [3, 0] }), 'ArrowRight', bounds);
    expect(action.cursor.position).toEqual([3, 0]);
  });

  it('[REF-13.1][REF-13.2][REF-13.3] rotate advances the orientation', () => {
    const action = placementKeyAction(cursor({ orientation: 0 }), 'R', bounds);
    expect(action.kind).toBe('rotate');
    expect(action.cursor.orientation).toBe(1);
  });

  it('[REF-13.1][REF-13.2][REF-13.3] rotate wraps at four', () => {
    expect(placementKeyAction(cursor({ orientation: 3 }), 'R', bounds).cursor.orientation).toBe(0);
  });

  it('[REF-13.1][REF-13.2][REF-13.3] Enter confirms the placement', () => {
    expect(placementKeyAction(cursor(), 'Enter', bounds).kind).toBe('confirm');
  });

  it('[REF-13.1][REF-13.2][REF-13.3] Escape cancels the placement', () => {
    expect(placementKeyAction(cursor(), 'Escape', bounds).kind).toBe('cancel');
  });

  it('[REF-13.1][REF-13.2][REF-13.3] an unhandled key does nothing', () => {
    expect(placementKeyAction(cursor(), 'q', bounds).kind).toBe('none');
  });

  it('[REF-13.1][REF-13.2][REF-13.3] moving clears the stale result', () => {
    const result: PlacementResultDto = { valid: true, revision: 1, reasons: [] };
    const action = placementKeyAction(cursor({ result }), 'ArrowDown', bounds);
    expect(action.cursor.result).toBeNull();
  });
});

describe('[REF-13.3][PIC-12] placeEntityPlanPayload', () => {
  it('[REF-13.3][PIC-12] the plan payload describes the ghost', () => {
    expect(placeEntityPlanPayload(cursor({ position: [2, 3], orientation: 1 }), 100)).toEqual({
      definition_id: 'test.entity.a',
      location_id: 100,
      logical_transform: { position: [2, 3], orientation: 1 },
    });
  });

  it('[REF-13.3][PIC-12] no definition has no payload', () => {
    expect(placeEntityPlanPayload(cursor({ definitionId: null }), 100)).toBeNull();
  });
});

describe('[REF-12.2][REF-12.3][REF-13.3] constructionCommands', () => {
  it('[REF-12.2][REF-12.3][REF-13.3] a planned entity can be committed or cancelled', () => {
    expect(constructionCommands('planned')).toEqual(['CancelEntityPlan', 'CommitConstruction']);
  });

  it('[REF-12.2][REF-12.3][REF-13.3] a constructing entity can be committed or cancelled', () => {
    expect(constructionCommands('constructing')).toEqual([
      'CancelEntityPlan',
      'CommitConstruction',
    ]);
  });

  it('[REF-12.2][REF-12.3][REF-13.3] an active entity can be deconstructed', () => {
    expect(constructionCommands('active')).toEqual(['DeconstructEntity']);
  });

  it('[REF-12.2][REF-12.3][REF-13.3] an unknown lifecycle offers no command', () => {
    expect(constructionCommands('dormant')).toEqual([]);
  });
});

describe('[REF-13.4][PIC-13] commandNotice', () => {
  const localized = createI18n({ 'command.rejected': 'rejected' });

  it('[REF-13.4][PIC-13] a rejected command produces a notice', () => {
    const notice = commandNotice(
      {
        command_id: 'c1',
        status: 'rejected',
        current_revision: 2,
        errors: [{ code: 'state_revision_mismatch', arguments: {} }],
      },
      localized,
    );
    expect(notice).toContain('state_revision_mismatch');
  });

  it('[REF-13.4][PIC-13] an accepted command produces no notice', () => {
    expect(
      commandNotice({ command_id: 'c1', status: 'accepted', scheduled_tick: 5 }, localized),
    ).toBeNull();
  });
});
