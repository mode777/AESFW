/**
 * The empty policy set (TDS-13). Policy implementations are added by the
 * policy roadmap rows; until then the pipeline runs with no policies.
 *
 * Source: TDS-13
 */
import type { PolicySet } from './types.js';

/** The policy set used until policy implementations exist. */
export const EMPTY_POLICY_SET: PolicySet = {};
