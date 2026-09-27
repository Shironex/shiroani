# Contributing to ShiroAni

Thanks for the interest! This document covers everything you need to build ShiroAni from source.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 10
- A C++ compiler (Xcode Command Line Tools on macOS, Visual Studio Build Tools on Windows)

## Quick start

```bash
git clone https://github.com/Shironex/shiroani.git
cd shiroani
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm dev           # Development mode
pnpm dev:debug     # Debug mode with verbose logging
pnpm lint          # Run linter
pnpm format        # Format code
pnpm format:check  # Check formatting
pnpm typecheck     # Type check
pnpm test          # Run tests
pnpm build         # Build the app
pnpm package:win   # Package for Windows
pnpm package:mac   # Package for macOS
```

## Project structure

```
shiroani/
├── apps/
│   ├── desktop/          # Electron + NestJS backend
│   └── web/              # React + Vite frontend
├── packages/
│   ├── shared/           # Shared types, constants, utilities
│   └── changelog/        # Bilingual in-app changelog content
├── scripts/              # Build and version scripts
├── docs/                 # Documentation and release notes
└── assets/               # Logo, screenshots
```

## Tech stack

|           |                                              |
| --------- | -------------------------------------------- |
| Desktop   | Electron 41                                  |
| Backend   | NestJS 11 (embedded)                         |
| Frontend  | React 18, Vite 8, Tailwind CSS 4             |
| i18n      | i18next 26, react-i18next 17                 |
| Database  | better-sqlite3                               |
| Rich Text | TipTap 3                                     |
| UI        | Radix UI, Lucide Icons, DnD Kit              |
| Real-time | Socket.IO 4                                  |
| State     | Zustand 5                                    |
| Native    | C++ overlay module (node-addon-api, Windows) |
| Updates   | electron-updater (Windows)                   |
| Quality   | ESLint, Prettier, Husky                      |
| Tests     | Jest, Vitest                                 |
| CI/CD     | GitHub Actions                               |

## Refreshing README screenshots

`pnpm showcase` regenerates every screenshot with [`@noctcore/showcase-kit`](https://www.npmjs.com/package/@noctcore/showcase-kit). It needs no running app and no account: it builds the web renderer with `vite build --mode showcase`, which replaces the Electron bridge and the backend socket with invented fixture data (`apps/web/src/showcase`), then captures every view in English and Polish in a headless Chromium with a frozen clock.

It writes:

- `assets/screenshots/<lang>/<view>.png`: plain captures, also read by the Remotion demo reel (`apps/landing-demo`);
- `assets/showcase/<lang>/<view>.webp`: framed images embedded in the READMEs;
- `assets/showcase/hero.<lang>.webp`: the README banners;
- `../portfolio/public/projects/shiroani/`: the portfolio set, when the portfolio repo is checked out next to this one.

The capture is configured in `showcase.config.mjs`. After changing captions, `node scripts/showcase-extras.mjs readme en` (or `pl`) prints the screenshot table to paste into `README.md` (or `README.pl.md`). The first run needs a Chromium for Playwright: `pnpm exec playwright install chromium`.

## Refreshing the landing demo reel

The landing page hero is followed by a short Remotion-rendered video reel cycling through the in-app screenshots. It lives in `apps/landing-demo/` and reads the plain `assets/screenshots/<lang>/` PNGs that `pnpm showcase` writes, so refreshing the screenshots covers half the work.

```bash
# Render both locales (MP4 + JPG + AVIF poster) into apps/landing/public/demo/
pnpm --filter @shiroani/landing-demo render

# Single locale
pnpm --filter @shiroani/landing-demo render -- --lang=en

# Iterate on the composition visually
pnpm --filter @shiroani/landing-demo studio
```

Only MP4/H.264 is produced — Remotion's VP9 encoder emitted WebM files with broken stream metadata Chrome refused to decode (`level: -99`, `color_range: pc`), and MP4 plays in every browser anyway. The renderer downloads a headless Chrome shell on first run (~115 MB, cached).

## Releases & versioning

Versions are bumped via `scripts/bump-version.mjs` — do not edit `package.json` versions by hand. Release notes live in `docs/release-v*.md` (local, gitignored copy-paste scratch) and the user-facing bilingual content under `packages/changelog/`.

## License

By contributing, you agree your contributions are licensed under the project's [LICENSE](LICENSE) — a source-available license that does not permit redistribution, reselling, or derivative works.
