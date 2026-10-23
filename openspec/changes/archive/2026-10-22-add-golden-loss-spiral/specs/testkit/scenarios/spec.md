# Spec Delta

## Purpose

SCN-04: the deficit loss spiral and recovery as a reproducible golden scenario (GDD-3.7, GDD-20.3, VER-9.3).

## ADDED Requirements

### Requirement: Loss spiral scenario
The `loss_spiral` scenario SHALL run a deficit-prone chain for 600 ticks with invariants enabled and produce no invariant findings. During the run the owner's balance SHALL enter deficit, the deficit policy SHALL pause the chain's producer (`DeficitPaused`), and automatic resume SHALL later restore it (`DeficitResumed`), demonstrating a recoverable spiral rather than defeat. The scenario SHALL carry golden hashes matching every checkpoint.

Source: VER-9.3 (SCN-04), GDD-3.7, GDD-20.3

#### Scenario: The spiral pauses and recovers without findings
- **WHEN** the loss-spiral scenario runs for 600 ticks
- **THEN** the report has no findings, at least one `DeficitPaused` and one `DeficitResumed` event, and every checkpoint hash matches the golden

#### Scenario: The golden reproduces the run
- **WHEN** the scenario runs twice from the same seed
- **THEN** both runs produce identical checkpoint sequences
