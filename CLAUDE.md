# CLAUDE.md

## Project

**tab-man** — a browser extension for managing tabs. Uses WXT with React 19, Tailwind CSS v4, and TypeScript.

## Commands

All commands run from `extension/`:

```sh
pnpm dev              # Dev mode (Chromium)
pnpm dev:firefox      # Dev mode (Firefox)
pnpm build            # Production build
pnpm compile          # Type-check (tsc --noEmit)
pnpm e2e              # Playwright e2e tests (requires build first)
```

## Architecture

- **Entrypoints:**
  - `entrypoints/background.ts` — service worker; opens side panel, registers context menus
  - `entrypoints/tabs.html/` — main React UI (tab list, filter, selection, bulk actions)
  - `entrypoints/sidepanel/` — thin wrapper that renders the same `tabs.html/App`
- **Styling:** Tailwind v4 with system-color theme tokens in `App.css` (`light-dark()` / `color-scheme`)
- **E2E tests:** Playwright with custom fixtures (`e2e/fixtures.ts`). Tests use `data-*` selectors. Requires `pnpm build` before `pnpm e2e`.
