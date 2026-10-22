# Tasks

## 1. Build config (design D1, D2, D3)

- [x] 1.1 Set `base` from `VITE_BASE` and `build.outDir` to `dist-web` in `reference/client-web/vite.config.ts`.
- [x] 1.2 Add a `build:pages` script and ignore `dist-web/` in `.gitignore`.

## 2. Workflow (design D4)

- [x] 2.1 Add `.github/workflows/pages.yml`.

## 3. Repository and Pages (design D5)

- [x] 3.1 Switch the repository to public and enable Pages with `build_type: workflow`.

## 4. Verification (design D6)

- [x] 4.1 Build with `VITE_BASE=/AESFW/` and assert `dist-web/index.html` references `/AESFW/assets/`. [REF-14.6]
- [x] 4.2 Run the workflow and load the Pages URL; confirm the shell becomes ready and the tick advances.

## 5. Documentation and verification

- [x] 5.1 Add a roadmap row 2.12 recording the deployment.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green.

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.12 with "✓ archived <date>" in `docs/08`.
