# Spec Delta

## ADDED Requirements

### Requirement: News rail
The news rail SHALL render a bounded list of the most recent newsworthy domain events (shortages, blocks, declines, unlocks, deficit pauses, establishments, trades) plus pending warnings derived from the current projection (blocked entities, deficit-paused entities, unfulfilled needs below the decline band). Each entry SHALL carry its tick, a localized one-line description, and a subject reference, and clicking an entry SHALL select the subject and move the camera to it. The rail SHALL be view-only state derived from the event stream and projection.

Source: REF-12.6, PIC-11, REF-11

#### Scenario: A newsworthy event appears in the rail
- **WHEN** a `LocationEstablished` event is received
- **THEN** the rail lists it with its tick and a localized line

#### Scenario: Clicking an entry jumps the camera
- **WHEN** an entry whose subject is entity `7` at location `3` is clicked
- **THEN** entity `7` becomes the selection and the camera centres on it

#### Scenario: The rail is bounded
- **WHEN** more newsworthy events arrive than the bound allows
- **THEN** the oldest entries drop off and the newest are listed

#### Scenario: A pending warning derives from the projection
- **WHEN** the projection contains an entity blocked with `missing_input`
- **THEN** the rail lists a pending warning naming that entity until the block clears

### Requirement: Contextual hints
The client SHALL derive short localized hints from block reasons and command rejection codes, keyed by `(reason or code, subject)`, each naming what is wrong (for example "Missing input H1: build a refiner") without computing a mechanic. Hints SHALL surface as toasts from command notices and inside the panel of the affected subject, and SHALL be pure selector output over presentation data.

Source: REF-12.6, REF-13.4, PIC-13

#### Scenario: A block reason yields a hint
- **WHEN** an entity's block reasons include `missing_input` for resource H1
- **THEN** the hint selector returns the localized missing-input hint naming H1

#### Scenario: A rejection code yields a hint
- **WHEN** a `PlaceEntityPlan` is rejected with `not_unlocked`
- **THEN** the toast shows the localized not-unlocked hint for that definition

#### Scenario: Hints never compute mechanics
- **WHEN** any hint is rendered
- **THEN** its text comes from localization and names subjects and reasons only — no derived quantities beyond display formatting

### Requirement: Client milestone tracker
The client SHALL carry a list of milestones defined as client data, each a predicate over projected facts only: a definition's `locked` flag cleared, population per tier in a location summary reaching a value, the number of established locations, the number of transport orders, or a domain event seen. Completion SHALL be detected from projections, stored client-locally per save slot, displayed with locked/complete states and the milestone's localized description, and discarded state SHALL never affect the session (PIC-16). The default list SHALL cover the M11a opening script: build the first S1 chain, reach the first S1→S2 advancement, establish a second location, create a transport route, and complete one exchange trade.

Source: REF-12.6, PIC-16, PIC-4, PIC-9, PIC-11

#### Scenario: A milestone completes from projected facts
- **WHEN** the second location's knowledge becomes `established`
- **THEN** the "establish a second location" milestone completes and persists per save slot

#### Scenario: A locked-definition milestone completes on unlock
- **WHEN** a definition's metadata `locked` flag changes from `true` to `false`
- **THEN** the corresponding milestone completes

#### Scenario: Discarding milestones never affects the game
- **WHEN** the client-local milestone store is cleared
- **THEN** the session, projections, and commands behave identically

#### Scenario: The opening-script milestones exist by default
- **WHEN** the tracker renders on the R3 content
- **THEN** the five opening-script milestones are listed with localized descriptions
