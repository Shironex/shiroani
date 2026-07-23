# Dependency Safety Report

**Date:** 2026-07-23
**Agent:** kirei-deps
**Depth:** standard
**Package manager:** pnpm 10.9.0 (single `pnpm-lock.yaml`, workspace: `apps/*`, `packages/*`)
**Scope:** direct + transitive (npm ecosystem only — no Python/Rust/Go/Ruby manifests present in this repo)

## Summary

`pnpm audit` found **35 advisory instances** (2 critical, 12 high, 18 moderate, 3 low) across 2,050 resolved packages. The repo already runs a mature "CVE pin" override system in `pnpm-workspace.yaml` (4 prior "clear all N advisories" commits, most recent 2026-07-05) — most open findings are simply this override list going stale again, not new architectural exposure. GitHub Dependabot is authenticated and reachable but is **currently blind to 10 of the 14 critical/high issues** found locally (see below) — do not treat Dependabot's alert count as authoritative right now. Top blocker: `@vitest/browser` 4.1.9 (direct devDependency of `apps/web`) has a **critical** file-access permission-gate bypass, fixed in 4.1.10 — a same-range patch bump.

## Audit Results

| Severity | Count | Direct | Transitive |
|---|---|---|---|
| Critical | 2 | 1 | 1 |
| High | 12 | 1 | 11 |
| Moderate | 18 | 3 | 15 |
| Low | 3 | 2 | 1 |

Direct-dependency severity is deceptively low here because most of the transitive tree is already governed by explicit overrides in `pnpm-workspace.yaml` — meaning most "transitive" rows below are one-line override edits, not multi-hop dependency surgery.

### Critical / High Findings

| Package | Current | Vulnerable Range | Fixed In | CVE / GHSA | Direct? | Path |
|---|---|---|---|---|---|---|
| `@vitest/browser` | 4.1.9 | `>=4.0.0 <4.1.10` | 4.1.10 | GHSA-p63j-vcc4-9vmv | **yes** (apps/web devDep) | `apps__web>@vitest/browser` |
| `tar` | 7.5.16 | `<=7.5.18` | 7.5.19 | CVE-2026-59873 / GHSA-23hp-3jrh-7fpw | no | `apps__desktop>@electron/rebuild>node-gyp>tar` |
| `tar` | 7.5.16 | `<=7.5.17` | 7.5.18 | CVE-2026-59874 / GHSA-8x88-c5mf-7j5w | no | same chain |
| `sharp` | 0.33.5 | `<0.35.0` | 0.35.0 | GHSA-f88m-g3jw-g9cj (libvips CVE-2026-33327/33328/35590/35591) | **yes** (apps/landing-demo dep) | `apps__landing-demo>sharp` |
| `sharp` | 0.34.5 | `<0.35.0` | 0.35.0 | same advisory | no | `apps__landing>astro>sharp` |
| `brace-expansion` | 5.0.6, 2.0.3, 1.1.13 (3 resolutions) | version-specific | 5.0.7 / 2.1.2 / 1.1.16 | CVE-2026-13149 / GHSA-3jxr-9vmj-r5cp | no | root `eslint`; `apps/bot` jest chain (x2) |
| `js-yaml` | 4.2.0 | `>=4.0.0 <4.3.0` | 4.3.0 | CVE-2026-59869 / GHSA-52cp-r559-cp3m | no | `.>@commitlint/cli>...>cosmiconfig>js-yaml` |
| `shell-quote` | 1.8.4 | `<=1.8.4` | 1.9.0 | CVE-2026-13311 / GHSA-395f-4hp3-45gv | no | `.>concurrently>shell-quote` |
| `svgo` | 4.0.1 | `>=4.0.0 <4.0.2` | 4.0.2 | GHSA-2p49-hgcm-8545 (removeScripts leaves executable scripts) | no | `apps__landing>astro>svgo` |
| `fast-uri` | 3.1.2 | `<=3.1.3` | 3.1.4 | CVE-2026-16221 / GHSA-v2hh-gcrm-f6hx | no | `.>commitlint>...>ajv>fast-uri` |
| `fast-uri` | 3.1.2 | `>=3.0.0 <3.1.3` | 3.1.3 | CVE-2026-13676 / GHSA-4c8g-83qw-93j6 | no | same chain |
| `axios` | 1.16.0 | `>=1.15.2 <1.18.0` | 1.18.0 | GHSA-gcfj-64vw-6mp9 (inherited proxy after interceptor clone) | no | `.>wait-on>axios` |

