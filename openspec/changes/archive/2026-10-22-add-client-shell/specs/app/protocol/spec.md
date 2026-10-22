# Spec Delta

## Purpose

The `control` message gains a `speed` action so the client can change the clock speed without running (TDS-21.1).

## ADDED Requirements

### Requirement: Control speed action
`WorkerControlAction` SHALL include `speed`, and a `control` request with action `speed` SHALL set the host's ticks per tick duration without changing the run state.

Source: TDS-21.1

#### Scenario: A speed control decodes
- **WHEN** `decodeWorkerRequest({ kind: 'control', protocol_version: 1, action: 'speed', speed: 4 })` is called
- **THEN** the result is ok and the value's `action` is `speed`
