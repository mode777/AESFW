# Tasks

## 1. Entity schema amendment (design A8)

- [x] 1.1 In `docs/03` §6.8, add the `connectivity.provides` provider-form example and the exactly-one-of `requires`/`provides` rule. Verify the section reads coherently with the existing `connectivity.requires` example.

## 2. Presentation contract amendments (design A9–A12)

- [x] 2.1 In `docs/04` §9.1, add the location `grid` field, the entity `spatial.footprint`, and the entity `connectivity` object to the snapshot examples, with the explanatory sentence. Verify §9.1 and §9.3 now list the same attributes.
- [x] 2.2 In `docs/04` §9.3, correct the omitted-attribute list to "property values, region, grid geometry, connectivity, and foreign entities".
- [x] 2.3 In `docs/04` §10.2, add the incremental-delivery note naming the snapshot as the source of grid topology and the property vector and requiring an owning row per field.
- [x] 2.4 In `docs/04` §20, extend the snapshot/query traceability criterion with the "absent from §9, §10, or §12 SHALL NOT be displayed" clause.

## 3. Technical design amendment (design A13)

- [x] 3.1 In `docs/05` §18.4, add the sentence naming the spatial projection fields (grid, spatial/footprint, connectivity).

## 4. Client design amendment (design A14)

- [x] 4.1 In `docs/07` §12.2, update the **Data** line to name the snapshot fields the grid reads.

## 5. Roadmap drafting-guide and log amendments (design A15, D6, D7)

- [x] 5.1 In `docs/08` §7, add §7.4 "Integration surfaces" (surface checklist and the three rules), a `Surfaces:` line in the §7.1 example, and the extended §7.2 proposal Impact row.
- [x] 5.2 In `docs/08` §10, add the coverage acceptance criterion (every referenced `04` §9/§10/§12 field and `03` §6 component has an owning row).
- [x] 5.3 In `docs/08` §11, record the M3 root cause and the three gap-closure rows, and note that §7.4 now prevents recurrence.

## 6. Amendment register and verification

- [x] 6.1 Add amendments A8–A12 to the `docs/05` §26 register, referencing the affected sections and the rationale.
- [x] 6.2 Run `openspec validate` (change and `--specs`) and confirm `skip_specs` is honored; run `pnpm verify` and `pnpm trace`; all green with no new untraced requirement IDs.

## Workflow follow-up

- Archive the change after verification; no roadmap row is added because this is a process/documentation amendment recorded in the M3 milestone log.
