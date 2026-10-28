# Spec Delta

## ADDED Requirements

### Requirement: Game HUD frame
The client SHALL render a full-bleed world area with fixed HUD regions per REF-11: a resource bar (top left), a location banner (top centre), a news-rail slot (left), a minimap and population slot (bottom left), an action bar (bottom centre), and a context-panel slot (bottom right). The HUD regions SHALL be present and stable at a minimum viewport width of `1024` px, and the world area SHALL never be replaced by a dashboard, map, or grid screen.

Source: REF-11, REF-9

#### Scenario: The HUD regions exist
- **WHEN** the client renders at `1280×800`
- **THEN** the resource bar, location banner, news slot, minimap slot, action bar, and context-panel slot are all present and do not overlap

#### Scenario: The dashboard shell is gone
- **WHEN** the client renders
- **THEN** no top bar, drawer tab strip, or dashboard chrome element is present

### Requirement: Resource bar
The resource bar SHALL show the actor's balance with its net rate per minute and up to six resource chips carrying the stock of the viewed location, each formatted from base units with the resource's declared scale and localized name. The default chips SHALL be the resources tagged with the construction role; the player SHALL pin other resources as client-local settings. Every value SHALL come from the owner-economy entry and the viewed location's summary.

Source: REF-11, REF-12.4, PIC-10.6, PIC-10.2

#### Scenario: The balance and net rate are shown
- **WHEN** the owner holds `6000000` credits base units with a net rate of `10` per tick and the scale is `6000` with a `1000` ms tick
- **THEN** the resource bar shows `1,000` and a positive per-minute net rate

#### Scenario: Chips show the viewed location's stock
- **WHEN** the viewed location stores `240000` base units of the pinned construction resource at scale `6000`
- **THEN** its chip reads `40`

### Requirement: Location banner
The location banner SHALL show the viewed location's code, region, ownership mark, slot types, and suitability chips from the location snapshot. The viewed location SHALL be the location nearest the camera centre at location level or deeper, or none when no location is viewed. An unknown location SHALL render no attributes (PIC-9.3).

Source: REF-11, PIC-9.1, PIC-9.3

#### Scenario: The banner names the viewed location
- **WHEN** the viewed location `ref.tier.loc.alpha_1` in region α carries a `v_a` slot and suitability `1000` for `suitability_p1`
- **THEN** the banner shows its code, region α, the `v_a` slot chip, and the `suitability_p1` chip

#### Scenario: No viewed location empties the banner
- **WHEN** no location is viewed
- **THEN** the banner shows no location attributes

### Requirement: Action bar
The action bar SHALL offer run/pause, speed, and step controls issuing the matching `control` commands, the tick, the blocked-entity count, overlay and window toggles, save and load, table mode, and the debug toggle. Provisional windows (economy, planning, logistics, exchange, population) SHALL open from the action bar until row 11.4e replaces them, and any open window SHALL close with `Escape`.

Source: REF-11, REF-13.2, REF-12.4

#### Scenario: The tick advances in the action bar
- **WHEN** the mirror holds a projection at tick `12345`
- **THEN** the action bar shows `12345`

#### Scenario: A window opens and closes
- **WHEN** a window toggle is activated and then `Escape` is handled
- **THEN** the window opens and then closes, returning focus to the world area

### Requirement: Presentation package data
The client SHALL bundle the reference presentation package (localization, mappings, formatting) as client data produced from the package files at build time, and SHALL use it for names, descriptions, display categories, sort order, and number/rate formatting. Missing mappings and keys SHALL fall back to the plain fallback shape and the key itself (PIC-6, PIC-7); replacing the package with an empty one SHALL still yield a usable client.

Source: REF-14.4, PIC-5, PIC-6, PIC-7

#### Scenario: Names come from the presentation package
- **WHEN** a definition chip renders for `ref.tier.resource.p1` whose localized name is `P1`
- **THEN** the chip's label is `P1`

#### Scenario: An empty presentation package falls back
- **WHEN** the presentation data has no entry for a definition
- **THEN** its label is the definition ID and its shape is the fallback box

#### Scenario: Rates format per the declared tick duration
- **WHEN** a per-tick rate of `100` base units is formatted with `tick_duration_ms: 1000`
- **THEN** the formatted rate reads `60` per minute

## REMOVED Requirements

### Requirement: Top bar controls
**Reason:** The dashboard top bar is removed with the dashboard shell (redesigned 07 §11); its controls move to the action bar.
**Migration:** Run/pause/step/speed and the tick display are owned by the "Action bar" requirement; the blocked count is shown in the action bar.

### Requirement: Top bar balance
**Reason:** The single top-bar balance is replaced by the resource bar of the viewed location, which also carries resource chips (REF-11).
**Migration:** The balance and net-rate display is owned by the "Resource bar" requirement with the same base-unit formatting.

## MODIFIED Requirements

### Requirement: Client-local view state
The client SHALL keep view state (selection, mode, overlays, camera, pinned resources, open windows, locale, theme) separate from the authoritative mirror, persisted under the client-local storage key `aesfw-ref.client.v2`, and discarding it SHALL not affect the session.

Source: REF-14.1, REF-14.5, PIC-16

#### Scenario: View state is independent of the mirror
- **WHEN** the selection is set and then the mirror receives a new snapshot
- **THEN** the selection is unchanged

#### Scenario: Pinned resources persist
- **WHEN** a resource is pinned and the page is reloaded
- **THEN** the resource bar shows the pinned resource again

### Requirement: Localization with fallback
`createI18n(entries)` SHALL return `t(key)` that returns the localized string for a known key and the key itself for a missing key, and `formatBaseUnits(value, scale)` SHALL format base units as a display number with grouping and no fractional part. Formatting SHALL use the per-resource scale and rate unit declared by the bundled presentation package.

Source: REF-14.4, PIC-7, REF-14.4 (07 §14.4)

#### Scenario: A missing key falls back to the key
- **WHEN** `t('ref.tier.resource.p1')` is called with no entry for that key
- **THEN** it returns `ref.tier.resource.p1`

#### Scenario: Base units are formatted with grouping
- **WHEN** `formatBaseUnits(1204500, 1000)` is called
- **THEN** it returns `1,205`

#### Scenario: The scale comes from the presentation package
- **WHEN** a value of `240000` base units is formatted for a resource whose declared scale is `6000`
- **THEN** it reads `40`

### Requirement: Smoke flow 1 — load and tick
The client SHALL load the reference content and presentation packages, become ready, and advance the tick when the run control is used, showing the advancing tick in the action bar.

Source: VER-13.2, REF-11

#### Scenario: The tick advances
- **WHEN** the client has loaded and the run control is used
- **THEN** the action-bar tick increases
