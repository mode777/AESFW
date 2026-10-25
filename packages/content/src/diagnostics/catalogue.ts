/**
 * The diagnostic-code catalogue (06 §10.2). Every code the content pipeline
 * emits is listed with its default severity, owning stage, and a one-line
 * description. The fixture cross-check test pairs every graph-stage code with
 * an invalid fixture under `fixtures/content/invalid/<code>/`; codes of stages
 * without fixtures yet join as rows 10.2–10.5 land them.
 *
 * Source: CONT-11, VER-10.2
 */
export interface DiagnosticCodeInfo {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly stage:
    | 'manifest'
    | 'parse'
    | 'schema'
    | 'composition'
    | 'reference'
    | 'condition'
    | 'graph'
    | 'economic'
    | 'design_intent'
    | 'determinism'
    | 'world';
  readonly description: string;
}

const entry = (
  stage: DiagnosticCodeInfo['stage'],
  code: string,
  description: string,
): DiagnosticCodeInfo => ({ code, severity: 'error', stage, description });

const determinism = (code: string, description: string): DiagnosticCodeInfo => ({
  code,
  severity: 'error',
  stage: 'determinism',
  description,
});

/**
 * The catalogue in ascending code order. A code may only be removed by an
 * amendment; new validation rows append their codes here.
 *
 * Source: CONT-11, VER-10.2
 */
