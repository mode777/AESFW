# Proposal

## Why

Roadmap 08, M10 item 10.6 (`add-validation-report-cli`), size S. M10's five validation rows emit structured diagnostics; CONT-15 closes authoring acceptance by requiring the validator to give *actionable errors* and to *report which core design ideas a package leaves inactive*. Today `aesfw validate` prints raw `severity: code` lines, the JSON format dumps the diagnostic objects, and the `economic_diagnostics`/`design_intent` knobs (10.2, 10.3) have no CLI surface. This row finishes the authoring loop and the M10 exit criteria.

Dependencies on archived changes: 10.2 `add-economic-diagnostics` (archived 2026-10-25), 10.3 `add-design-intent-diagnostics` (archived 2026-10-25). Archived.

## What Changes

- A pure message catalogue `diagnostics/messages.ts` in `@aesfw/content`: every catalogue code has a template interpolated with the diagnostic's args (`messageFor(diagnostic)`), giving every finding a human sentence.
- A report builder `formatReport(diagnostics, { format })` producing:
  - **text**: lines ordered errors-then-warnings with severity, code, definition, interpolated message, and file, followed by a `summary: N errors, M warnings` line;
  - **json**: `{ diagnostics: [{ code, severity, message, definition, path, file, args }], summary: { errors, warnings } }`.
- CLI surface: `aesfw validate` gains `--design-intent off|warning|error` (default `off`) and `--economic-diagnostics warning|error` (default `warning`), wired to the loader knobs; the text report replaces the raw formatter for both simulation and presentation paths.
- `aesfw validate --help`-style usage line extended to document the new flags (usage string only).

## Capabilities

### Modified Capabilities

- `content/validation`: the message-catalogue requirement extends the validation stage capability.
- `host/cli`: the validate command's report formats and knobs.

## Impact

- **Packages:** `@aesfw/content` (messages module, report builder); `@aesfw/host-node` (CLI wiring). No client, protocol, or kernel change.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none new.
- **Diagnostic codes:** none new; every existing code gains a message template.
- **HASH-CHANGING:** none (reporting only).

## Out of Scope

- Runtime i18n/`Intl` (pure packages forbid it; the catalogue is English and deterministic — a host-side translation layer is a later concern); `aesfw replay`/`save-diff` (12.2).
