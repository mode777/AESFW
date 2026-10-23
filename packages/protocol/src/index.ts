/**
 * Public entry point of `@aesfw/protocol`, the presentation contract types
 * (TDS-22, doc 04 in TypeScript). The package has zero runtime dependencies
 * (TDS-4.2, TDS-4.3 rule 3).
 */
export const PROTOCOL_PACKAGE_ID = '@aesfw/protocol' as const;

export { PROTOCOL_VERSION } from './version.js';
export type { ProtocolVersion } from './version.js';

export { PROTOCOL_ERROR_CODES } from './errors.js';
export type { ProtocolError, ProtocolErrorArguments, ProtocolErrorCode } from './errors.js';

export { ok, err } from './result.js';
export type { DecodeResult } from './result.js';

export type { JsonObject, JsonValue, WireId, WireInt } from './scalars.js';

export type {
  CommandAcceptedDto,
  CommandEnvelopeDto,
  CommandErrorDto,
  CommandRejectedDto,
  CommandResultDto,
} from './commands.js';

export type {
  PlacementQueryDto,
  PlacementReasonDto,
  PlacementResultDto,
  PlacementTransformDto,
} from './placement.js';

export type {
  ConnectivityDto,
  EntityDto,
  EntityUpdateDto,
  FootprintDto,
  InventoryDto,
  InventoryEntryDto,
  InventoryUpdateDto,
  LocationDto,
  LocationGridDto,
  LocationPropertiesDto,
  OwnerBalanceDto,
  OwnerDto,
  ProductionDto,
  SnapshotDeltaDto,
  SnapshotDto,
  SpatialDto,
  ThroughputDto,
} from './snapshot.js';

export type { EventDto } from './events.js';
export type { DefinitionMetadataDto } from './metadata.js';
export type {
  EntityDetailDto,
  LocationSummaryDto,
  MaintenanceDto,
  NeedBreakdownDto,
  PlanningChainDto,
  PlanningChainStageDto,
  PlanningDto,
  PlanningScopeDto,
  PlanningTierDto,
  ResidenceDto,
} from './readmodels.js';
export type {
  WorkerCommandRequestDto,
  WorkerCommandResultResponseDto,
  WorkerControlAction,
  WorkerControlRequestDto,
  WorkerDeltaResponseDto,
  WorkerErrorResponseDto,
  WorkerInitRequestDto,
  WorkerLoadedResponseDto,
  WorkerLoadRequestDto,
  WorkerQueryRequestDto,
  WorkerQueryResultResponseDto,
  WorkerReadyResponseDto,
  WorkerRequestDto,
  WorkerResponseDto,
  WorkerSavedResponseDto,
  WorkerSaveRequestDto,
  WorkerSnapshotResponseDto,
  WorkerSubscribeRequestDto,
  ContentFileDto,
  ContentSourceDto,
} from './worker.js';

export { decodeCommandEnvelope, decodeCommandResult } from './codecs/commands.js';
export { applyDelta, canApplyDelta } from './delta.js';
export { decodeSnapshot, decodeSnapshotDelta } from './codecs/snapshot.js';
export { decodeEvent } from './codecs/events.js';
export { decodeDefinitionMetadata } from './codecs/metadata.js';
export {
  decodeEntityDetail,
  decodeLocationSummary,
  decodeNeedBreakdown,
  decodePlanning,
} from './codecs/readmodels.js';
export { decodeWorkerRequest, decodeWorkerResponse } from './codecs/worker.js';
