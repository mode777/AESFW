/**
 * Diagnostic message templates (CONT-15): every catalogue code has a plain
 * English template interpolated with the diagnostic's args. Pure data — no
 * `Intl`, no locale state; a host-side translation layer may replace it.
 *
 * Source: CONT-15
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { DIAGNOSTIC_CODES } from './catalogue.js';

/** Message templates keyed by diagnostic code; `{name}` slots interpolate args, `{definition}` the definition or package. */
export const DIAGNOSTIC_MESSAGES: Readonly<Record<string, string>> = {
  composition_schema_violation:
    '{definition} lost a schema-required field after composition: {message}',
  condition_ticks_invalid: 'sustained condition ticks must be a positive integer, got {ticks}',
  condition_type_error:
    'condition expression type mismatch at {path}: expected {expected}, got {actual}',
  curve_extrapolation_error: 'curve sample lies outside the curve domain',
  dependency_version_mismatch: 'dependency {dependency} version does not satisfy {range}',
  distribution_not_disjoint: '{property} is supplied by more than one rule region: {regions}',
  duplicate_deficit_policy: 'resources {resource} already has a deficit policy ({other})',
  duplicate_package_id: 'package {package} is declared more than once',
  duplicate_world_connection: 'world connection {connection} is declared more than once',
  duplicate_world_location: 'world location {location} is declared more than once',
  establishment_cost_invalid: 'establishment cost {resource} is invalid: {reason}',
  exchange_unreachable: 'exchange at {location} has no connection in world {world}',
  executable_script: 'condition expression embeds executable code',
  incompatible_components: 'entity components are incompatible: {reason}',
  include_cycle: 'definition includes itself (directly or transitively)',
  inadequate_production:
    'need demands {demand} per inhabitant per tick of {resource} but production supplies at most {supply}',
  invalid_condition_shape: 'condition expression shape is invalid at {path}',
  invalid_curve: 'curve definition is invalid',
  invalid_definition_document: 'file does not contain a definition document',
  invalid_distribution_rule: 'distribution rule needs at least two regions and one disjoint axis',
  invalid_exchange: 'exchange violates a cross-field rule: {reason}',
  invalid_id: 'definition id violates the identifier rules',
  invalid_merge_directive: 'merge operation is not valid for its target',
  invalid_output_storage:
    'recipe output {resource} uses recomputed storage, which is never produced',
  invalid_reference_scope: 'reference {reference} resolves but its scope is illegal here',
  invalid_satisfaction_bands: 'satisfaction bands are invalid: {reason}',
  invalid_unlock_target: 'unlock target kind {type} is unknown',
  maintenance_while_processing_requires_producer:
    'while_processing maintenance requires a producer component',
  manifest_invalid: 'manifest is invalid: {message}',
  missing_dependency: 'dependency {dependency} is not present in the load',
  missing_file: 'manifest-listed file {file} is absent',
  missing_manifest: 'package has no manifest',
  module_redefines_core: 'optional module redefines {definition}: {reason}',
  no_initial_content: '{gated} entity definitions exist and every one is gated behind an unlock',
  platform_numeric: 'value {value} at {path} is not a safe integer',
  presentation_fallback_missing:
    'package declares no global fallback document; generic fallbacks apply',
  presentation_invalid_command: 'control references unknown command {command}',
  presentation_invalid_key: 'key {key} violates the identifier rules',
  presentation_key_missing: 'key {key} has no localization entry; the generic fallback applies',
  presentation_modifies_simulation:
    'presentation package declares simulation collection {collection}',
  presentation_target_missing: 'mapping targets absent simulation definition {target}',
  recipe_cycle_unseeded: 'recipe cycle ({cycle}) has no seeded member resource',
  resource_allow_negative_scope:
    'allow_negative requires owner or global storage scope, got {scope}',
  resource_unreachable:
    'resource {resource} consumed at {location} cannot be transported there: {reason}',
  schema_invalid: 'definition violates its schema at {path}: {message}',
  storage_below_batch:
    'inventory {inventory} holds {capacity} but one batch of {recipe} needs {batch}',
  transport_tag_mismatch:
    'no transport unit can traverse the tagged path to {location} for {resource}',
  throughput_below_equilibrium:
    'carrier capacity {capacity} per tick is below the demand {demand} of {resource} at {location}',
  transition_self_lock:
    'transition cost {resource} is produced only by its own target tier {target_tier}',
  transition_unreachable:
    'transition source tier {source_tier} is unreachable from any inhabited tier',
  unknown_definition_type: 'document key {path} is not a definition collection',
  unknown_location_template: 'location template {template} does not resolve',
  unknown_operator: 'condition operator {operator} is unknown',
  unknown_query: 'domain query {query} is unknown',
  unknown_world: 'world definition {world} does not resolve',
  unknown_world_connection: 'world connection {connection} does not resolve',
  unknown_world_location: 'world location {location} does not resolve',
  unresolved_include: 'include {definition} does not resolve',
  unresolved_reference: 'reference {reference} does not resolve (expected {expected})',
  unsourceable_resource: 'resource {resource} is consumed but has no provider',
  unsupported_shortage_policy: 'shortage policy {policy} is not supported',
  unsupported_spatial_parameter: 'spatial parameter is unknown for the policy',
  unbounded_trade: 'good {resource} can absorb unlimited volume without price change',
  unlock_cycle: 'unlock dependency cycle: {cycle}',
  yaml_duplicate_key: 'yaml document contains a duplicate key',
  yaml_merge_key: 'yaml merge key is not allowed here',
  yaml_parse_error: 'yaml document does not parse',
  capability_deficit: 'recipe requires capability {capability} but no provider produces it',
  exchange_arbitrage_risk:
    'recipe sells for {sell} at base prices but its exchange-bought inputs cost {buy}',
  negative_maintenance_balance:
    'balance {resource} is charged by maintenance but nothing grants it income',
  breadth_depth_collapse: 'weighted category offers no breadth-versus-depth choice: {reason}',
  coverage_absent: 'no need is satisfied by spatial coverage',
  cross_region_absent:
    'tier {tier} is fully servable from region {region}; no inter-region transport is forced',
  decline_symmetric:
    'decline transition refunds its costs or retains population, so decline is not asymmetric',
  idle_cost_absent:
    'no maintenance charges while idle ({maintenance} maintenance definitions checked)',
  inactive_scarcities: 'inactive scarcities: {scarcities}',
  pyramid_bypass: 'pyramid rule is bypassed: {reason}',
  ratio_illegible:
    'stage needs {required} entities per stage (threshold {threshold}); the ratio is hard to read',
  self_sufficient_region: 'region {region} can produce every demanded resource',
  wall_clock_expression: 'condition expression reads the wall clock ({operator})',
  unseeded_random: 'condition expression uses unseeded randomness ({operator})',
};

