# Tasks

## 1. Content (design D1–D3)

- [x] 1.1 Create `reference/content/ref.tier/package.yaml` and `content.yaml` with the R0 definitions.
- [x] 1.2 Create `reference/content/ref.tier.presentation/package.yaml`, `localization.en.yaml`, `mappings.yaml`, and `formatting.yaml`.

## 2. Verification

- [x] 2.1 Run `aesfw validate reference/content/ref.tier --strict` and confirm no error diagnostics. [REF-5]
- [x] 2.2 Run the R0 content headlessly and confirm no findings. [REF-5, GDD-23.1]

## 3. Documentation and verification

- [x] 3.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 3.2 Confirm no amendment to 01–07 is required.
- [x] 3.3 Run `pnpm verify` and `pnpm trace`; all green. [REF-5]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.7 with "✓ archived <date>" in `docs/08`.
