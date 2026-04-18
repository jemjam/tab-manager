---
artifact: prd
version: "1.0"
created: 2026-04-18
status: draft
---

# PRD: Filter & Selection Improvements

## Overview

### Problem Statement

When using the filter to search tabs, matching rows appear but there is no
visual indication of _where_ the search term appears within each row's title or
URL. Users must re-read each result to confirm why it matched.

### Solution Summary

Highlight every occurrence of the active filter term inside the title and URL
text of each matching tab row. Uses a `<mark>`-based inline highlight styled
with a new theme color token.

### Target Users

All tab-man users who use the filter input.

## Goals & Success Metrics

### Goals

1. Make it immediately obvious why each row matched the filter.
2. Keep the implementation minimal — one small component, one theme token.

### Non-Goals

- Fuzzy / regex highlighting.
- Highlighting across other UI surfaces (context menus, tooltips, etc.).
- Persisting or bookmarking highlighted state.

## User Stories

| ID   | User Story                                                                                         | Priority |
| ---- | -------------------------------------------------------------------------------------------------- | -------- |
| US-1 | As a user, I want matched text highlighted so I can instantly see why a tab appeared in the results | P0       |
| US-2 | As a user, I want the highlight to respect my system theme (light/dark)                            | P0       |
| US-3 | As a user, I want to see "All NN tabs" when unfiltered and "XX of NN tabs" when filtered so I know the result count at a glance | P1 |
| US-4 | As a user, I want the filter to feel responsive without re-rendering on every keystroke            | P1       |
| US-5 | As a user, I want the bulk actions dropdown disabled when nothing is selected so I don't open an empty/disabled menu | P1 |
| US-6 | As a user, I want to Ctrl+click a row to toggle its selection without using the checkbox           | P1       |
| US-7 | As a user, I want to Shift+click a row to invert selection on all rows between it and the last Ctrl+clicked row | P1 |

## Scope

### In Scope

- New `--color-highlight` theme token in `App.css` using `light-dark()`.
- A `<Highlight>` component that splits text on the filter term (case-insensitive) and wraps matches in `<mark>`.
- Apply `<Highlight>` to the title and URL text in each tab row.
- Tab count summary text below the filter input: "All NN tabs" when unfiltered,
  "XX of NN tabs" when a filter is active.
- Debounce the filter input's `onChange` handler (~100ms from last keystroke).
- Empty selection state: show "0 selected" (muted) and disable the bulk actions
  dropdown button entirely.
- Ctrl+click on a tab row toggles that row's selection.
- Shift+click on a tab row inverts selection on all rows between the clicked row
  and the last Ctrl+clicked row (range invert). Requires tracking the last
  Ctrl+clicked anchor row.

### Out of Scope

- Changes to filter logic or matching behavior.
- Animating or transitioning the highlight.
- Highlighting in any UI outside the tab list rows.

### Future Considerations

- Regex / fuzzy match highlighting — deferred until filter supports those modes.

## Solution Design

### Functional Requirements

#### Highlighting

- FR-1: When a filter term is active, all case-insensitive occurrences of that
  term within the title and URL of each visible row MUST be wrapped in a
  `<mark>` element.
- FR-2: The `<mark>` element MUST use the `--color-highlight` token as its
  background color, with no default browser `<mark>` styling leaking through.
- FR-3: When the filter is empty, text MUST render as plain text with no
  wrapper elements.

#### Tab Count Summary

- FR-5: When the filter is empty, a line below the filter input MUST read
  "All NN tabs" where NN is the total tab count.
- FR-6: When a filter is active, that line MUST read "XX of NN tabs" where XX
  is the number of visible (matched) rows and NN is the total.

#### Filter Debounce

- FR-7: The filter input's onChange handler MUST be debounced with a ~100ms
  delay from the last keystroke before updating the filter state.

#### Empty Selection State

- FR-8: When 0 tabs are selected, the selection label MUST read "0 selected"
  in a muted/grayed-out style.
- FR-9: When 0 tabs are selected, the bulk actions dropdown button MUST be
  fully disabled (`disabled` attribute) so the menu cannot activate.

#### Ctrl+Click Row Selection

- FR-10: Ctrl+clicking (Cmd+click on macOS) anywhere on a tab row MUST toggle
  that row's selected state, equivalent to toggling its checkbox.
- FR-11: Each Ctrl+click MUST update a stored "anchor" reference to that row,
  used as the starting point for Shift+click range operations.

#### Shift+Click Range Invert

- FR-12: Shift+clicking a tab row MUST invert the selection state of every row
  between the clicked row and the current anchor row (inclusive of the clicked
  row, exclusive of the anchor which was already toggled).
- FR-13: If no anchor exists (no prior Ctrl+click in this session), Shift+click
  SHOULD behave as a regular Ctrl+click (toggle + set anchor).
- FR-14: The anchor MUST persist across Shift+clicks — only Ctrl+click updates
  it.

#### Theming

- FR-4: `--color-highlight` MUST be defined in the `@theme` block in `App.css`
  using `light-dark()` to provide appropriate values for both color schemes.

### User Experience

- Highlight color: yellow-ish in light mode, a toned-down gold/amber in dark
  mode — enough contrast to stand out without clashing with existing accent
  blues.
- The highlight should feel like a text marker, not a selection.

### Edge Cases

| Scenario                         | Expected Behavior                                              |
| -------------------------------- | -------------------------------------------------------------- |
| Filter term appears multiple times in one field | All occurrences highlighted                     |
| Filter matches in title but not URL             | Only title shows highlights; URL renders plain  |
| Filter matches in URL but not title             | Only URL shows highlights; title renders plain  |
| Tab has no title (falls back to URL)            | Highlight applied to the URL shown in the title slot |
| Filter is a single character                    | All occurrences of that character highlighted   |
| Filter contains regex-special chars (e.g. `.`)  | Treated as a literal string, not regex          |
| Zero tabs match the filter                      | Summary reads "0 of NN tabs"                    |
| Only one tab total                              | Summary reads "All 1 tabs" / "1 of 1 tabs"      |
| 0 selected, user clicks dropdown                | Button is disabled; menu does not open           |
| Ctrl+click same row twice                        | Selects then deselects (toggle)                  |
| Shift+click with no prior Ctrl+click             | Falls back to Ctrl+click behavior (toggle + set anchor) |
| Shift+click when anchor row is filtered out      | Falls back to Ctrl+click behavior                |
| Shift+click range spans filtered-out rows        | Only visible rows in the range are affected       |
| Ctrl+click on macOS                              | Cmd+click triggers the same behavior              |

## Technical Considerations

### Constraints

- Must work within the existing Tailwind v4 + `light-dark()` theming setup.
- `<mark>` default UA styles should be reset so the token controls appearance.

### Implementation Notes

- `Highlight` component: accepts `text` and `term` props. When `term` is
  empty, returns `text` as-is. Otherwise splits on a case-insensitive regex
  (with escaped special chars) and interleaves `<mark>` elements.
- Applied at lines ~492-505 of `App.tsx` where title and URL are currently
  rendered as plain text.
- Selection anchor: a `useRef` holding the tab ID of the last Ctrl+clicked row.
  Reset to `null` on clear-selection or when the referenced tab disappears.
- Row click handler: inspect `e.ctrlKey || e.metaKey` for toggle,
  `e.shiftKey` for range invert. Plain clicks without modifiers remain
  unchanged (no accidental selection).

## Open Questions

_None — scope is small and agreed upon._
