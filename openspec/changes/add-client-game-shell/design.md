# Design

## Context

See proposal.md "Why". The client today: `main.ts` mounts a top bar, drawers (`economy`, `planning`, `logistics`, `exchange`, `progression`, tables), a world map + grid toggle, a notice strip, and a debug overlay over a dashboard layout; signals + mirror + pure selectors (07 §14.1–14.2) — this architecture is kept. Content is bundled by raw-importing `ref.tier/*.yaml` texts into `ContentSourceDto`s; the presentation package has never been loaded. 11.1 splits the content files, breaking `src/content/r0.ts`.

## Goals / Non-Goals

**Goals:**

- The REF-11 HUD frame as the only shell, with slots later rows populate.
- Presentation data (names, categories, formatting) flowing from `ref.tier.presentation` into selectors/i18n without breaking the import rule.
- Every existing smoke flow and selector test still passing after the re-host.

**Non-Goals:**

- Canvas, camera, layout, minimap, fog (11.4b); context-panel content (11.4c/11.4d); the final window set and explore/establish (11.4e); news, hints, milestones (11.4f); palette, dark theme, axe (11.4).

## Decisions

### D1. Build-time presentation conversion, not runtime YAML

A Node script (`scripts/gen-presentation.mjs`, run in `prebuild` and as a checked-in task) reads `ref.tier.presentation/*.yaml` with the workspace's `yaml` parser and emits `src/content/generated/presentation.json` (manifest, localization entries, mappings, formatting). The client imports the JSON module.

- *Alternative: parse YAML in the browser.* The client would need a YAML dependency and would re-validate data the CLI already validates (PIC-19); rejected.
- *Alternative: hand-maintained TS mirror.* Drifts from the package; rejected. CI diffs the generated file against the package in the verify task.
- The import rule holds: the generated JSON is client data, not a framework import.

### D2. HUD frame as a static layout, slots as mount points

`views/hud/frame.ts` renders the six regions once (`h()` helpers, CSS grid, `--paper`/`--sea` tokens from REF-10.1). Each region is a mount point receiving a view: the world area hosts today's grid (and later 11.4b's canvas); the minimap slot renders a placeholder until 11.4b; the news slot renders a collapsed rail until 11.4f; the context-panel slot hosts the build palette today (11.4c/11.4d replace it). Views keep the `mount/update/dispose` contract.

### D3. Provisional window host

One `views/hud/window-host.ts` (a floating panel with Escape handling, opened from action-bar toggles) re-hosts the existing drawer views unchanged. Their selectors, keys (`E`, `P`, `L`, `X`, `V`), and tests carry over; only the container changes. 11.4e replaces the hosted content with the §12.4 windows and deletes the leftovers — no throwaway selector code.

### D4. Viewed location

`viewedLocation(mirror, camera)` is a pure selector: at grid/camera depth (this row: while the grid is the world area) the viewed location is the selected/centred location; 11.4b generalizes it to "nearest the camera centre at location level or deeper" (REF-11). The resource bar and banner consume it; unknown locations render no attributes (PIC-9.3), exercised by the existing fog selectors.

### D5. Resource bar data

Balance + net rate from the owner-economy entry (PIC-10.6) as today; chips from the viewed location's summary (PIC-10.2) formatted with the per-resource scale from presentation formatting; defaults are construction-tagged resources (definition metadata tags, PIC-4); pins are client-local view state. No affordability judgments anywhere (A14: display only).

### D6. Content bundling

`src/content/refTier.ts` enumerates the split `ref.tier` files (in `package.yaml` order) and `ref.tier.presentation` files as `ContentSourceDto`s for `init.content` — the worker's loader parses YAML; the client never does. The presentation DTOs are passed too so the content checksum covers both packages.

### D7. Storage key

`aesfw-ref.client.v2` per redesign D6/07 §14.5. The old `v1` key is ignored (view settings are disposable, PIC-16); no migration code.

## Risks / Trade-offs

- [Generated JSON drifts from the package] → CI task regenerates and fails on diff; the file is checked in for reviewable changes.
- [Placeholders feel empty (minimap, news) until 11.4b/11.4f] → acceptable: rows land in sequence; the HUD is usable without them.
- [Re-hosting drawers risks regressions] → selectors are untouched; only container tests change; smoke flows 1–6 re-run.

## Migration Plan

- One release replaces the shell; the Pages workflow is unchanged (2.12). Rollback = revert; client-local `v1` settings are already disposable.
