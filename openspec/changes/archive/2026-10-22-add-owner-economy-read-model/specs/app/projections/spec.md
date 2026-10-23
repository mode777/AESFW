# Spec Delta

## Purpose

The owner economy read model (PIC-10.6): balance rates, revenue and expenses by source, idle-but-paying entities, and deficit-paused entities — in the snapshot and in the delta.

## ADDED Requirements

### Requirement: Owner balance read model
Each owner entry in the full projection SHALL carry a `balance` object with `revenue_per_interval`, `expenses_per_interval`, and `net_per_interval` as the owner's per-tick income, maintenance expense, and their difference, and `deficit_paused_entities` listing the owner's deficit-paused entities in pause order. It SHALL also carry `revenue_by_source` keyed `tier.<tier id>` (population income by tier), `expenses_by_source` keyed `entity.<entity id>` (per-entity maintenance expense), and `idle_paying_entities` listing charging entities whose producer is not `processing`. All rates are per tick in base units.

Source: PIC-9.1, PIC-10.6, GDD-20.2

#### Scenario: The balance carries revenue, expenses, and pause order
- **WHEN** an owner holds one residence producing `10` per tick of the balance resource and one entity charging `500` per `10` ticks, with one entity deficit-paused after another
- **THEN** the owner's balance reads revenue `10`, expenses `50`, net `-40`, and `deficit_paused_entities` in pause order

#### Scenario: Revenue by source names the tier
- **WHEN** a residence of tier `test.tier.a` produces `10` per tick
- **THEN** `revenue_by_source['tier.test.tier.a']` is `10`

#### Scenario: Expenses by source names the entity
- **WHEN** an entity charges `500` per `10` ticks
- **THEN** `expenses_by_source['entity.<id>']` is `50`

#### Scenario: An idle producer that still pays is listed
- **WHEN** a producer with `charge_policy: while_enabled` is `idle` at an interval boundary
- **THEN** `idle_paying_entities` contains that entity

#### Scenario: A processing producer is not idle-paying
- **WHEN** a producer with `charge_policy: while_enabled` is `processing`
- **THEN** `idle_paying_entities` does not contain that entity

### Requirement: Owner updates in the projection delta
`diffProjection(prev, next)` SHALL include an `owner_updates` entry carrying the full owner entry (resources and balance) for every owner whose projected entry differs between `prev` and `next`, and SHALL omit `owner_updates` (or emit an empty list) when no owner changed.

Source: PIC-9.2, PIC-10.6

#### Scenario: A balance change appears in the delta
- **WHEN** an owner's revenue changes between two projections
- **THEN** the delta's `owner_updates` carries that owner's full entry with the new balance

#### Scenario: An unchanged owner is omitted
- **WHEN** no owner entry changes between two projections
- **THEN** `owner_updates` is empty
