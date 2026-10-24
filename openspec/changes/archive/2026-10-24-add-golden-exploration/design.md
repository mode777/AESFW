# Design

## Context

Everything mechanical exists from 8.2/8.3; the scenario composes it declaratively. The one gap the composition exposed: a successful establishment creates the hub entity after phase 04 has already rebuilt the derived caches, so the maintained cache lags the authoritative state for the rest of the tick and INV-20 fires.

## Decisions

### D1 — Declarative cargo loading

The scenario loads the establishment cost with an ordinary route order (load `fixed 500` of the package resource at home) driven by a new `demo.entity.packager` infinite-rate source (`50`/tick) in the fixture, plus a second transport unit. This keeps the scenario pure YAML through the real gateway — no test-side state surgery — and exercises the GDD-16.3 rule that establishment costs come from cargo, not accounts.

### D2 — Establishment marks the derived caches dirty

Following the construction-finalize precedent, a successful establishment sets `world.caches.dirty = true` (in `runEstablishOrders`, mirrored by the phase 18 descriptor), so phase 04 rebuilds the spatial and connectivity caches next tick and INV-20 holds without weakening the check. No shipped fixture creates entities mid-tick outside construction, so no existing golden changes.

### D3 — Scenario timeline

Ticks (traversal is 2 ticks per connection): route load order created at tick 1 and assigned to the second unit at tick 4 (load ~5 ticks at `100`/tick handling); explore order created at tick 2, assigned to the first unit at tick 12 (arrival ~tick 14 → discovery); establish order created at tick 3, assigned at tick 16 (arrival ~tick 18 → establishment). 40 ticks total; entity IDs follow from the fixture's ascending instantiation order (frontier location 1, home location 3, units 6 and 7, first order 8).

## Clarifications recorded (no normative amendment)

- The golden is new (06 §9.4 reason: new scenario); no existing checkpoint changes.

## Risks / Open Questions

- The timeline depends on handling and traversal rates; if M11a rebalances the fixture, this scenario's commands may need retuning — acceptable for a theme-free fixture.
