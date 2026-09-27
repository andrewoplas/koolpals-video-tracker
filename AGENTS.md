# Repository Guidelines

## Project Structure & Module Organization

This browser extension tracks watched Koolpals episodes using WXT, React 19, and TypeScript.

- `entrypoints/` contains the background script and site-specific content scripts for Koolpals and YouTube; `content.ts` is a Google-matching template script.
- `entrypoints/popup/` contains the popup UI and styles.
- `components/Overlay.tsx` and `Overlay.css` implement watched-status badges.
- `utils/storage.ts` manages watched IDs, subscriptions, and optional browser sync.
- `assets/` holds imported images; `public/` holds static assets and extension icons.
- `wxt.config.ts` defines modules and manifest permissions. `.wxt/` and `.output/` are generated and ignored.

## Build, Test, and Development Commands

- `npm ci`: install locked dependencies; the postinstall hook runs `wxt prepare`.
- `npm run dev`: start WXT development for Chrome.
- `npm run dev:firefox`: start development for Firefox.
- `npm run compile`: check TypeScript without emitting files.
- `npm run build` / `npm run build:firefox`: produce browser-specific builds.
- `npm run zip` / `npm run zip:firefox`: package extensions for distribution.

## Coding Style & Naming Conventions

Use TypeScript and functional React components with hooks. Prefer two-space indentation, single-quoted TypeScript strings, and semicolons; preserve surrounding formatting in existing files. Use PascalCase for components, camelCase for functions and variables, and WXT's `*.content.ts` convention for content scripts. Use `@/` for repository-root imports. No ESLint or Prettier configuration is currently present.

## Testing Guidelines

Tests use Node’s built-in runner; no coverage threshold is configured. Run `node --experimental-strip-types --test tests/library.test.ts`, then `npm run build` and `node --test tests/background.test.mjs`. Run `npm run compile` and the relevant browser build before submitting changes. Manually verify toggles, counts, embeds, history import, and reload persistence. For storage changes, check sync enable/disable merges without losing IDs. Document browser versions, steps, and results in the PR.

## Commit & Pull Request Guidelines

History uses short descriptive subjects such as `Add browser sync option for cross-device data syncing`; no enforced prefix is evident. Keep commits focused. PRs should explain the behavior change, link relevant issues, describe validation, and include screenshots for UI changes. Highlight storage or permission changes.

## Implementation & Privacy

Inspect the affected event path before editing. Minimize DOM scans, storage reads, writes, and duplicate processing. Ask before implementing an unclear architecture or meaningful performance tradeoff. Preserve unrelated working-tree changes. Keep host permissions narrow and update `PRIVACY_POLICY.md` when data handling changes.

## UI Design

Follow [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) and reuse `styles/tokens.css` for UI changes. Keep host-page styles scoped.
