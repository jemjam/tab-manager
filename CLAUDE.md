# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**tab-man** — a browser extension for managing tabs, built as a side panel. Uses WXT (browser extension framework) with React 19, Tailwind CSS v4, and TypeScript.

## Commands

All commands run from `extension/`:

```sh
pnpm dev              # Dev mode (Chromium)
pnpm dev:firefox      # Dev mode (Firefox)
pnpm build            # Production build
pnpm compile          # Type-check (tsc --noEmit)
pnpm e2e              # Playwright e2e tests (requires build first)
```

E2E tests need a built extension at `extension/.output/chrome-mv3`. Run `pnpm build` before `pnpm e2e`.

## Architecture

- **Framework:** WXT (`wxt.config.ts`) with React module and Tailwind v4 Vite plugin
- **Entrypoints:**
  - `entrypoints/background.ts` — service worker; opens side panel on action click
  - `entrypoints/sidepanel/` — React app (single `App.tsx` component) that lists, filters, selects, copies, and closes browser tabs
- **Styling:** Tailwind v4 with system-color-based theme tokens in `App.css` (respects `light-dark()` / `color-scheme`)
- **Browser APIs used:** `browser.tabs`, `browser.sidePanel`, `browser.windows`
- **E2E tests:** Playwright with custom fixtures (`e2e/fixtures.ts`) that launch Chromium with the built extension loaded. Tests use `data-*` attributes as selectors.
- **Dev profile:** Chromium dev profile persisted at `extension/.dev-profile/` (gitignored)
