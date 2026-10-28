# Tasks

## 1. News rail

- [ ] 1.1 Implement `newsEntries` (newsworthy families, block-onset dedupe with re-arm, pending warnings from the projection, newest-first, cap 20); verify the [REF-12.6] rail scenarios incl. bounding and warning derivation.
- [ ] 1.2 Render the news rail in the HUD slot with click-to-select and camera jump via `focusSubject`; verify the [REF-12.6, REF-11] jump scenario.

## 2. Contextual hints

- [ ] 2.1 Implement `hintFor` over the localization catalogue with argument filling from DTOs; verify the [REF-12.6] hint scenarios incl. the no-mechanics rule.
- [ ] 2.2 Add the `hint.*` localization keys to `ref.tier.presentation` (missing-key fallback verified); verify the empty-package fallback still holds [PIC-7].
- [ ] 2.3 Surface hints as toasts from command notices and as rows in the affected subject's panel; verify the [REF-13.4] rejection-hint scenario.

## 3. Milestone tracker

- [ ] 3.1 Implement `milestones.ts` (default five opening-script milestones as projected-fact predicates); verify each [REF-12.6] predicate scenario.
- [ ] 3.2 Implement per-save-slot completion storage under `aesfw-ref.client.v2` and the tracker UI (locked/complete, localized descriptions); verify the persistence and discard-neutrality scenarios [PIC-16].

## 4. Tests and documentation

- [ ] 4.1 Selector unit tests for news, hints, and milestones; smoke flows re-run with the rail active; verify green [VER-13.2].
- [ ] 4.2 Record the milestone threshold source and the slot-key fallback (D3/D5) here; no 01–07 amendment expected.
- [ ] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
