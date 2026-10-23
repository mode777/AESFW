# Spec Delta

## Purpose

The economy and planning drawer views, the top-bar balance (REF-12.4), and the host `planning` query.

## ADDED Requirements

### Requirement: Top bar balance
The top bar SHALL display the actor's credits balance formatted from base units with the reference scale (6000), updated on every published snapshot and owner update.

Source: REF-12.4, REF-14.3

#### Scenario: The top bar shows the credits balance
- **WHEN** the actor's owner holds `60000` credits base units
- **THEN** the top bar's balance element reads `10` display units

### Requirement: Economy drawer view
The client SHALL offer an economy drawer listing the owner's balance, the net rate per tick, revenue by source, expenses by source, the idle-but-paying entities, and the deficit-paused entities in pause order, with a control that submits `ResumeDeficitPausedEntities` with `entities: 'all'`. Every value SHALL come from the projection's owner balance entry; the trend sparkline SHALL be client-side history of the net rate (last 60 published samples).

Source: REF-12.4, PIC-10.6

#### Scenario: The economy view lists sources and paused entities
- **WHEN** the owner balance carries revenue by source `{'tier.test.tier.s1': 10}` and expenses by source `{'entity.3': 50}` with one deficit-paused entity
- **THEN** the economy view shows one revenue row, one expense row, and the paused entity, and offers the resume control

#### Scenario: The resume control submits the resume command
- **WHEN** the economy view's resume control is activated
- **THEN** the client submits a `ResumeDeficitPausedEntities` command with `entities: 'all'`

### Requirement: Planning drawer view
The client SHALL offer a planning drawer that fetches the `planning` query when visible and lists, per consumed resource, the net rate and per consuming tier the per-capita demand, supported population, current population, and coverage; and the chain table with stage definition, count, ratio, output, footprint, maintenance, and capability demand.

Source: REF-12.4, PIC-10.5

#### Scenario: The planning view renders supported population
- **WHEN** the planning query returns a resource whose owner scope reports a tier with supported `1` and coverage `1000`
- **THEN** the planning view shows that tier row with supported `1`

#### Scenario: The planning view refreshes while visible
- **WHEN** the planning drawer is open and a new snapshot is published
- **THEN** the client issues a new `planning` query

### Requirement: Drawer keyboard map
The keys `E` and `P` SHALL toggle the economy and planning drawers respectively; activating the visible drawer's key again closes it. The mapping SHALL be a pure view-state helper.

Source: REF-13.4, REF-16

#### Scenario: The economy key toggles the drawer
- **WHEN** the drawer is closed and the `E` key action is applied
- **THEN** the drawer state becomes `economy`; applying it again returns the drawer to closed
