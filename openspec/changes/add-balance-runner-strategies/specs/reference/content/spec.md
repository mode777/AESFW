# Spec Delta

## ADDED Requirements

### Requirement: Balance strategy corpus
`reference/content/test/balance/` SHALL contain scripted strategies over the R3 content as scenario files with scheduled commands and expectations: an opening strategy that builds and supplies the first S1 chain and the second-tier economy, an overexpansion strategy that spends the start stock into deficit, and a pyramid variant that advances more than 60 % of the start location's S1 residences. Strategies SHALL use only commands available to a player and no test-only APIs.

Source: REF-8

#### Scenario: The opening strategy runs to its horizon
- **WHEN** the opening strategy runs its full tick count
- **THEN** the run reports no invariant findings and every expectation passes

#### Scenario: The overexpansion strategy enters deficit
- **WHEN** the overexpansion strategy runs
- **THEN** its metrics rows show a negative balance and deficit-paused entities

### Requirement: Balancing-target checks
The reference tests SHALL check every 07 §8 target from strategy runs: the start state never deadlocks, the first S1→S2 advancement is reachable by the opening strategy within 15–25 simulated minutes, advancing more than 60 % of S1 residences starves primary production, exchange sales stay below 20 % of revenue at equilibrium, the overexpansion run recovers without player input within 30 simulated minutes once expansion stops, and the design-intent audit stays clean. A target that cannot be met SHALL be recorded as a documented deviation in the change, never silently dropped.

Source: REF-8, GDD-23.4

#### Scenario: The first advancement lands in the target window
- **WHEN** the opening strategy runs
- **THEN** the first S1→S2 advancement event occurs between tick 900 and tick 1500

#### Scenario: Pyramid pressure starves primary production
- **WHEN** the pyramid variant advances more than 60 % of S1 residences
- **THEN** primary-production block events occur in the following 600 ticks

#### Scenario: Trade stays a minority revenue source
- **WHEN** the opening strategy reaches its equilibrium phase
- **THEN** exchange sales revenue is less than 20 % of total revenue over the last 600 ticks

#### Scenario: The loss spiral recovers
- **WHEN** the overexpansion strategy stops expanding and runs 1800 more ticks
- **THEN** the balance becomes non-negative and no entity remains deficit-paused
