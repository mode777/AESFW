# Design

## Context

The loader knobs `economic_diagnostics` (10.2) and `design_intent` (10.3) exist but have no CLI surface; the CLI prints raw `severity: code` lines and dumps diagnostic objects as JSON. CONT-15's authoring acceptance needs actionable messages and design-idea inactivity in the report.

## Goals / Non-Goals

- Goals: a pure message catalogue with arg interpolation, a shared deterministic report builder, CLI flags for the two knobs.
- Non-Goals: i18n/`Intl` (forbidden in pure packages — English templates are data); changing diagnostics emission; `aesfw replay`/`save-diff` (12.2).

## Decisions

### D1 — Message catalogue shape

`packages/content/src/diagnostics/messages.ts` exports `DIAGNOSTIC_MESSAGES: Readonly<Record<string, string>>` (code → template with `{arg}`/`{definition}` placeholders) and `messageFor(diagnostic): string`. Interpolation replaces `{name}` with `String(args[name])`, `{definition}` with the definition or package, and leaves unknown placeholders literal. Unknown codes fall back to `'unknown diagnostic <code>'`. A cross-check test asserts catalogue ↔ messages bijectivity (extending the 10.2 test file's pattern).

### D2 — Report builder

`formatReport(diagnostics, { format: 'text' | 'json' }): string` in the same module. Ordering: errors before warnings, then catalogue order (index in `DIAGNOSTIC_CODES`, unknown codes last, ties by code — deterministic). Text line: `  <severity>  <code>  <definition|package>  <message>` + ` (<file>)` when a file exists; final line `summary: <N> error(s), <M> warning(s)`. JSON: `{ diagnostics: [{ code, severity, message, definition, path, file, args }], summary: { errors, warnings } }`. Pure data in and string out — no format skew between simulation and presentation paths.

### D3 — CLI wiring

`runValidate` passes `{ economic_diagnostics: optionValue('--economic-diagnostics') ?? 'warning', design_intent: optionValue('--design-intent') ?? 'off' }` into `loadContent` (graph stage options) and renders via `formatReport`. The presentation path renders through the same builder. Usage string gains the two flags. Defaults reproduce today's behavior exactly.

## Golden-hash statement

No golden changes: reporting only. (06 §9.4)
