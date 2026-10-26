# Tasks

## 1. Reference content design (docs/07 Part A)

- [x] 1.1 Append the complete presentation package and automatic advancement to the R3 row of 07 §5 (verify: the row text names both)
- [x] 1.2 Replace the B.7 row of 07 §7 with automatic triggering and purpose-lock gating (verify: the row text matches design.md "Document changes")

## 2. Reference client design (docs/07 Part B)

- [x] 2.1 Update the 07 header to version 1.1 and rewrite §9 principles per D6 and design.md (verify: seven principles, principle 5 uses the D6 wording)
- [x] 2.2 Extend §10.1 tokens (role, tier, sea, terrain) and the §10.2 location row (verify: the tokens table and shape table contain the new rows)
- [x] 2.3 Replace §11 with the HUD layout of D4 (verify: the diagram and bullets name all six HUD regions)
- [x] 2.4 Restructure §12 per D5 (12.1 world canvas, 12.2 location level, 12.3 context panels, 12.4 overlay windows, 12.5 debug, 12.6 news, hints and milestones), keeping section numbers (verify: all subsections exist and each keeps its Shows/Data/Commands form)
- [x] 2.5 Update §13 (modes, keyboard additions, placement flow per D6, new §13.5 camera) (verify: §13.5 exists and §13.3 describes drag connectors and awaiting-resources ghosts)
- [x] 2.6 Update §14.1, §14.3 (SVG levels of detail, D3), §14.5 (storage key v2, milestones), and §14.6 (world-canvas budget) (verify: text matches design.md)
- [x] 2.7 Update §15 (keyboard cursor announcements), §17 (non-goals), and §18 (human playtest criterion) (verify: text matches design.md)

## 3. Contract clarification (docs/04, docs/05)

- [x] 3.1 Clarify 04 §20 to name §4 definition metadata as a displayable source and add amendment A14 to 05 §26 (verify: 04 §20 cites A14 and 05 §26 has an A14 row)

## 4. Roadmap (docs/08)

- [x] 4.1 Update the R-08 mitigation in 08 §3 (verify: it names the game HUD client and the human playtest gate)
- [x] 4.2 Replace row 11.4 with rows 11.4a–11.4f and 11.4 in the M11a table; update the exit criteria and demo (verify: the table has seven client rows with acyclic dependencies on archived or earlier rows)
- [x] 4.3 Update the 11.6 scope in M11b and the M10 "Next" note in §11 (verify: 11.6 names the revised budgets and the Canvas fallback; "Next" says 11.4a may start in parallel)

## 5. Tooling

- [x] 5.1 Make `tools/trace` write POSIX-style paths (verify: `pnpm trace` on Windows leaves `docs/traceability.md` unchanged)
- [x] 5.2 Exempt the new sections REF-12.6 and REF-13.5 in `tools/trace/exempt.yaml`, naming their owning rows 11.4f and 11.4b (verify: `pnpm trace` reports 0 untraced)

## 6. Verification

- [x] 6.1 Run pnpm verify and pnpm trace; all green, and no new untraced requirement IDs in the claimed sections (locally: no failures beyond the recorded Windows baseline; CI green after push)

## Workflow follow-up

- Archive with `/opsx-archive`, then commit and push.
