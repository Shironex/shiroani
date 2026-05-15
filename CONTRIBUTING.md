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

## Releases & versioning

Versions are bumped via `scripts/bump-version.mjs` — do not edit `package.json` versions by hand. Release notes live in `docs/release-v*.md` (local, gitignored copy-paste scratch) and the user-facing bilingual content under `packages/changelog/`.

## License

By contributing, you agree your contributions are licensed under the project's [LICENSE](LICENSE) — a source-available license that does not permit redistribution, reselling, or derivative works.
