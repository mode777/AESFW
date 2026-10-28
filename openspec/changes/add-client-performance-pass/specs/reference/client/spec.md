# Spec Delta

## ADDED Requirements

### Requirement: Client performance budgets
The client SHALL meet the REF-14.6 budgets, measured by browser performance scenarios on the reference content: frame time ≤ `8` ms p95 while panning and zooming the world with all known locations at location level (R3 content); delta application plus selector recomputation ≤ `2` ms p95 per published tick; worker tick time ≤ `2` ms median on R4 content at ×16 (`bench.reference`); and time to first interactive frame ≤ `2` s cold on R3 content. The scenarios SHALL run in the browser-check environment and record their measurements with pass/fail verdicts.

Source: REF-14.6, VER-14, TDS-24

#### Scenario: The pan/zoom tour meets the frame budget
- **WHEN** the scripted pan/zoom tour crosses all known locations at location level on R3 content
- **THEN** the p95 frame time is at most `8` ms

#### Scenario: Delta and selector work meets the tick budget
- **WHEN** the session publishes projections at ×16 with the HUD, panels, and one window open
- **THEN** the p95 delta-apply plus selector-recompute time per tick is at most `2` ms

#### Scenario: The worker meets the R4 tick budget
- **WHEN** `bench.reference` runs on the R4 content at ×16
- **THEN** the median worker tick time is at most `2` ms

#### Scenario: Cold start meets the interactive budget
- **WHEN** the client loads cold on R3 content
- **THEN** the first interactive frame renders within `2` s

### Requirement: Canvas 2D world-level fallback
If and only if the SVG world level cannot meet the frame budget after the tuning fixes, the world level (islands, lanes, fog clouds, transport dots) SHALL be renderable by a Canvas 2D layer under the SVG location level. The swap SHALL leave selectors and view models unchanged, preserve `data-testid` hit targets and accessibility labels through positioned labelled elements, and be disableable at build time for comparison runs.

Source: REF-14.3, REF-14.6, REF-15, REF-16

#### Scenario: The fallback renders the same world
- **WHEN** the fallback is enabled and the camera is at world level
- **THEN** islands, lanes, fog clouds, and transport dots render as with SVG and selection still works

#### Scenario: Test hooks survive the swap
- **WHEN** the fallback renders an island
- **THEN** a positioned element carrying the island's `data-testid` and label is present

#### Scenario: The fallback is not enabled when SVG meets the budget
- **WHEN** the SVG world level meets the frame budget
- **THEN** the fallback stays off and no canvas element is mounted
