# Proposal

## Why

Roadmap 08, M10 item 10.2 (`add-economic-diagnostics`), size M. The graph stage (10.1) rejects content that cannot function; CONT-11.6 additionally asks for *economic* diagnostics — packages that load but are guaranteed to deficit, starve, throttle, or lock themselves. These are balance opinions, so they are warnings by default (configurable to errors), and they are the tool that keeps M11's reference prototype honest before it is played. The row retires the economic half of R-14 (specification gaps found late).

Dependencies on archived changes: 10.1 `add-graph-validation` (archived 2026-10-25). Archived.

## What Changes

- A new `economic.ts` check in the validation stage (CONT-12 step 9, "graph and economic validation") over composed definitions, emitting **warning**-severity diagnostics by default.
- A `LoadOptions.economic_diagnostics: 'warning' | 'error'` knob (default `'warning'`) implementing CONT-11.6's "warnings or configurable errors"; loader failures occur only when a caller promotes it.
- The seven CONT-11.6 checks as static analyses:
  - `capability_deficit`: a recipe requires a capability no provider (population output, resource source) produces anywhere.
  - `negative_maintenance_balance`: an owner-scoped balance is charged by maintenance but has no owner-scoped income anywhere.
  - `inadequate_production`: a need's per-inhabitant demand rate exceeds the resource's maximum static production rate.
  - `throughput_below_equilibrium`: a world that must import a resource has carrier round-trip capacity below the consumer's demand rate.
  - `storage_below_batch`: a producer's referenced inventory capacity is below one batch of its recipe's inputs or outputs.
  - `transition_self_lock`: a transition's cost resource is only produced by content of its own target tier.
  - `exchange_arbitrage_risk`: a recipe's inputs are all exchange-buyable and its output sells for more than the input purchase value at base prices.
- The diagnostic catalogue grows by the seven codes; one invalid fixture per code under `fixtures/content/invalid/`; a no-false-positive test asserts shipped fixture packages produce zero economic findings.

## Capabilities

### Modified Capabilities

- `content/validation`: the economic-diagnostic requirements extend the validation stage created by 10.1.

## Impact

- **Packages:** `@aesfw/content` (new `validation/economic.ts`, catalogue entries, `LoadOptions` field, `loadContent` wiring); fixtures only otherwise. No client, host, or protocol change.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none new.
- **Diagnostic codes (new, warning severity unless promoted):** `capability_deficit`, `negative_maintenance_balance`, `inadequate_production`, `throughput_below_equilibrium`, `storage_below_batch`, `transition_self_lock`, `exchange_arbitrage_risk`.
- **HASH-CHANGING:** no golden changes (warnings do not fail loads; shipped fixtures verified warning-free).
- **Traceability:** CONT-11.6 moves from untraced to traced.

## Out of Scope

- 10.3 `add-design-intent-diagnostics`: design-intent warnings and strict promotion (CONT-11.7).
- 10.6 `add-validation-report-cli`: CLI flags to promote warnings and report formatting.
- Runtime (per-tick) economy analysis; these are load-time static checks.
