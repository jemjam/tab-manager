# tab-man

Browser extension for managing tabs — list, filter, select, copy links, and close tabs from a side panel or full page.

Built with [WXT](https://wxt.dev), React 19, Tailwind CSS v4, and TypeScript. Supports Chrome, Firefox, and Vivaldi.

## Development

```sh
cd extension
pnpm install
pnpm dev            # Chromium
pnpm dev:firefox    # Firefox
```

## Testing

```sh
cd extension
pnpm build && pnpm e2e
```
