# Spec Delta

## ADDED Requirements

### Requirement: SCN-10 throughput-throttling golden
The scenario suite SHALL include SCN-10, a theme-free throughput-throttling scenario whose content declares a throughput-limited location, whose combined requests exceed the location capacity, and whose committed golden pins every hash checkpoint with invariants enabled.

Source: VER-9.3, SCN-10, GDD-15.1

#### Scenario: The throughput scenario has no invariant findings
- **WHEN** the SCN-10 scenario runs for its configured ticks with invariants enabled
- **THEN** the run reports no findings

#### Scenario: Over-densification emits throttling events
- **WHEN** the scenario's combined per-tick requests exceed the location's throughput capacity
- **THEN** the run emits at least one `ThroughputThrottled` event

#### Scenario: The scenario matches its golden and replays identically
- **WHEN** the scenario runs twice and its checkpoints are compared with the committed golden
- **THEN** every checkpoint equals the golden and both runs produce identical output
