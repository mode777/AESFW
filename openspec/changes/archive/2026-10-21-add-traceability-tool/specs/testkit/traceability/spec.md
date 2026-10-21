# testkit/traceability — Spec Delta

## Purpose

The requirement-to-test trace tool of VER-3: it extracts candidate requirement IDs from the numbered headings of the specification documents, removes the exempt ones, scans test titles for `[ID]` tags, generates `docs/traceability.md`, and reports untraced IDs so the traceability principle of VER-2.2 is checkable.

## ADDED Requirements

### Requirement: Requirement ID extraction
`pnpm trace` SHALL extract candidate requirement IDs from the numbered headings of docs 01–05 and 07, using the prefix of VER-3.1 (`GDD`, `ARCH`, `CONT`, `PIC`, `TDS`, `REF` respectively), where a numbered heading `## <n>. …` or `### <n>.<m> …` yields the ID `<prefix>-<n>` or `<prefix>-<n>.<m>`. IDs listed in `tools/trace/suffixes.yaml` SHALL be treated as valid suffixed IDs (VER-3.1).

Source: VER-3.1, VER-3.3

#### Scenario: A numbered heading yields a prefixed ID
- **WHEN** doc `05_Technical_Design_Specification.md` contains the heading `### 6.3 Proportional allocation`
- **THEN** the extracted candidate IDs include `TDS-6.3`

### Requirement: Exemption list
The tool SHALL remove every ID listed in `tools/trace/exempt.yaml` from the candidate set, and every exemption entry SHALL carry a non-empty reason; an entry without a reason SHALL be reported as an error.

Source: VER-3.3

#### Scenario: An exempt ID is not reported untraced
- **WHEN** `TDS-1` is listed in `tools/trace/exempt.yaml` with a reason
- **THEN** `TDS-1` does not appear in the untraced list

#### Scenario: An exemption without a reason is an error
- **WHEN** an entry in `tools/trace/exempt.yaml` has no reason
- **THEN** the tool reports it as an error and exits non-zero

### Requirement: Test tag scan and generated report
The tool SHALL scan the test files of every package for `[ID]` tags in test titles, map each traced ID to the files that test it, and write the generated matrix `docs/traceability.md` listing every requirement and its tests, followed by the untraced IDs.

Source: VER-3.2, VER-3.3

#### Scenario: A tagged test is mapped to its requirement
- **WHEN** a test title contains `[TDS-6.3]`
- **THEN** `docs/traceability.md` maps `TDS-6.3` to that test file

#### Scenario: The report is regenerated on each run
- **WHEN** `pnpm trace` runs twice
- **THEN** `docs/traceability.md` has identical content both times

### Requirement: Untraced reporting and the strict gate
The tool SHALL report untraced candidate IDs. By default it SHALL exit `0` (a warning, until milestone M10); with `--strict` it SHALL exit non-zero when any untraced ID remains (the M10 error gate).

Source: VER-3.3

#### Scenario: Untraced IDs are a warning by default
- **WHEN** `pnpm trace` runs with untraced IDs present
- **THEN** it prints the untraced IDs and exits `0`

#### Scenario: The strict gate fails on untraced IDs
- **WHEN** `pnpm trace --strict` runs with untraced IDs present
- **THEN** it exits non-zero

### Requirement: Trace stage in CI
The CI pipeline SHALL run the trace tool as the stage named by VER-15.3, after the tests.

Source: VER-15.3

#### Scenario: CI runs the trace stage
- **WHEN** `.github/workflows/ci.yml` is inspected
- **THEN** it contains a step that runs `pnpm trace`
