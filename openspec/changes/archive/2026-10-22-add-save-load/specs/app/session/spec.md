# Spec Delta

## Purpose

The session settings gain the tick duration so the save header can record it (TDS-19.1, ARCH-15.1).

## ADDED Requirements

### Requirement: Session tick duration
`SessionSettings` SHALL carry the tick duration in milliseconds, set from `SessionOptions.tickDurationMs` when the session is created, and the session SHALL expose it unchanged for the lifetime of the session.

Source: TDS-19.1, ARCH-15.1

#### Scenario: The settings carry the tick duration
- **WHEN** a session is created with `tickDurationMs` `100`
- **THEN** `session.settings.tickDurationMs` is `100`
