/**
 * Placement query and result DTOs (PIC-12.1). A client requests authoritative
 * validation with `PlacementQueryDto` and receives a `PlacementResultDto`
 * carrying `valid`, the session revision, and the ordered rejection reasons.
 *
 * Source: PIC-12.1
 */
import type { JsonObject, WireId, WireInt } from './scalars.js';

/** A logical transform on the wire (PIC-12.1). */
export interface PlacementTransformDto {
  readonly position: readonly [WireInt, WireInt];
  readonly orientation: WireInt;
}

/** A read-only placement request (PIC-12.1). */
export interface PlacementQueryDto {
  readonly definition_id: WireId;
  readonly location_id: WireInt;
  readonly logical_transform: PlacementTransformDto;
}

/** One machine-readable placement rejection reason (PIC-12.1, PIC-13). */
export interface PlacementReasonDto {
  readonly code: string;
  readonly arguments: JsonObject;
}

/** The authoritative placement result (PIC-12.1). */
export interface PlacementResultDto {
  readonly valid: boolean;
  readonly revision: WireInt;
  readonly reasons: readonly PlacementReasonDto[];
}
