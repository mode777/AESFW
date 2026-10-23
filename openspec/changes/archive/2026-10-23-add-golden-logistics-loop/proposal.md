# Proposal

## Why

Roadmap 08, M6 item 6.7 (`add-golden-logistics-loop`). SCN-02 requires a resource that exists at only one of two locations to reach the other through a transport route, with a committed golden and invariants after every tick. Until now the scenario runner ignored `commands`, so no golden could create and assign a route. This change adds the theme-free logistics fixture, applies scenario commands through the real command gateway, and commits the SCN-02 golden.

## What Changes

- New theme-free fixture `fixtures/content/demo-logistics`: two locations, a connection, a source at one location, a producer and residence at the other, and a transport unit.
- New scenario `fixtures/scenarios/logistics_loop.yaml` (SCN-02) with two commands: create a route order and assign the transport unit.
- The scenario runner now submits due scenario commands through `@aesfw/app`'s command gateway before advancing the tick, instead of ignoring them. It records `command_rejected` findings. This retires part of the M11 scenario-command gap early; SCN-14 still needs its scripted strategy.
- Committed golden `fixtures/scenarios/logistics_loop.hashes.json` and a host-node test that checks invariants, transport load/unload events, the golden, and replay determinism.
- Existing scenarios have no commands, so their hashes are unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `testkit/scenarios`: scenario commands are applied, and SCN-02 is added to the required scenario set.

## Impact

- **Packages:** `@aesfw/testkit` (scenario runner), `@aesfw/host-node` (SCN-02 test), `fixtures/` (content and scenario).
- **Tick phases:** scenario commands are scheduled through phase 01; no phase change.
- **Store kinds:** none new.
- **Commands/events:** the fixture uses `CreateTransportOrder` and `AssignTransport`; the test observes `TransportLoaded` and `TransportUnloaded`.
- **Error codes/diagnostic codes:** `command_rejected` is a scenario finding, not a new command error.
- **Protocol/save format:** no change. **HASH-CHANGING:** only the new SCN-02 scenario has a golden; existing goldens are unchanged.
- **Dependencies on archived changes:** 6.5 `add-transport-quantity-rules` (archived 2026-10-23) and 2.2 `add-session-and-command-gateway` (archived 2026-10-22).

## Out of Scope

- 6.8 `add-client-world-map` and 6.9 `add-client-route-editor`: client rendering and editing.
- SCN-14's scripted 7,200-tick strategy and the remaining M11 runner features.
- Exploration, establishment, and exchange orders.
