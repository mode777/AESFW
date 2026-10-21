# Spec Delta

## REMOVED Requirements

### Requirement: Later-row seams are registered no-ops or typed not-supported results
**Reason**: `TransactionWriter.atomic` is implemented by `add-inventory-transactions` (1.7), so it is no longer a typed not-supported seam. The policy seam remains and is covered by the added requirement below.
**Migration**: Systems now call the real transaction writer through `TickContext.tx`; the empty `PolicySet` seam is covered by "Policy set is empty before the policy rows".

## ADDED Requirements

### Requirement: Policy set is empty before the policy rows
Behavior owned by later roadmap rows SHALL be a registered no-op or a typed not-supported result: `PolicySet` SHALL be empty until the policy rows (1.8+).

Source: TDS-13

#### Scenario: The policy set is empty before the policy rows
- **WHEN** a system runs during `step`
- **THEN** `ctx.policies` is an empty policy set

### Requirement: The pipeline supplies the transaction writer and journal
`step` and `runPhases` SHALL construct a `TickContext.tx` transaction writer bound to the world and, when `TickInput.options.journal` is true, to the tick journal, so transactions applied by a system are appended to `TickOutput.journal` in application order and are `null` when journaling is off. Turning journaling on or off SHALL NOT change authoritative state.

Source: TDS-12.4, TDS-10.1

#### Scenario: A system's transactions reach the output journal
- **WHEN** a system reserves and commits a quantity during a tick with `journal: true`
- **THEN** `TickOutput.journal` holds the applied transactions in order

#### Scenario: Journaling off yields a null journal
- **WHEN** the same tick runs with `journal: false`
- **THEN** `TickOutput.journal` is `null` and the final state hash matches the journaled run