**Impact notes:**
- `@vitest/browser` — bypasses the file-access permission gate in Vitest's Browser Mode provider. Dev-only (test runner), but worth closing before this is exploited via a malicious test dependency or CI supply-chain attack. Fix is same-range (`^4.1.9` already allows 4.1.10).
- `tar` (critical CVE-2026-59873, decompression/parse DoS) — only reachable through `@electron/rebuild` → `node-gyp`, a build-time-only tool (`apps/desktop` devDependency, used for native module rebuilds). Not shipped in the packaged app.
- `sharp` — two separate resolutions in the tree. `apps/landing-demo`'s **direct** dependency is pinned `^0.33.5`, which cannot resolve to 0.35.x on its own (0.x caret semantics) — needs a manual `package.json` version bump, not just a lockfile refresh. `apps/landing`'s transitive copy (via `astro`) is governed by astro's own `optionalDependencies` range `^0.34.0 || ^0.35.0`, which already permits 0.35.x — a plain lockfile refresh should pick up the fix there.
- `brace-expansion` — this is the *second* round of brace-expansion CVEs this repo has patched (see `pnpm-workspace.yaml` history). The existing overrides pin **exact** versions (`1.1.13`, `2.0.3`, `5.0.6`), which is why the new CVE (CVE-2026-13149, exponential-time expansion) wasn't auto-absorbed — exact pins don't move on lockfile refresh, they need the pinned target value itself raised.
- `js-yaml` v4 chain — **not covered by the existing override**. The repo already has `'js-yaml@3': '>=3.15.0'` (deliberately scoped to leave `@istaAnbuljs/load-nyc-config` on v3, per commit `9fc58583`), but the vulnerable instance here is v4 (pulled by `@commitlint/cli`'s `cosmiconfig`). `cosmiconfig`'s own declared range (`^4.1.0`) already permits the patched 4.3.0, so this is likely a stale-lockfile issue rather than an override gap — verify with a scoped refresh.
- `fast-uri` — **override risk flag**: the current override (`fast-uri: '>=3.1.2'`) has no upper bound. `ajv@8.20.0` (the consumer, via commitlint's `ajv-formats`) declares `fast-uri: ^3.0.1`. npm's published `fast-uri` latest is now **4.1.1** (a new major). An unbounded floor override risks a future `pnpm update` silently jumping fast-uri to v4 against ajv's own compatibility range, which could break URI validation behavior tree-wide. Recommend tightening to `'>=3.1.4 <4'` when raising the floor.

## Dependabot Alerts

`gh` is authenticated (Shironex) and `repos/Shironex/shiroani` is reachable. Fetched 135 total alert records; **9 currently open**:

| GHSA | Package | Severity | Fixed In | Relationship |
|---|---|---|---|---|
| GHSA-v422-hmwv-36x6 | body-parser | low | 2.3.0 | transitive |
| GHSA-f48w-9m4c-m7f5 | astro | medium | 7.0.6 | inconclusive |
| GHSA-7pw4-f3q4-r2p2 | astro | low | 7.0.4 | inconclusive |
| GHSA-3jxr-9vmj-r5cp | brace-expansion | high | 5.0.7 | transitive (dev) |
| GHSA-4g3v-8h47-v7g6 | astro | medium | 7.1.0 | inconclusive |
| GHSA-8mv7-9c27-98vc | astro | medium | 7.0.6 | inconclusive |
| GHSA-gcfj-64vw-6mp9 | axios | high | 1.18.0 | transitive (dev) |
| GHSA-f4gw-2p7v-4548 | axios | medium | 1.18.0 | transitive (dev) |
| GHSA-xj6q-8x83-jv6g | axios | medium | 1.18.0 | transitive (dev) |

**Cross-reference gap (important):** Dependabot's open-alert list is missing **10 of the 14 critical/high `pnpm audit` findings** entirely — no record at all (open, fixed, or otherwise) for `js-yaml` (CVE-2026-59869), `shell-quote` (CVE-2026-13311), `svgo` (GHSA-2p49-hgcm-8545), `sharp` (GHSA-f88m-g3jw-g9cj), or the two `fast-uri` CVEs. For `tar`, `hono`, `@hono/node-server`, `dompurify`, and `@vitest/browser`, Dependabot only has *older, already-fixed* advisories on file — the brand-new CVEs on those same packages (e.g. the critical `tar` DoS, the critical `@vitest/browser` bypass) are absent. The committed `pnpm-lock.yaml` (last touched 2026-07-05, matches working tree exactly) is what Dependabot's dependency graph is scanning, so this isn't a stale-graph problem — it looks like GitHub's advisory ingestion simply hasn't caught up to these very recent GHSAs yet. **Treat `pnpm audit` as the more current source right now; don't assume Dependabot's alert count is complete.**

## Safe Bumps

Suitable for `kirei-stitch` as a single mechanical PR. Split into two mechanisms since this repo manages transitive CVEs via `pnpm-workspace.yaml` overrides rather than direct bumps.

### A. Direct `package.json` bumps (patch/minor, in-range)

| Package | Current | Target | Type | Resolves CVE? | Notes |
|---|---|---|---|---|---|
| `@vitest/browser` | 4.1.9 | 4.1.10 | patch | yes — critical GHSA-p63j-vcc4-9vmv | in-range (`^4.1.9`); bump alongside `vitest`/`@vitest/coverage-v8` to keep the vitest family in lockstep |
| `@vitest/browser-playwright` | 4.1.9 (exact pin) | 4.1.10 | patch | indirectly (keeps vitest family aligned) | **pinned exact, no caret** — needs an actual `package.json` edit, not just a lockfile refresh; must match `vitest`'s version |
| `vitest` | 4.1.9 | 4.1.10 | patch | no (companion bump) | in-range (`^4.1.9`) |
| `@vitest/coverage-v8` | 4.1.9 | 4.1.10 | patch | no (companion bump) | in-range (`^4.1.9`) |
| `dompurify` | 3.4.11 | 3.4.12 | patch | yes — low GHSA-c2j3-45gr-mqc4 | in-range (`^3.4.11`); direct in both `apps/web` and `apps/desktop`, bump both |
| `astro` | 7.0.0 | 7.1.3 | minor | yes — 3 moderate + 1 low (GHSA-4g3v-8h47-v7g6, GHSA-8mv7-9c27-98vc, GHSA-f48w-9m4c-m7f5, GHSA-7pw4-f3q4-r2p2) | in-range (`^7.0.0`); changelog reviewed, no `BREAKING` markers between 7.0.0–7.1.3 |
| `sharp` | 0.33.5 | 0.35.x | **requires range edit** | yes — high GHSA-f88m-g3jw-g9cj (libvips CVEs) | `apps/landing-demo`'s spec is `^0.33.5`, which does **not** cover 0.35.x under 0.x caret semantics — this needs the version *spec* changed to `^0.35.0`, not just a lockfile refresh. Low risk (sharp 0.33→0.35 has no known breaking API changes for basic resize/format use), but flag it as a spec edit, not a pure patch |

Also 85 other outdated direct deps exist repo-wide (39 patch, 40 minor, 6 major per `pnpm outdated -r`) with no CVE pressure — routine drift, not urgent. Full list available on request (deep-depth Step 5 territory); notable ones already patch-level and safe: `@nestjs/*` 11.1.27→11.1.28, `@radix-ui/*` family, `react`/`react-dom` 19.2.6→19.2.8, `playwright` 1.61.0→1.61.1.

### B. `pnpm-workspace.yaml` override bumps (transitive, mechanism this repo already uses)

| Override key | Current value | Needs to become | Resolves | Note |
|---|---|---|---|---|
| `tar` | `>=7.5.16` | verify resolves to >=7.5.19 on refresh (no ceiling — likely just a stale-lockfile refresh, not an edit) | critical + 2 high tar CVEs | re-audit after `pnpm update tar` in `apps/desktop` scope before assuming an edit is needed |
| `axios` | `>=1.15.2` | verify resolves to >=1.18.0 on refresh (no ceiling) | 1 high + 5 moderate axios advisories | same — likely stale-lockfile, confirm before editing |
| `fast-uri` | `>=3.1.2` | `>=3.1.4 <4` | 2 high fast-uri CVEs | **edit needed** — also tightens an unbounded floor that risks a future major-version jump breaking `ajv@8.20.0` (which wants `^3.0.1`) |
| `shell-quote` | `>=1.8.4` | verify resolves to >=1.9.0 on refresh (no ceiling) | 1 high | likely stale-lockfile |
| `hono` | `>=4.12.21 <5` | `>=4.12.27 <5` | 3 moderate hono CVEs | **edit needed** — ceiling `<5` already fine, just raise floor |
| `js-yaml@3` | `>=3.15.0` | **do not touch** — this is scoped to v3 only, protecting `@istanbuljs/load-nyc-config` per commit `9fc58583`. The vulnerable instance is v4 via `cosmiconfig`, outside this override's scope. | n/a | verify v4 resolves via `cosmiconfig`'s own `^4.1.0` range on refresh instead |
| `brace-expansion@<1.1.13`→`1.1.13` | exact pin | retarget to `1.1.16`, selector `brace-expansion@<1.1.16` | high (CVE-2026-13149) | **edit needed** — exact pins don't move on refresh |
| `brace-expansion@>=2.0.0 <2.0.3`→`2.0.3` | exact pin | retarget to `2.1.2`, selector `brace-expansion@>=2.0.0 <2.1.2` | same CVE | **edit needed** |
| `brace-expansion@>=5.0.0 <5.0.6`→`5.0.6` | exact pin | retarget to `5.0.7`, selector `brace-expansion@>=5.0.0 <5.0.7` | same CVE | **edit needed** |
| `svgo` | not present | add `svgo: '>=4.0.2'` | 1 high (GHSA-2p49-hgcm-8545) | new override; astro's own range (`^4.0.1`) already permits 4.0.2, so this may also resolve on plain refresh — add the override defensively if a refresh doesn't pick it up |
| `body-parser` | not present | likely unnecessary | 1 low | `express@5.2.1`'s own range (`^2.2.0`) already permits patched 2.3.0 — should resolve on a plain refresh, no override needed |
| `@hono/node-server` | `>=1.19.13 <2` | needs `>=2.0.5` — **major version jump** | 1 moderate (path traversal on Windows via `%5C`) | **not a simple override widen.** The `<2` ceiling looks deliberate (raised alongside `hono` in commit `6918cf41`). This CVE only affects `serve-static` on Windows and only in `@prisma/dev`'s local dev-database tooling (devDependency of `apps/bot`, not shipped runtime). Verify `prisma dev` still works against `@hono/node-server` 2.x before raising the ceiling — treat as a small spike, not a blind bump |

**Recommended sequencing:** run a plain `pnpm update` (respecting existing ranges/overrides) first and re-audit — several of the above may already resolve without touching `pnpm-workspace.yaml` at all, since most overrides currently have no upper ceiling. Only edit the override file for the rows marked "edit needed" above.

## Verification

- Re-run `pnpm audit` after applying Section A + B bumps; expect the 2 critical / 12 high findings to clear except `@hono/node-server`'s (tracked separately, see below) and confirm no severity count regresses.
- `pnpm typecheck` and `pnpm test` must stay green — this repo's `typecheck` script builds `packages/shared` first; rebuild it if `@shiroani/shared` is touched (not expected here).
- Vitest family bump (`vitest`/`@vitest/browser`/`@vitest/browser-playwright`/`@vitest/coverage-v8`): run the `apps/web` Storybook/Vitest browser-mode test suite once to confirm the four packages stay version-locked and browser-mode tests still launch.
- `astro` bump: run `pnpm --filter @shiroani/landing build` and spot-check the download page (platform auto-detect + GitHub API sizing) since that page relies on Astro's build-time SSR paths touched by the XSS/origin-check advisories.
- `sharp` range edit in `apps/landing-demo`: this package is used for Remotion video rendering assets — smoke-test a render locally after bumping (`pnpm --filter @shiroani/landing-demo ...`) since it's a version-spec change, not a pure lockfile refresh.
- `@hono/node-server` major bump: spike separately — run `prisma dev` (or whatever local Postgres proxy workflow `apps/bot` uses) against `@hono/node-server` 2.x before committing to the override ceiling change.

## Tool Gaps Noted

- No Python/Rust/Go/Ruby manifests exist in this repo (`pyproject.toml`, `Cargo.lock`, `go.mod`, `Gemfile.lock` all absent) — audit scope is npm-ecosystem only, which matches the actual stack.
- `pnpm audit`'s advisory-count total (35) doesn't equal `len(advisories)` (34) because some GHSAs (e.g. `sharp`'s libvips advisory) apply across two independent resolved versions in the tree (direct + transitive) — each counted separately in severity totals. Noted here so the numbers in this report reconcile with a raw `pnpm audit --json` re-run.

## Out of Scope

- Dev-only tooling exposure that never ships (e.g. `@electron/rebuild`'s `node-gyp`→`tar` chain, `@prisma/dev`'s `hono` chain, root `eslint`/`concurrently`/`commitlint` chains) was still reported above since it's part of `pnpm audit`'s output, but these carry materially lower real-world risk than anything reachable from `apps/desktop`'s or `apps/web`'s shipped runtime bundle. None of the critical/high findings here are in the Electron main-process or renderer production bundle except `@vitest/browser` (test-only) and `sharp` (build-time image processing, not shipped).
- Deep-depth items skipped per requested scope: full 85-package outdated map, transitive-CVE-fix phase plan, and risky-major migration ordering (`electron` 41.10.0→43.2.0, `typescript` 5.9.3→7.0.2, `electron-store` 8.2.0→11.0.2, `better-sqlite3` 12.11.1→13.0.1, `@types/node` 25→26, `@testing-library/jest-dom` 6→7 — six majors flagged by `pnpm outdated` but not investigated at this depth). Re-run at `deep` depth if these need a migration plan.
