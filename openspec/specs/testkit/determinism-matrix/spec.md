# testkit/determinism-matrix Specification

## Purpose

The cross-environment determinism check of VER-8.2: an empty-world replay run in a browser and compared with the Node reference, so the same simulation produces identical hash checkpoints on both engines.

## Requirements

### Requirement: Empty-world replay runner
`@aesfw/testkit` SHALL provide a pure, browser-safe runner that builds a world from an empty registry, steps it for the requested number of ticks, and records a state-hash checkpoint every requested interval. It SHALL use no ambient APIs so it runs unchanged in Node and in a browser.

Source: VER-8.2, VER-6

#### Scenario: The runner records the requested checkpoints
- **WHEN** the runner runs for `10,000` ticks with an interval of `1,000`
- **THEN** it returns `10` hash checkpoints, each a 16-hex-character string

### Requirement: Node reference golden
The Node checkpoint list SHALL be recorded as a committed golden, and a Node test SHALL assert that the runner reproduces it. The golden SHALL change only with an explained, reviewed reason (VER-9.4).

Source: VER-8.2, VER-9.4

#### Scenario: The Node run matches the golden
- **WHEN** the Node reference test runs the runner and compares it with the committed golden
- **THEN** the two lists are equal

### Requirement: Browser replay equals the Node reference
A browser-mode test SHALL run the same runner in Chromium and assert that its checkpoints equal the Node golden (VER-8.2).

Source: VER-8.2

#### Scenario: Chromium reproduces the Node hashes
- **WHEN** the browser test runs the runner in Chromium
- **THEN** its checkpoints equal the Node golden

### Requirement: Browser determinism stage in CI
The CI pipeline SHALL run the browser-mode determinism check in Chromium as the L7 stage of VER-15.3, after the Node tests.

Source: VER-15.3, VER-8.2

#### Scenario: CI runs the browser determinism stage
- **WHEN** `.github/workflows/ci.yml` is inspected
- **THEN** it contains a step that runs `pnpm test:browser`
