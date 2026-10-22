# Spec Delta

## Purpose

The reference browser client shell: signals, the authoritative mirror, client-local view state, i18n, the top bar, and the debug overlay (REF-9–11, REF-12.5, REF-14).

## ADDED Requirements

### Requirement: Signals
The client SHALL provide a `signal(initial)` primitive with `get`, `set`, and `subscribe`, and a `computed(fn)` primitive that recomputes when a dependency signal changes. `set` SHALL notify subscribers only when the value changes.

Source: REF-14.1, REF-14.2

#### Scenario: A computed follows its source
- **WHEN** a `computed` reads a signal and the signal is set to a new value
- **THEN** the computed returns the new value

#### Scenario: Setting the same value does not notify
- **WHEN** a signal is set to its current value
- **THEN** subscribers are not notified

### Requirement: Authoritative mirror
The client SHALL keep an authoritative mirror of the latest projection. `applySnapshot(snapshot)` SHALL replace it. `applyDelta(delta)` SHALL apply the delta only when `canApplyDelta(current, delta)` holds, and otherwise SHALL request a full snapshot (PIC-18). The mirror SHALL never be patched by client-computed values.

Source: REF-14.2, PIC-18

#### Scenario: A matching delta is applied
- **WHEN** the mirror holds revision `1` and receives a delta with `from_revision` `1`
- **THEN** the mirror's projection revision becomes the delta's `to_revision`

#### Scenario: A mismatched delta requests a snapshot
- **WHEN** the mirror holds revision `1` and receives a delta with `from_revision` `5`
- **THEN** it requests a full snapshot and its projection is unchanged

### Requirement: Client-local view state
The client SHALL keep view state (selection, mode, overlays, open panels, locale) separate from the authoritative mirror, and discarding it SHALL not affect the session.

Source: REF-14.1, PIC-16

#### Scenario: View state is independent of the mirror
- **WHEN** the selection is set and then the mirror receives a new snapshot
- **THEN** the selection is unchanged

### Requirement: Localization with fallback
`createI18n(entries)` SHALL return `t(key)` that returns the localized string for a known key and the key itself for a missing key, and `formatBaseUnits(value, scale)` SHALL format base units as a display number with grouping and no fractional part.

Source: REF-14.4, PIC-7

#### Scenario: A missing key falls back to the key
- **WHEN** `t('ref.tier.resource.p1')` is called with no entry for that key
- **THEN** it returns `ref.tier.resource.p1`

#### Scenario: Base units are formatted with grouping
- **WHEN** `formatBaseUnits(1204500, 1000)` is called
- **THEN** it returns `1,205`

### Requirement: Top bar controls
The top bar SHALL show the tick, the current speed, run/pause and step controls, and the blocked-entity count from the projection, and SHALL issue the matching `control` commands through the session client.

Source: REF-11, REF-13.2

#### Scenario: The top bar reflects the tick
- **WHEN** the mirror holds a projection at tick `12345`
- **THEN** the top bar shows `12345`

### Requirement: Debug overlay
The debug overlay SHALL show tick, revision, last state hash, protocol version, and content checksum, and SHALL be toggleable.

Source: REF-12.5

#### Scenario: The overlay shows the revision
- **WHEN** the overlay is open and the mirror holds revision `42`
- **THEN** it shows `42`

### Requirement: Client visibility
The client SHALL import only `@aesfw/protocol` and `@aesfw/host-web/client` from the framework.

Source: TDS-4.3 rule 4, REF-2

#### Scenario: The client builds without framework internals
- **WHEN** dependency-cruiser runs over `reference/client-web`
- **THEN** it reports no import of `@aesfw/core`, `@aesfw/content`, or `@aesfw/app`
