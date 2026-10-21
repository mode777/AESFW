# Spec Delta

## Purpose

The SCN-01 basic-loop scenario: the `demo-basic-loop` fixture content of CONT-14, the content-to-world entity instantiation the scenario runner uses, the scenario and its golden hashes, and the `golden:update` tool (VER-9.3, GDD-23.1).

## ADDED Requirements

### Requirement: Basic-loop fixture content
`fixtures/content/demo-basic-loop` SHALL be a valid, theme-free content package with a `demo.` namespace: an infinite-rate source of `demo.resource.source`, a batch recipe turning it into `demo.resource.need` and requiring `demo.capability.tier_1`, a population tier that outputs `demo.capability.tier_1` and needs `demo.resource.need`, and a growth policy. `loadContent` SHALL accept it with no error diagnostics.

Source: CONT-14, GDD-23.1

#### Scenario: The fixture content validates
- **WHEN** the fixture package is loaded
- **THEN** it has no error-severity diagnostics

### Requirement: Content entity instantiation
The scenario runner SHALL instantiate the content's entity definitions at the default location after the default world plan: a resource source becomes a `resourceSource` at the location's shared inventory, a producer becomes a `producer` with its resolved recipes and a matching `capabilityConsumer`, and a residence becomes a `residence`, `populationGroup`, and `growth` with its resolved tier outputs, needs, categories, and growth policy. This keeps the core content-free (TDS-4.3).

Source: CONT-6.6, CONT-6.8, GDD-9.4, GDD-9.5, GDD-11, GDD-12

#### Scenario: The loop entities are created
- **WHEN** the fixture content is instantiated
- **THEN** the world holds a source, a producer, and a residence at the default location

#### Scenario: The producer consumes a capability
- **WHEN** the producer's recipe requires `demo.capability.tier_1`
- **THEN** the producer entity carries a `capabilityConsumer` for it

### Requirement: Basic-loop scenario and goldens
`fixtures/scenarios/basic_loop.yaml` SHALL define SCN-01 against the fixture content, running 600 ticks with invariants and a golden hash file. Running it SHALL produce no invariant findings and hash checkpoints matching `fixtures/scenarios/basic_loop.hashes.json`; the population SHALL grow and the need SHALL be fulfilled.

Source: VER-9.3, GDD-23.1

#### Scenario: SCN-01 runs without invariant violations
- **WHEN** the basic-loop scenario runs
- **THEN** the report has no findings

#### Scenario: SCN-01 matches its golden hashes
- **WHEN** the scenario runs and its checkpoints are compared with the golden file
- **THEN** every checkpoint matches

#### Scenario: The loop is closed
- **WHEN** the scenario runs to completion
- **THEN** the producer has produced the need resource, needs are fulfilled, and the population has grown

### Requirement: Golden update tool
`pnpm golden:update <scenario>` SHALL regenerate the scenario's golden hash file from a fresh run and record the `fnv1a64-canonical-json-v1` algorithm tag. It SHALL NOT be invoked by CI.

Source: VER-9.4

#### Scenario: The tool writes the golden file
- **WHEN** `pnpm golden:update fixtures/scenarios/basic_loop.yaml` is run
- **THEN** `fixtures/scenarios/basic_loop.hashes.json` is rewritten with the algorithm tag and checkpoints
