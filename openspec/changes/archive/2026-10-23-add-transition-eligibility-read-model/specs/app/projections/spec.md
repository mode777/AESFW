# Spec Delta

## Purpose

The residence read model explains tier-transition eligibility, including sustained-condition progress, so clients can show a per-condition checklist instead of an opaque boolean.

## ADDED Requirements

### Requirement: Transition eligibility read model
The entity detail read model SHALL report, for every transition whose source tier matches the residence, an eligibility entry with the transition ID, an `eligible` flag, the band's `advancement_enabled` flag, and a condition checklist. Each `sustained` node SHALL report its required ticks, current progress, and whether it is met; the transition's overall condition SHALL be reported as one further entry.

Source: PIC-10.1, GDD-13.1, TDS-14.3

#### Scenario: Sustained progress below the threshold is ineligible
- **WHEN** a residence's transition condition requires `3` sustained ticks and its timer stores `2`
- **THEN** the eligibility entry is not eligible and its sustained condition reports `ticks: 3`, `progress: 2`, `met: false`

#### Scenario: Sustained progress at the threshold is eligible
- **WHEN** the timer stores `3` consecutive ticks
- **THEN** the eligibility entry is eligible and the sustained condition is met

### Requirement: Advancement enablement gate
A transition that is not one of the tier's `decline_transitions` SHALL be ineligible while the residence's band reports `advancement_enabled: false`; a decline transition SHALL remain eligible.

Source: PIC-10.1, GDD-12.6

#### Scenario: A disabled advancement gate blocks advancement only
- **WHEN** the band has `advancement_enabled: false` and the residence has one advancement and one decline transition
- **THEN** the advancement entry is ineligible and the decline entry stays eligible
