# Spec Delta

## Purpose

The reference client ships as a subpath-safe static site published to GitHub Pages.

## ADDED Requirements

### Requirement: Subpath-safe static build
The reference client SHALL accept a build-time base path from `VITE_BASE` (default `/`). A build with `VITE_BASE=/AESFW/` SHALL emit an `index.html` and JavaScript bundle whose asset and worker URLs are prefixed with `/AESFW/`, so the site works when served from a project subpath. The web build SHALL be written to `reference/client-web/dist-web`, separate from the TypeScript build output in `dist`.

Source: REF-14.6, TDS-21.1

#### Scenario: A base-path build prefixes assets
- **WHEN** the client is built with `VITE_BASE=/AESFW/`
- **THEN** `dist-web/index.html` references `/AESFW/assets/`

#### Scenario: The default build uses the root
- **WHEN** the client is built without `VITE_BASE`
- **THEN** `dist-web/index.html` references `/assets/`

### Requirement: Pages publication
A GitHub Actions workflow SHALL build the workspace and the reference client with `VITE_BASE=/AESFW/` on every push to `main` and publish `reference/client-web/dist-web` to GitHub Pages.

Source: REF-14.6

#### Scenario: The workflow publishes the client
- **WHEN** a commit is pushed to `main`
- **THEN** the workflow builds the client and deploys `dist-web` to GitHub Pages