/**
 * Interpolates the template of `diagnostic.code` with its args, the
 * definition, and the package. Unknown codes fall back to a sentence naming
 * the raw code.
 *
 * Source: CONT-15
 */
export function messageFor(diagnostic: Diagnostic): string {
  const template = DIAGNOSTIC_MESSAGES[diagnostic.code];
  if (template === undefined) return `unknown diagnostic ${diagnostic.code}`;
  const actor = diagnostic.definition ?? diagnostic.package ?? '';
  return template.replace(/\{([a-z_]+)\}/g, (match, name: string) => {
    if (name === 'definition') return actor === '' ? match : actor;
    const value = diagnostic.args[name];
    return value === undefined ? match : String(value);
  });
}

/** Report rendering options. */
export interface ReportOptions {
  readonly format: 'text' | 'json';
}

/**
 * Renders diagnostics as a deterministic report — errors before warnings,
 * then by catalogue order — as text lines with a summary, or as a JSON object
 * with `diagnostics` and `summary`. Rendering never changes the findings.
 *
 * Source: CONT-15, TDS-21.2
 */
export function formatReport(diagnostics: readonly Diagnostic[], options: ReportOptions): string {
  const order = (diagnostic: Diagnostic): number => {
    const index = DIAGNOSTIC_CODES.findIndex((entry) => entry.code === diagnostic.code);
    const severityGroup = diagnostic.severity === 'error' ? 0 : 1;
    return severityGroup * 1000 + (index === -1 ? DIAGNOSTIC_CODES.length : index);
  };
  const ordered = [...diagnostics].sort(
    (left, right) => order(left) - order(right) || det.compareStrings(left.code, right.code),
  );
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warnings = diagnostics.length - errors;
  if (options.format === 'json') {
    return JSON.stringify(
      {
        diagnostics: ordered.map((diagnostic) => ({
          code: diagnostic.code,
          severity: diagnostic.severity,
          message: messageFor(diagnostic),
          definition: diagnostic.definition,
          path: diagnostic.path,
          file: diagnostic.file,
          args: diagnostic.args,
        })),
        summary: { errors, warnings },
      },
      null,
      2,
    );
  }
  const lines = ordered.map((diagnostic) => {
    const actor = diagnostic.definition ?? diagnostic.package ?? '-';
    const file = diagnostic.file === null ? '' : ` (${diagnostic.file})`;
    return `  ${diagnostic.severity}  ${diagnostic.code}  ${actor}  ${messageFor(diagnostic)}${file}`;
  });
  lines.push(`summary: ${errors} error(s), ${warnings} warning(s)`);
  return lines.join('\n');
}
