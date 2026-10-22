/**
 * Codec for definition metadata (PIC-4).
 *
 * Source: PIC-4, TDS-22
 */
import type { ProtocolError } from '../errors.js';
import type { DefinitionMetadataDto } from '../metadata.js';
import { err, ok, type DecodeResult } from '../result.js';
import type { JsonObject } from '../scalars.js';
import { invalidField, isJsonObject, isObject, isString, isStringArray } from './guards.js';

/** Decodes definition metadata (PIC-4). */
export function decodeDefinitionMetadata(value: unknown): DecodeResult<DefinitionMetadataDto> {
  if (!isObject(value)) return err([invalidField('')]);
  const errors: ProtocolError[] = [];

  const definitionId = value['definition_id'];
  if (!isString(definitionId)) errors.push(invalidField('definition_id'));
  const definitionType = value['definition_type'];
  if (!isString(definitionType)) errors.push(invalidField('definition_type'));
  const tags = value['tags'];
  if (!isStringArray(tags)) errors.push(invalidField('tags'));
  const parameters = value['parameters'];
  if (!isJsonObject(parameters)) errors.push(invalidField('parameters'));

  const presentationKey = value['presentation_key'];
  if (presentationKey !== undefined && !isString(presentationKey)) {
    errors.push(invalidField('presentation_key'));
  }
  const commands = value['commands'];
  if (commands !== undefined && !isStringArray(commands)) {
    errors.push(invalidField('commands'));
  }

  if (errors.length > 0) return err(errors);

  const base = {
    definition_id: definitionId as string,
    definition_type: definitionType as string,
    tags: tags as readonly string[],
    parameters: parameters as JsonObject,
  };
  return ok({
    ...base,
    ...(presentationKey === undefined ? {} : { presentation_key: presentationKey as string }),
    ...(commands === undefined ? {} : { commands: commands as readonly string[] }),
  });
}
