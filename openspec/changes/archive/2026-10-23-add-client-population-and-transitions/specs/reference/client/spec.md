# Spec Delta

## Purpose

The reference client makes progression legible and playable: the tier pyramid, the transition checklist with sustained progress, the transition command, purpose-lock toggles, and the coverage overlay.

## ADDED Requirements

### Requirement: Tier pyramid and transition checklist
The client SHALL render the tier pyramid per location from location summaries, and the selected residence's transition eligibility as a per-condition checklist including sustained-timer progress, issuing `RequestPopulationTransition` from an eligible entry.

Source: REF-12.3, REF-12.4, PIC-10.1, PIC-10.2

#### Scenario: The checklist shows sustained progress
- **WHEN** a residence's transition entry reports a sustained condition with `progress: 2` of `ticks: 3`
- **THEN** the residence section shows the condition, its progress, and a disabled Advance button while ineligible

#### Scenario: An eligible transition can be requested
- **WHEN** the entry is eligible
- **THEN** the Advance button is enabled and issues `RequestPopulationTransition` for the residence and transition

### Requirement: Purpose-lock toggles
The progression drawer SHALL list the selected location's inventory resources with Lock and Unlock controls issuing `SetResourcePurposeLock` for the `population_transition` purpose.

Source: REF-12.4, GDD-8.5

#### Scenario: A resource can be locked
- **WHEN** the player presses Lock on a resource
- **THEN** the client sends `SetResourcePurposeLock` with `locked: true` for that inventory, resource, and purpose

### Requirement: Coverage overlay
The client SHALL offer a coverage grid overlay (`O`) that draws each coverage provider's radius derived from definition metadata.

Source: REF-12.2, PIC-4

#### Scenario: Coverage circles appear for providers
- **WHEN** the coverage overlay is active and a coverage provider is placed
- **THEN** a circle of the provider's configured radius is drawn at its position
