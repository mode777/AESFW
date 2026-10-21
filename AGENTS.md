# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## What this repository is

The **Abstract Economic Simulation Framework (AESFW)**: a theme-free, deterministic, headless framework for economic city-building games in the style of the Anno series, plus a separate **reference implementation** (an equally abstract game and a minimalist browser client).

The project is **specification-first**. The numbered documents in `docs/` are the source of truth, and implementation proceeds through OpenSpec changes in the order of the roadmap.

## Document map and precedence

| Doc | Purpose | Requirement ID prefix |
| --- | --- | --- |
| [01_Core_Game_Framework_GDD.md](docs/01_Core_Game_Framework_GDD.md) | Design ideas and invariant mechanics (what) | `GDD-` |
| [02_Simulation_Architecture.md](docs/02_Simulation_Architecture.md) | Runtime architecture, tick order, transactions | `ARCH-` |
| [03_Content_Configuration_Specification.md](docs/03_Content_Configuration_Specification.md) | Content packages, schemas, validation | `CONT-` |
| [04_Presentation_Integration_Contract.md](docs/04_Presentation_Integration_Contract.md) | Snapshots, read models, commands for clients | `PIC-` |
| [05_Technical_Design_Specification.md](docs/05_Technical_Design_Specification.md) | TypeScript implementation design (how) | `TDS-` |
| [06_Verification_Specification.md](docs/06_Verification_Specification.md) | Test levels, invariants, scenarios, gates | `VER-`, `INV-`, `SCN-` |
| [07_Reference_Implementation_and_Client_Design.md](docs/07_Reference_Implementation_and_Client_Design.md) | Reference content and web client | `REF-` |
| [08_Implementation_Roadmap.md](docs/08_Implementation_Roadmap.md) | Milestones and OpenSpec change list | — |

Precedence: **01 > 02–04 > 05 > 06 > 07 > 08**. A conflict between documents is a defect. Do not silently pick one side. Raise it with the user, or record an amendment (05 §26) in the same change that resolves it.

## Non-negotiable rules

1. **The simulation is pure.** `@aesfw/core`, `@aesfw/content`, `@aesfw/app`, and `@aesfw/protocol` contain no I/O, clocks, randomness, globals, `console`, `Intl`, async code, or module-level mutable state (05 §5.3). All effects are returned as data. Side effects live only in `@aesfw/host-web`, `@aesfw/host-node`, and the reference client.
2. **Determinism by construction.**
   - Authoritative numbers are safe integers in base units or permille, using `fx` for arithmetic. No floating point in authoritative state.
   - Iterate in ascending entity ID or another documented total order. Never iterate plain objects used as maps.
   - Sort only with a total-order comparator.
   - Randomness comes only from seeded streams in `world.rng`, and only where 05 §15 allows it.
3. **Framework and reference stay separate.**
   - `packages/**` never imports `reference/**`.
   - The reference client imports only `@aesfw/protocol` and `@aesfw/host-web/client`.
   - Framework code, tests, and fixtures are **theme-free**: no `ref.*` IDs, no reference codes (P1, AK1, S1, …), no setting terminology. Use `test.*` or `demo.*` IDs.
4. **Every mutation is a command, and every read is a projection.** Clients never compute mechanics (04 §2.2).
5. **No mechanics in content code.** Content is data. If content needs new behavior, add a framework feature with a theme-free fixture and tests.
6. **`@aesfw/core` has zero runtime dependencies.** A new dependency in any pure package needs a decision-log entry (05 §27).
7. **Goldens change only on purpose.** Never regenerate golden hashes to make a test pass. Explain every hash change in the change's design (06 §9.4).

## Workflow (OpenSpec)

Implementation work happens through OpenSpec changes. The OpenSpec configuration is in `openspec/`, and prompts are in `.github/prompts/opsx-*.prompt.md`.

1. Pick the next row(s) from [08_Implementation_Roadmap.md](docs/08_Implementation_Roadmap.md) whose dependencies are archived.
2. Propose the change with the row's **Change ID** as the change name and its **Capability** as the spec path (08 §7). Use `/opsx-propose`, or `/opsx-new` followed by `/opsx-continue`.
3. Write requirements with SHALL and cite their sources (`Source: GDD-10.2, ARCH-5.2`). Every scenario maps to exactly one test.
4. Implement with `/opsx-apply`. Stay inside the row's scope, because later rows own later behavior.
5. Verify with `/opsx-verify`, then sync and archive (`/opsx-sync`, `/opsx-archive`).
6. If you discover a gap, amendment, new risk, or dependency change, update the affected document(s) and the roadmap in the same change.

## Repository layout (target, see 05 §4)

```text
packages/   core · content · app · protocol · testkit · host-web · host-node   (framework)
reference/  content (ref.tier, ref.tier.presentation) · client-web            (reference implementation)
fixtures/   content (valid/invalid) · scenarios                               (theme-free test data)
tools/      trace · golden
openspec/   specs · changes
```

## Commands

Once M0 (`setup-workspace`) has landed, the workspace uses pnpm via corepack:

```sh
corepack enable
pnpm install
pnpm verify            # format check, lint, dependency rules, type-check, tests
pnpm test              # unit, property (PR budget), scenario tests
pnpm test:browser      # determinism replay in browser mode
pnpm trace             # requirement traceability report
pnpm golden:update <scenario>   # only with an explained, reviewed reason
pnpm --filter @aesfw-ref/client-web dev
pnpm aesfw validate reference/content/ref.tier --strict
```

If a command does not exist yet, check the roadmap milestone that introduces it. Do not invent ad-hoc substitutes.

## Coding conventions (summary of 05 §25)

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`.
- Plain data and functions in pure packages. Use discriminated unions with exhaustive switches.
- Use `camelCase` in code and `snake_case` at data boundaries (YAML, saves, wire DTOs). Event and command types are `PascalCase`.
- System modules are named `phase-NN-<name>.ts`, and every system declares its `reads` and `writes`.
- Exported functions in pure packages carry TSDoc naming the requirement IDs they implement.
- Expected failures are `Result`s or diagnostics. Throw only `InvariantViolation` for defects.
- Comment only what needs clarification.

## Testing expectations (summary of 06)

- Test titles start with requirement tags: `it('[GDD-12.3] …')`.
- Every system has L1 unit tests using `runPhases` and testkit builders, covering the nominal path, every block or rejection code, boundaries, ordering, and paused or inactive exclusion (06 §5.3).
- Integration, property, and scenario tests run `checkInvariants` after every tick.
- New behavior that affects state adds or extends a scenario, and determinism harnesses (double-run, clone-run, save-continue) must pass.
- Client tests target pure selectors. DOM and end-to-end tests are smoke-level.
- Follow the definition of done in 06 §17 before calling a change complete.

## When in doubt

- Prefer the stricter reading of a specification and record the interpretation in the change's `design.md`.
- Ask the user before changing anything in 01–04, versioned algorithms, the save format, or the protocol version.
- Do not start work on a roadmap row whose dependencies are not archived.
