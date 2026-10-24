# Spec Delta

## ADDED Requirements

### Requirement: Exploration scenario fixture and golden
A theme-free content fixture SHALL cover a home location with a package-producing source, a frontier location governed by an establishment definition, and two transport units; a scenario SHALL load the establishment cost at home with a route order, discover the frontier with an explore order, and establish the frontier with an establish order, running 40 ticks with invariants and a committed golden whose checkpoints match on every run. The run SHALL emit `LocationDiscovered` and `LocationEstablished` and report no invariant findings.

Source: VER-9.3, SCN-05, GDD-16

#### Scenario: The exploration golden matches
- **WHEN** `aesfw run` executes the exploration scenario and the committed hashes are compared
- **THEN** every checkpoint matches, the findings list is empty, and the event stream contains `LocationDiscovered` and `LocationEstablished`

#### Scenario: A repeat run is byte-identical
- **WHEN** the scenario runs twice
- **THEN** both runs produce byte-identical output

#### Scenario: Establishment pays from transported cargo
- **WHEN** the establish order arrives at the frontier
- **THEN** the unit's cargo is emptied by the establishment cost and the location ends owned, active, and established