export const DIAGNOSTIC_CODES: readonly DiagnosticCodeInfo[] = [
  entry(
    'design_intent',
    'breadth_depth_collapse',
    'A weighted category has one member or equal weights.',
  ),
  entry('economic', 'capability_deficit', 'A recipe requires a capability no provider produces.'),
  entry(
    'graph',
    'composition_schema_violation',
    'A composed definition lost a schema-required field.',
  ),
  entry(
    'condition',
    'condition_ticks_invalid',
    'A sustained-condition tick bound is out of range.',
  ),
  entry('condition', 'condition_type_error', 'A condition expression does not type-check.'),
  entry('design_intent', 'coverage_absent', 'No need is satisfied by spatial coverage.'),
  entry(
    'design_intent',
    'cross_region_absent',
    'The highest tier needs no inter-region transport.',
  ),
  entry(
    'condition',
    'curve_extrapolation_error',
    'A curve sample is evaluated outside its domain without extrapolation.',
  ),
  entry(
    'design_intent',
    'decline_symmetric',
    'A decline refunds its advancement costs or retains population.',
  ),
  entry(
    'manifest',
    'dependency_version_mismatch',
    'A dependency version does not satisfy its range.',
  ),
  entry(
    'reference',
    'distribution_not_disjoint',
    'Distribution-rule regions share a property or slot type.',
  ),
  entry('reference', 'duplicate_deficit_policy', 'Two deficit policies target the same resource.'),
  entry('manifest', 'duplicate_package_id', 'Two packages declare the same ID.'),
  entry(
    'reference',
    'duplicate_world_connection',
    'A world declares two connections with the same ID.',
  ),
  entry(
    'reference',
    'duplicate_world_location',
    'A world declares two locations with the same ID.',
  ),
  entry(
    'graph',
    'establishment_cost_invalid',
    'An establishment cost is not transportable or not sourced.',
  ),
  entry(
    'economic',
    'exchange_arbitrage_risk',
    'A recipe sells above its exchange-purchased input cost.',
  ),
  entry('graph', 'exchange_unreachable', 'An exchange location is unreachable in its world.'),
  determinism('executable_script', 'A condition expression embeds executable code.'),
  entry('design_intent', 'idle_cost_absent', 'No maintenance charges while idle.'),
  entry('design_intent', 'inactive_scarcities', 'One or more of the seven scarcities is inactive.'),
  entry(
    'economic',
    'inadequate_production',
    'A need demands more per tick than production can supply.',
  ),
  entry('composition', 'include_cycle', 'An include graph contains a cycle.'),
  entry(
    'graph',
    'incompatible_components',
    'Entity components declare an incompatible combination.',
  ),
  entry('condition', 'invalid_condition_shape', 'A condition expression has an invalid shape.'),
  entry('condition', 'invalid_curve', 'A curve definition is invalid.'),
  entry('parse', 'invalid_definition_document', 'A content file is not a definition document.'),
  entry('reference', 'invalid_distribution_rule', 'A distribution rule is structurally invalid.'),
  entry('reference', 'invalid_exchange', 'An exchange definition violates a cross-field rule.'),
  entry('schema', 'invalid_id', 'A definition ID violates the identifier rules.'),
  entry('composition', 'invalid_merge_directive', 'A merge operation is not valid for its target.'),
  entry(
    'graph',
    'invalid_output_storage',
    'A recipe or source outputs a recomputed-storage resource.',
  ),
  entry('reference', 'invalid_reference_scope', 'A reference resolves but its scope is illegal.'),
  entry(
    'reference',
    'invalid_satisfaction_bands',
    'Satisfaction bands overlap, are unsorted, or miss zero.',
  ),
  entry('reference', 'invalid_unlock_target', 'An unlock target names an unknown kind.'),
  entry(
    'reference',
    'maintenance_while_processing_requires_producer',
    'A while_processing maintenance charge requires a producer component.',
  ),
  entry('manifest', 'manifest_invalid', 'A manifest violates the manifest schema.'),
  entry('manifest', 'missing_dependency', 'A manifest dependency is not present.'),
  entry('parse', 'missing_file', 'A manifest-listed file is absent.'),
  entry('manifest', 'missing_manifest', 'A package has no manifest.'),
  determinism('module_redefines_core', 'An optional module redefines core definitions.'),
  entry('economic', 'negative_maintenance_balance', 'A charged balance has no income source.'),
  entry('graph', 'no_initial_content', 'Every entity definition is gated behind an unlock.'),
  determinism('platform_numeric', 'A definition number is not a safe integer.'),
  entry(
    'design_intent',
    'pyramid_bypass',
    'Capabilities substitute or no producer binds a capability.',
  ),
  entry(
    'design_intent',
    'ratio_illegible',
    'A production stage needs more entities than the threshold.',
  ),
  entry('graph', 'recipe_cycle_unseeded', 'A recipe cycle has no seeded member resource.'),
  entry(
    'reference',
    'resource_allow_negative_scope',
    'allow_negative is set on a non-owner-scoped resource.',
  ),
  entry('graph', 'resource_unreachable', 'A consumed resource cannot reach its consumer location.'),
  entry('schema', 'schema_invalid', 'A definition violates its collection schema.'),
  entry('design_intent', 'self_sufficient_region', 'A region produces every demanded resource.'),
  entry('economic', 'storage_below_batch', 'A producer inventory holds less than one batch.'),
  entry(
    'economic',
    'throughput_below_equilibrium',
    'Carrier round-trip capacity is below import demand.',
  ),
  entry(
    'economic',
    'transition_self_lock',
    'A transition cost is produced only by its own target tier.',
  ),
  entry(
    'graph',
    'transition_unreachable',
    'A transition source tier is unreachable from a root tier.',
  ),
  entry(
    'graph',
    'transport_tag_mismatch',
    'No transport unit can traverse the tags of a required path.',
  ),
  entry(
    'design_intent',
    'unbounded_trade',
    'An exchange good can absorb volume without price change.',
  ),
  entry('schema', 'unknown_definition_type', 'A document key is not a definition collection.'),
  entry('world', 'unknown_location_template', 'A location references an unknown template.'),
  entry('condition', 'unknown_operator', 'A condition uses an unknown operator.'),
  entry('condition', 'unknown_query', 'A condition uses an unknown domain query.'),
  entry('world', 'unknown_world', 'A plan names an unknown world definition.'),
  entry('world', 'unknown_world_connection', 'A plan names an unknown world connection.'),
  entry('world', 'unknown_world_location', 'A plan names an unknown world location.'),
  entry('graph', 'unlock_cycle', 'Unlocks form a dependency cycle.'),
  entry('composition', 'unresolved_include', 'An include names an absent definition.'),
  entry('reference', 'unresolved_reference', 'A reference names an absent definition.'),
  determinism('unseeded_random', 'A condition expression uses unseeded randomness.'),
  entry('graph', 'unsourceable_resource', 'A consumed resource has no provider.'),
  entry(
    'reference',
    'unsupported_shortage_policy',
    'A maintenance shortage policy is not supported by the pipeline.',
  ),
  entry('world', 'unsupported_spatial_parameter', 'A spatial parameter is unknown for the policy.'),
  determinism('wall_clock_expression', 'A condition expression reads the wall clock.'),
  entry('parse', 'yaml_duplicate_key', 'A YAML document contains a duplicate key.'),
  entry('parse', 'yaml_merge_key', 'A YAML merge key appears where strict parsing forbids it.'),
  entry('parse', 'yaml_parse_error', 'A YAML document does not parse.'),
]; /** True when the code is in the catalogue. */
export const isKnownDiagnosticCode = (code: string): boolean =>
  DIAGNOSTIC_CODES.some((candidate) => candidate.code === code);

/** The catalogue entries of the graph and economic validation stages (CONT-11.4–11.6). */
export const GRAPH_VALIDATION_CODES: readonly string[] = DIAGNOSTIC_CODES.filter(
  (candidate) =>
    candidate.stage === 'graph' ||
    candidate.stage === 'economic' ||
    candidate.stage === 'design_intent' ||
    candidate.stage === 'determinism',
).map((candidate) => candidate.code);
