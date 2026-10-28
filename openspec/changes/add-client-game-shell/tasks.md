# Tasks

## 1. Presentation data pipeline

- [ ] 1.1 Add `scripts/gen-presentation.mjs` emitting `src/content/generated/presentation.json` from `ref.tier.presentation` and wire it to `prebuild`; verify the file is generated and diff-checked in `pnpm verify` [REF-14.4].
- [ ] 1.2 Extend `createI18n` and formatting to consume per-resource scale, decimals, and `/min` rate unit from the generated data; verify [REF-14.4] unit tests including the empty-package fallback.

## 2. Content bundle repair

- [ ] 2.1 Replace `src/content/r0.ts` with a split-file enumeration of `ref.tier` and `ref.tier.presentation` as `ContentSourceDto`s; verify the worker initialises and the content checksum covers both packages [REF-5, REF-14.4].

## 3. HUD frame

- [ ] 3.1 Implement `views/hud/frame.ts` with the six fixed regions and `style/tokens.css` additions (`--sea`, role/tier tokens, HUD layout); verify the [REF-11] layout test at 1280×800 and 1024 px.
- [ ] 3.2 Implement the action bar (controls, tick, blocked count, window toggles, save/load, table mode, debug) with `control` commands; verify the [REF-11, REF-13.2] tick-advance test.
- [ ] 3.3 Implement `window-host.ts` and re-host the economy, planning, logistics, exchange, and population views unchanged; verify Escape closes and the `E/P/L/X/V` keys still toggle [REF-12.4].
- [ ] 3.4 Implement the resource bar selector (balance, net rate, viewed-location chips, construction defaults, pins) and its view; verify [REF-11] scenarios for balance/net-rate and chip formatting.
- [ ] 3.5 Implement the location banner selector (code, region, ownership, slots, suitability; unknown renders nothing); verify [REF-11] banner scenarios including the empty case.

## 4. View state and storage

- [ ] 4.1 Move client-local persistence to `aesfw-ref.client.v2` with camera, pinned resources, open windows, locale, and theme; verify the persistence tests and that discarding storage never affects the session [REF-14.5, PIC-16].

## 5. Removal and tests

- [ ] 5.1 Delete the top bar, drawer chrome, notice strip, and their styles; verify no dashboard `data-testid` remains and the [REF-11] "dashboard gone" scenario passes.
- [ ] 5.2 Update selector/unit tests for the re-hosted views and run smoke flows 1–6 against the new shell; verify flows 1, 2, 4, 6 green [VER-13.2].
- [ ] 5.3 Verify dependency-cruiser still reports no framework imports beyond `@aesfw/protocol` and `@aesfw/host-web/client` [TDS-4.3, REF-2].

## 6. Documentation and verification

- [ ] 6.1 No 01–07 amendment expected; record any clarification in this design. Update 08 only if scope shifted.
- [ ] 6.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
