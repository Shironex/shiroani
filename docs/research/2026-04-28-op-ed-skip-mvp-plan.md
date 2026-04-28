# OP/ED Skip MVP — Implementation Plan

**Date:** 2026-04-28
**Branch:** `feat/op-ed-skip-poc` (will be promoted to MVP work in-place; create a child PR rather than merging POC scaffolding)
**Agent:** kirei (research only — no code changes here)
**Status:** ready for user review, then handoff to kirei-forge

This is the execution plan for "Option B — Start the MVP" in [`2026-04-28-webview-poc-session-handoff.md`](./2026-04-28-webview-poc-session-handoff.md). It builds on the architecture validated in [`2026-04-28-op-ed-skip-feasibility.md`](./2026-04-28-op-ed-skip-feasibility.md) and on the working POC code in `apps/desktop/src/main/browser/player-skip.ts`.

---

## 0. Decisions log (captured 2026-04-28)

User-confirmed answers to the 6 open questions. These overrides supersede the per-decision recommendations elsewhere in the doc.

| #   | Question                                      | Answer                                                                                                                                      |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Library entry without `anilistId`             | **3-tier resolution**: try silent AniList fetch in background → fuzzy title match → fallback `+120s` button. Updates D9 and Task 5.         |
| Q3  | Title normalization for slug↔library matching | **Lowercase + alphanum + hyphen-to-space**. Drives both library lookup and AniList fuzzy match.                                             |
| —   | Auto-resolve confidence threshold             | **Resolve only if top result's normalized similarity > 0.8** (Levenshtein/Jaro-Winkler). Below threshold → fallback button.                 |
| Q4  | Branch strategy                               | **Stay on `feat/op-ed-skip-poc`**. POC commits + dev-mode dock stay as reference.                                                           |
| Q5  | Auto-skip mode                                | **Manual + auto-skip toggle**. `autoSkipEnabled` setting defaults OFF. Toast click is the manual path; auto-skip applies when toggle is on. |
| Q6  | `submitterUuid` generation                    | **Yes, generate now** in settings init. UUID stable from MVP onward; no migration needed when V2 contribution UX lands.                     |
| Q2  | Live shinden URL needed during Task 4         | **Outstanding** — user provides at forge run-time.                                                                                          |

---

## 1. Overview

### What we're building

A read-only AniSkip consumer that injects a Netflix-style skip toast **into the player iframe** (not the renderer overlay) so it survives fullscreen.

### What it replaces

- The POC `PlayerDock` (currently gated behind `devModeEnabled`) graduates from "manual seek dock" to a permanent debug surface. The user-facing flow stops going through it entirely.
- The POC `injectSkipButtonIntoFrame` becomes the basis for two new injectors:
  1. **Contextual skip toast** — appears ~5s before the OP/ED window per AniSkip data, click-to-skip, auto-dismisses after window ends.
  2. **Generic fallback button** — persistent `+120s` skip when AniSkip has no data (or MAL ID is missing).

### What success looks like

1. User opens any episode of Steins;Gate (MAL `9253`) on ogladajanime.pl. At ~10:40 (OP start at 638s for ep 1), a "Pomiń intro (3s)" toast appears inside the player iframe. Clicking it seeks to 728s. Toast auto-dismisses after the window ends if not clicked.
2. User opens an episode of an obscure show with no AniSkip data. A persistent "+120s" button shows in the same surface. No errors, no error toasts.
3. User toggles "Automatycznie pokazuj przycisk pomijania" off in settings. Both toast and fallback button disappear from every player.
4. The four verified player hosts (ogladajanime native, VK, rumble, shinden.pl) all show the toast/button correctly. Fullscreen reparenting works.
5. Settings persist across restarts.
6. POC dock still works under `devModeEnabled` for debugging future hosts.

### Non-goals (explicit)

- No crowd-source contribution flow (V2). MVP is read-only.
- No ambient ED loop (V2). Different feature.
- No in-app stats ("you saved X minutes this week" — V3).
- No Discord RPC integration with skip events.
- No new player-host coverage beyond the four already verified. Adding hosts is "we test, we ship" not "we engineer."

---

## 2. Architecture

### Data flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  RENDERER (apps/web)                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ useWebviewEvents → onDidNavigate / onDomReady                │  │
│  │   │                                                          │  │
│  │   ├─→ detectAnimeFromUrl(url, title)                         │  │
│  │   │     │ {animeTitle, episodeInfo}                          │  │
│  │   │     ↓                                                    │  │
│  │   ├─→ resolveMalId(animeTitle, libraryEntries)               │  │
│  │   │     │ malId | null                                       │  │
│  │   │     ↓                                                    │  │
│  │   └─→ window.electronAPI.playerSkip.attachSkipController({   │  │
│  │         webContentsId, malId, episode, autoSkipEnabled       │  │
│  │       })                                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ IPC
┌─────────────────────────────────┴───────────────────────────────────┐
│  MAIN PROCESS (apps/desktop)                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PlayerSkipController (per webContentsId)                     │  │
│  │                                                              │  │
│  │ 1. did-frame-finish-load → cache playing-video frame handle  │  │
│  │ 2. Probe `<video>.duration` once metadata loads              │  │
│  │ 3. Fetch AniSkip:                                            │  │
│  │      AniSkipClient.getSkipTimes(malId, ep, episodeLength)    │  │
│  │      → cache key: "${malId}:${ep}:${episodeLength}"          │  │
│  │      → returns [{type:'op', start, end}, {type:'ed', ...}]   │  │
│  │ 4. Inject controller script into player frame:               │  │
│  │      - polls currentTime every 500ms                         │  │
│  │      - shows toast 5s before each window                     │  │
│  │      - listens for click → seeks                             │  │
│  │      - auto-dismisses after window ends                      │  │
│  │      - if no AniSkip data → renders persistent +120s button  │  │
│  │ 5. did-frame-detach / did-finish-load → re-inject if needed  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │ HTTPS
                                  ↓
                    https://api.aniskip.com/v2
                    (MIT-licensed, 120 req/min, MAL ID keyed)
```

### Why iframe injection (not renderer overlay)

The renderer overlay was the original feasibility-doc plan, but the POC found that **the renderer is hidden when the user fullscreens the player iframe**. Locked product decision from this session: the toast lives inside the iframe. The POC's `fullscreenchange` reparenting trick already proves this survives fullscreen.

Trade-off: injected DOM is brittle (MutationObservers on host pages can strip it). Mitigations:

- `all: initial` on the wrap element shields against host CSS.
- Sentinel `data-shiroani-*` attribute lets us idempotently re-inject if stripped.
- Re-attach on `did-navigate-in-page` for SPA-style player loads.

### File map

| Layer                       | File                                                                   | Status                                                                      |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **DB**                      | `apps/desktop/src/modules/database/migrations.ts`                      | extend                                                                      |
|                             | `apps/desktop/src/modules/library/library.service.ts`                  | extend                                                                      |
| **Shared types**            | `packages/shared/src/types/anime.ts`                                   | extend                                                                      |
| **AniSkip client**          | `apps/desktop/src/modules/aniskip/aniskip-client.ts`                   | new                                                                         |
|                             | `apps/desktop/src/modules/aniskip/aniskip.module.ts`                   | new                                                                         |
|                             | `apps/desktop/src/modules/aniskip/types.ts`                            | new                                                                         |
|                             | `apps/desktop/src/modules/aniskip/index.ts`                            | new                                                                         |
| **Anime service hookup**    | `apps/desktop/src/modules/anime/anime.service.ts`                      | extend (no changes — feasibility doc was wrong about this; see Decision D2) |
| **Main-process controller** | `apps/desktop/src/main/browser/player-skip-controller.ts`              | new                                                                         |
|                             | `apps/desktop/src/main/browser/player-skip.ts`                         | extend (export shared scripts, keep POC functions)                          |
|                             | `apps/desktop/src/main/browser/player-skip-injection.ts`               | new (toast + fallback DOM scripts as string templates)                      |
| **IPC**                     | `apps/desktop/src/main/ipc/player-skip.ts`                             | extend                                                                      |
|                             | `apps/desktop/src/main/ipc/schemas.ts`                                 | extend                                                                      |
|                             | `apps/desktop/src/main/preload/player-skip.ts`                         | extend                                                                      |
| **Shared electron-api**     | `packages/shared/src/types/electron-api.ts`                            | extend                                                                      |
| **Renderer hook**           | `apps/web/src/features/player-skip/usePlayerSkipController.ts`         | new                                                                         |
|                             | `apps/web/src/features/player-skip/resolveMalId.ts`                    | new                                                                         |
|                             | `apps/web/src/features/player-skip/episode-from-url.ts`                | new                                                                         |
|                             | `apps/web/src/features/player-skip/index.ts`                           | new                                                                         |
|                             | `apps/web/src/hooks/useWebviewEvents.ts`                               | extend                                                                      |
|                             | `apps/web/src/lib/anime-detection.ts`                                  | extend (extract episode for shinden)                                        |
| **Renderer settings**       | `apps/web/src/stores/useSettingsStore.ts`                              | extend                                                                      |
|                             | `apps/web/src/components/settings/BrowserSection.tsx`                  | extend                                                                      |
| **Tests**                   | `apps/desktop/src/modules/aniskip/__tests__/aniskip-client.test.ts`    | new                                                                         |
|                             | `apps/web/src/features/player-skip/__tests__/episode-from-url.test.ts` | new                                                                         |
|                             | `apps/web/src/features/player-skip/__tests__/resolveMalId.test.ts`     | new                                                                         |
|                             | `apps/desktop/src/modules/library/__tests__/library.service.test.ts`   | extend (mal_id round-trip)                                                  |
| **POC cleanup**             | `apps/web/src/components/browser/PlayerDock.tsx`                       | keep (gated by devMode)                                                     |

---

## 3. Decisions (with recommendations)

For every decision asked in the brief, here is the recommended default. Forge can take all defaults or you can override before handoff.

### D1. AniSkip client lives at `apps/desktop/src/modules/aniskip/`

**Recommend:** Yes — matches the existing `apps/desktop/src/modules/anime/` pattern for AniList. Keep it as a NestJS module so it can be DI'd into a future gateway when V2 adds the contribution flow. For MVP, the client is consumed only from main-process IPC (no gateway needed yet), but the module shape stays consistent.

**Surface:**

- `aniskip-client.ts` — HTTP client, in-memory TTL cache, structured errors. Mirrors `anilist-client.ts`.
- `types.ts` — DTOs for AniSkip API responses.
- `aniskip.module.ts` — `@Module({ providers: [AniSkipClient], exports: [AniSkipClient] })`.
- `index.ts` — re-exports for `@/modules/aniskip` consumers.

### D2. AniSkip cache scope: `${malId}:${ep}:${episodeLength}`, TTL 24h

**Recommend:** 24-hour TTL. OP/ED times for an episode never change (the show's already aired). 24h is a safe ceiling against misformatted episode-length probes that resolve to slightly different cached entries — the worst case is a small re-fetch, not stale data. Mirror the AniList client's `Map<string, CacheEntry<T>>` shape verbatim.

**Cache key options considered:**

- `${malId}:${ep}` — too coarse; AniSkip returns different windows depending on `episodeLength` query param.
- `${malId}:${ep}:${episodeLength}` — current rec. AniSkip docs say nearest-match by length, so binning to integer seconds keeps the cache reasonable.
- `${malId}:${ep}:${Math.round(episodeLength/10)*10}` — bucket by 10s. Considered overkill for MVP. Ship the simpler key, revisit if cache hit rate is poor in practice.

### D3. **MAL ID resolution: runtime fetch via AniList, NOT a DB migration**

**Recommend:** **Reverse the feasibility doc's recommendation.** The feasibility doc proposed adding `mal_id` to the `anime_library` table. After reading the actual library code, this is more painful than expected:

- `LibraryService.addEntry` doesn't currently fetch AniList details — it takes a `LibraryAddPayload` from the renderer. The user manually fills in title/episodes/cover via `AddToLibraryDialog`. No `anilistId` is even captured automatically.
- Backfilling `mal_id` requires either (a) wiring AniList lookups into the add flow, or (b) writing a one-shot backfill that walks the existing library and fetches `idMal` per entry. Both are real chunks of work that don't directly serve the MVP.
- `useAnimeDetailStore` already calls `anime:get-details` with `anilistId` and gets back `idMal` in the response — but doesn't persist it.

**Better path for MVP:** when the skip controller needs a MAL ID, it asks `AnimeService.getAnimeDetails(anilistId)` (already cached for 5min via `AniListClient.cachedQuery` — extend cache to forever for `idMal` resolution, or rely on the existing cache + the user typically having one player open at a time). The `idMal` response field is the same one the migration would have backfilled anyway.

This means:

- **No DB migration in MVP** — schema unchanged.
- **No backfill** — the AniList round-trip is one cached call per `anilistId`.
- The migration is **deferred to V2** when we add the contribution flow (we'll need persistent MAL IDs to upload skip times keyed correctly).

**Open question flagged below (Q1):** what if the library entry has no `anilistId`? Solution: skip controller silently does nothing, no toast appears. This is the same UX as "no AniSkip data found."

### D4. Episode length: read from `<video>.duration` at `loadedmetadata`

**Recommend:** Yes. We already poll the playing video frame; once `readyState >= 1` and `duration` is finite, we have the real value. AniList `duration` is the _intended_ runtime, not the actual file length, and OP/ED skip windows are sensitive to the length AniSkip was trained on (community submissions are file-relative).

Pass `episodeLength=0` initially to AniSkip (server returns nearest match — verified in feasibility doc). When `loadedmetadata` fires, if cached AniSkip's `episodeLength` differs from real duration by >5%, refetch with the real length. This is rare and the UX cost is one re-fetch, but ensures correctness on shows where AniSkip has multiple length variants (TV airings vs BD versions).

### D5. Episode number detection: extend `anime-detection.ts`

**Recommend:** Extend the existing `anime-detection.ts` to return `{ animeTitle, episodeInfo, episodeNumber? }`. Currently `detectOgladajAnime` returns `episodeInfo: 'Odcinek 3'` (string, only the second branch); `detectShinden` returns nothing. The MVP needs an integer.

**Concrete changes:**

- `AnimeDetection` interface gains `episodeNumber?: number`.
- `detectOgladajAnime` — `playerMatch` returns episode null (it's `/anime/{slug}/player/{id}` — no ep number in URL). Document this. The `episodeMatch` branch parses `episodeNumber: parseInt(episodeMatch[2], 10)`.
- `detectShinden` — extend regex to capture episode number. Need to inspect a real shinden URL; the existing regex only captures slug. Likely shape: `/episode/{anime-id}-{slug}/{episode-id}-{episode-slug}` or `/episode/.../view/{viewId}` — needs verification during implementation. **Flag this as a small unknown.**
- `detectYoutube` — episode number not applicable; YouTube isn't in the anime player allowlist for MVP anyway.

If shinden's URL doesn't contain the episode number, fallback B: scrape from page title (the existing `pageTitle` argument is already passed). Mark as best-effort.

### D6. **Toast injection mechanism: per `did-frame-finish-load`, plus re-attach on `did-navigate-in-page`**

**Recommend:** The main-process controller hooks `webContents.on('did-frame-finish-load', ...)` (already wired pattern via `did-attach-webview` in `ipc/browser.ts:160`). This fires for every frame load — both the top frame and embed iframes.

Idempotency strategy:

- The injected script self-checks: if `document.querySelector('[data-shiroani-skip="root"]')` exists, no-op.
- Re-injection happens after navigation events (`did-navigate-in-page`) to handle SPA-style player swaps.
- Per-`webContentsId` controller state means each tab/pane has its own controller instance.

This is **per-page-load**, not per-tab-activation — tab switching doesn't re-inject because the script is already in the iframe DOM.

### D7. Frame cache: yes, worth it for MVP

**Recommend:** Yes. The feasibility doc raised this as a "maybe later"; the POC handoff doc (Q7) flagged it again. Recommend doing it in MVP because:

- The toast script polls `currentTime` every 500ms. That's 120 polls per minute. If each one re-walked the frame tree we'd burn ~10ms × 120 = 1.2s of main-process time per minute per active tab — small but cumulative across split tabs.
- The cache is one entry per `webContentsId`: `Map<number, { processId, routingId, lastSeenUrl }>`.
- Invalidation: `did-frame-detach`, `did-navigate`, or `frame.detached === true` on next access.

The complexity is small; the savings compound when split-view + ambient ED ship.

**Caveat:** never cache the `WebFrameMain` object itself (Electron 33+ detaches them mid-navigation). Cache the `(processId, routingId)` pair and re-resolve via `webFrameMain.fromId` on every use. The POC already does this correctly in `safeResolveFrame`.

### D8. Fallback button reuses POC `injectSkipButtonIntoFrame` logic

**Recommend:** Refactor `injectSkipButtonIntoFrame` into a shared `player-skip-injection.ts` module that exports two script-builder functions:

- `buildSkipToastScript({ skipTimes, autoSkipEnabled, polishCopy })` — for the AniSkip-driven contextual toast.
- `buildFallbackButtonScript({ deltaSeconds })` — for the generic +120s button. Behaviorally identical to the POC injector; rename and make permanent.

The POC's existing fullscreen-reparent + idempotency machinery is reusable wholesale. The contextual toast adds:

- A poll loop on `target.currentTime` (500ms interval) using the existing shadow-DOM-aware `shiroaniCollectVideos`.
- A render function that toggles toast visibility based on time-vs-window math.
- A countdown number that updates every 1s while shown.
- A Polish copy table: `Pomiń intro (Ns)` for OP, `Pomiń outro (Ns)` for ED, `Pomiń streszczenie (Ns)` for recap (deferred to V3 per feasibility doc).

### D9. No-AniSkip-data + no-MAL-ID-for-anime behavior **[UPDATED per Q1]**

User wants a 3-tier resolution chain: try harder before falling back. Behavior matrix:

- **Anime in library, has `anilistId`, has AniSkip data:** show contextual toast.
- **Anime in library, has `anilistId`, no AniSkip data:** show fallback `+120s` button.
- **Anime in library, no `anilistId`:** background-fetch via AniList GraphQL search using normalized title; if top result's similarity > 0.8, persist the resolved `anilistId` to the library entry and proceed as the row above. If below threshold or fetch fails, show fallback button.
- **Anime NOT in library:** background-fetch via AniList GraphQL search using normalized title from `detectAnimeFromUrl`. If top result's similarity > 0.8, fetch AniSkip and show contextual toast (read-only — does NOT auto-add to library, per session decision). If below threshold or fetch fails, show fallback button.
- **Player host not in allowlist:** no injection. The `detectAnimeFromUrl` gate already discriminates this.
- **Auto-inject setting OFF:** no injection ever, full stop. Setting wins over everything.

The resolution is **silent and non-blocking** — the fallback button shows immediately on injection; if the AniList fetch resolves a high-confidence match within ~500ms, the injection upgrades to the contextual toast. If it takes longer, user already has the fallback. No "loading…" state, no spinner inside the iframe.

So the persistent fallback button is the **default state** on any recognized player (showing within ~50ms of frame finish-load); the contextual toast is the **enhanced state** when both MAL ID and AniSkip data are confidently resolved.

### D10. Settings UI: extend BrowserSection

**Recommend:** Add a fourth `SettingsCard` to `BrowserSection.tsx` titled **"Pomijanie odcinków"** (icon: `SkipForward` from lucide). Two toggles:

1. `opEdSkipEnabled` (default true) — master switch. Off = no skip UI anywhere.
2. `autoSkipEnabled` (default false) — when contextual toast appears, click is no longer required; the player auto-seeks at `start` time. Sub-toggle, only enabled when master is on.

Plus one info text:

- "Korzysta z bazy AniSkip (MIT). Działa na ogladajanime.pl, shinden.pl i obsługiwanych odtwarzaczach."

This keeps the section visually consistent with the existing four cards. No standalone settings section needed.

### D11. AniSkip rate-limit handling: best-effort cache + silent fallback

**Recommend:** With the 24h cache and one-request-per-episode-open, hitting the 120 req/min limit requires the user opening 120 unique (anime, episode) pairs in a minute. Practically impossible. But if it does happen (e.g. a power user running search-all-episodes-of-a-show):

- The client returns `null` skip times silently.
- Renderer falls back to the +120s fallback button (same as no-data case).
- A debug log line, no toast notification.

**Don't surface rate-limit errors to the user** — the experience just degrades to "no skip data," which is the same as a missing-data show.

---

## 4. Atomic task breakdown

Each task is small enough that forge can ship it in a single commit. Effort: **XS** = <1h, **S** = 1-3h, **M** = 3-6h, **L** = 6-10h. Total estimate: **~28-40h** depending on how many subtle bugs surface.

### Task 1 — Shared types: extend `AnimeDetection` and add AniSkip types

**Files:**

- `packages/shared/src/types/anime.ts` (extend)
- `apps/desktop/src/modules/aniskip/types.ts` (new)

**Changes:**

- Add `episodeNumber?: number` to `AnimeDetection` interface (web/lib).
- New types in aniskip module:
  ```ts
  export interface AniSkipInterval {
    startTime: number;
    endTime: number;
  }
  export type AniSkipType = 'op' | 'ed' | 'mixed-op' | 'mixed-ed' | 'recap';
  export interface AniSkipResult {
    interval: AniSkipInterval;
    skipType: AniSkipType;
    skipId: string;
    episodeLength: number;
  }
  export interface AniSkipResponse {
    found: boolean;
    results: AniSkipResult[];
    message: string;
    statusCode: number;
  }
  ```

**Dependencies:** none.
**Effort:** XS.
**Acceptance:** types compile, no runtime impact yet.

### Task 2 — `AniSkipClient` with TTL cache

**Files:**

- `apps/desktop/src/modules/aniskip/aniskip-client.ts` (new)
- `apps/desktop/src/modules/aniskip/aniskip.module.ts` (new)
- `apps/desktop/src/modules/aniskip/index.ts` (new)
- `apps/desktop/src/modules/aniskip/__tests__/aniskip-client.test.ts` (new)

**Changes:**

- Mirror `anilist-client.ts`: `Injectable`, `cachedQuery<T>`, `clearCache`, retry-on-429 with `Retry-After` parsing, AbortSignal timeout 15s.
- Endpoint: `https://api.aniskip.com/v2`.
- Method: `getSkipTimes(malId: number, episode: number, episodeLength: number, types?: AniSkipType[]): Promise<AniSkipResult[]>`.
  - Default types: `['op', 'ed']`.
  - Cache key: `skip:${malId}:${episode}:${Math.round(episodeLength)}`.
  - TTL: 24h.
- Returns `[]` on `found: false`. Throws on network errors so caller can decide whether to silent-fail (renderer will).
- **Tests:** mock fetch, verify cache hits, 429 retry, empty results, malformed response.

**Dependencies:** Task 1.
**Effort:** S.
**Acceptance:** `pnpm -F desktop test aniskip` passes; manual `getSkipTimes(9253, 1, 0)` against live API returns the Steins;Gate OP+ED rows.

### Task 3 — Wire `AniSkipModule` into `AppModule`

**Files:**

- `apps/desktop/src/modules/app.module.ts` (extend)

**Changes:** add `AniSkipModule` to `imports` so DI works when controller code consumes it.

**Dependencies:** Task 2.
**Effort:** XS.
**Acceptance:** app boots, no DI errors.

### Task 4 — Episode-number extraction utility

**Files:**

- `apps/web/src/features/player-skip/episode-from-url.ts` (new)
- `apps/web/src/features/player-skip/__tests__/episode-from-url.test.ts` (new)
- `apps/web/src/lib/anime-detection.ts` (extend)

**Changes:**

- New pure helper `extractEpisodeNumber(url: string, pageTitle: string): number | null`.
  - ogladajanime: match `/anime/{slug}/{n}` and `/anime/{slug}/player/{n}` (the player URL form may not have ep — verify, fall back to title scrape).
  - shinden: regex against the path; **needs investigation during implementation** — capture from URL if available, fall back to scraping the page title for `Odcinek N` / `Episode N`.
  - youtube: returns null (out of scope for skip).
- Update `AnimeDetection` to include `episodeNumber`.
- `detectOgladajAnime`'s `episodeMatch` branch sets `episodeNumber: parseInt(...)`.
- New `detectShinden` extracts episode number per the regex above.

**Tests:**

- ogladajanime URLs (multiple shapes including player form).
- shinden URLs (multiple shapes).
- Title-fallback case ("Naruto - Odcinek 5 - shinden.pl" → 5).
- youtube → null.
- non-anime URL → null.

**Dependencies:** Task 1.
**Effort:** S.
**Acceptance:** tests pass; manual verification on three live URLs (one ogladajanime, one shinden, one outside).

### Task 5 — `resolveMalId` helper **[UPDATED per Q1]**

**Files:**

- `apps/web/src/features/player-skip/resolveMalId.ts` (new)
- `apps/web/src/features/player-skip/normalizeTitle.ts` (new)
- `apps/web/src/features/player-skip/similarity.ts` (new)
- `apps/web/src/features/player-skip/__tests__/resolveMalId.test.ts` (new)
- `apps/web/src/features/player-skip/__tests__/normalizeTitle.test.ts` (new)
- `apps/web/src/features/player-skip/__tests__/similarity.test.ts` (new)

**Changes:**

`normalizeTitle.ts` — pure helper:

- Lowercase, replace hyphens with spaces, strip non-alphanumeric (keep spaces), collapse whitespace.
- Examples: `"tsue-to-tsurugi-no-wistoria-2"` → `"tsue to tsurugi no wistoria 2"`; `"Steins;Gate"` → `"steins gate"`.

`similarity.ts` — pure helper:

- `jaroWinkler(a: string, b: string): number` returning 0..1. Battle-tested, no deps. ~40 lines.
- Use this rather than Levenshtein because it weights prefix matches (better for partial titles).

`resolveMalId.ts` — async helper, 3-tier resolution:

```ts
async function resolveMalId(args: {
  animeTitle: string;
  libraryEntries: AnimeEntry[];
  searchAniListByTitle: (q: string) => Promise<AniListSearchResult[]>;
}): Promise<{
  malId: number;
  anilistId: number;
  source: 'library-direct' | 'library-resolved' | 'anilist-search';
  confidence: number;
} | null>;
```

Algorithm:

1. **Tier 1 — library direct.** Find library entry where `normalizeTitle(e.title)` or `normalizeTitle(e.titleRomaji ?? '')` equals `normalizeTitle(animeTitle)`. If match has `anilistId`, call `anime:get-details` (cached), return `{ malId, anilistId, source: 'library-direct', confidence: 1.0 }`.
2. **Tier 2 — library resolve.** If matched library entry has no `anilistId`: call AniList search by normalized title, take top result, compute `jaroWinkler(normalize(searchResult.title.romaji), normalize(animeTitle))`. If similarity > 0.8, persist `anilistId` back to the library entry (via existing library write path), return `{ malId, anilistId, source: 'library-resolved', confidence }`.
3. **Tier 3 — AniList search.** No library match: same AniList search → similarity check. If > 0.8, return `{ malId, anilistId, source: 'anilist-search', confidence }`. **Do NOT auto-add to library** (per session decision — read-only).
4. Below threshold or any fetch fails: return null. Caller shows fallback button.

Module-level `Map<string, Promise<Result>>` dedupe by normalized title to coalesce concurrent calls.

**Tests:**

- Tier 1: library entry exact match (title and romaji), with anilistId → no AniList call.
- Tier 2: library entry no anilistId, similarity > 0.8 → resolves and persists.
- Tier 2: library entry no anilistId, similarity 0.6 → returns null, no persist.
- Tier 3: not in library, similarity > 0.8 → resolves but does NOT persist.
- Concurrent dedup: two calls for same title share one promise.
- AniList fetch failure → null without throwing.
- `normalizeTitle` edge cases: mixed case, hyphens, semicolons, trailing season numbers.
- `jaroWinkler` known pairs (`"steins gate"` vs `"steins;gate"` should be > 0.9).

**Dependencies:** Task 1, Task 4. Plus access to AniList search — confirm that an existing socket event or REST endpoint exists; if not, add a thin `anime:search-by-title` socket event in apps/desktop/src/modules/anime/ that wraps the existing AniList client.

**Effort:** M (was S — promoted because of tier-2/3 fetch + persist + similarity scoring).

**Acceptance:** all tests pass; the persist path in tier 2 is verified manually by opening an anime page where the library entry lacks `anilistId` and observing the entry being updated after navigation.

### Task 6 — Refactor POC `player-skip.ts`: extract reusable scripts

**Files:**

- `apps/desktop/src/main/browser/player-skip.ts` (extend)
- `apps/desktop/src/main/browser/player-skip-injection.ts` (new)

**Changes:**

- Move the embedded JavaScript template strings (`COLLECT_VIDEOS_FN_SOURCE`, `PROBE_VIDEOS_SOURCE`) into `player-skip-injection.ts` as exports.
- Add new exports:
  - `buildSkipToastScript({ skipTimes, autoSkipEnabled, polishCopy })` — builds the contextual toast script with skip windows interpolated as JSON-stringified data.
  - `buildFallbackButtonScript({ deltaSeconds })` — same DOM as POC's `injectSkipButtonIntoFrame`, but factored out so it can be invoked by both the POC dock (debug) and the new permanent path.
- Keep `injectSkipButtonIntoFrame` as a thin wrapper around `buildFallbackButtonScript` for POC backwards compat.
- All scripts share the fullscreen-reparent + sentinel + idempotency machinery.

**Dependencies:** none (pure refactor of existing code).
**Effort:** S.
**Acceptance:** POC dock still works exactly the same (regression check); new functions are pure and unit-testable as string-output (snapshot tests OK if forge prefers).

### Task 7 — `PlayerSkipController` (main-process orchestrator)

**Files:**

- `apps/desktop/src/main/browser/player-skip-controller.ts` (new)

**Changes:**

- Class with state per `webContentsId`:
  - Cached playing-video frame `{ processId, routingId, lastSeenUrl }`.
  - Active skip-toast injection state (sentinel attribute).
  - Configured skip times for current episode.
- Methods:
  - `attach(webContentsId, malId, episode, autoSkipEnabled)` — registers the controller, hooks `did-frame-finish-load` on the webContents, sets up frame cache invalidation on `did-navigate`.
  - `detach(webContentsId)` — removes listeners, cleans cache.
  - `update(webContentsId, partial)` — switch episodes mid-stream when `did-navigate-in-page` fires inside the same anime.
  - Internal: `fetchAndInjectSkipTimes()` — calls `AniSkipClient.getSkipTimes`, calls `buildSkipToastScript` or `buildFallbackButtonScript`, calls `frame.executeJavaScript`.
  - Internal: `findAndCacheVideoFrame(webContentsId)` — runs `findPlayingVideoFrame`, stores in cache.
- Singleton exported as `playerSkipController`.

**Dependencies:** Task 2, Task 6.
**Effort:** M.
**Acceptance:** unit tests for the control flow (mocked `webFrameMain`); manual test that `attach` then opening Steins;Gate ep 1 results in toast appearing at ~10:38.

### Task 8 — IPC channel `player-skip:attach-controller`

**Files:**

- `apps/desktop/src/main/ipc/player-skip.ts` (extend)
- `apps/desktop/src/main/ipc/schemas.ts` (extend)
- `apps/desktop/src/main/preload/player-skip.ts` (extend)
- `packages/shared/src/types/electron-api.ts` (extend)

**Changes:**

- New IPC channel: `player-skip:attach-controller`.
  - Payload: `{ webContentsId, malId: number | null, episode: number | null, autoSkipEnabled: boolean }`.
  - Returns: `{ ok: boolean; mode: 'aniskip' | 'fallback' | 'none' }`.
  - When `malId === null || episode === null` → `mode: 'fallback'` (still injects fallback button).
  - When `malId && episode` → tries AniSkip; if no data, falls back; updates mode in result.
- New IPC channel: `player-skip:detach-controller`.
  - Payload: `{ webContentsId }`.
- Schemas mirror the new payload shapes via Zod tuples.
- Preload bridge exposes `electronAPI.playerSkip.attachController(...)` and `.detachController(...)`.
- ElectronAPI interface in shared types updated.

**Dependencies:** Task 7.
**Effort:** S.
**Acceptance:** IPC payload validates, returns expected shape; manual call from devtools works.

### Task 9 — Renderer hook `usePlayerSkipController`

**Files:**

- `apps/web/src/features/player-skip/usePlayerSkipController.ts` (new)
- `apps/web/src/features/player-skip/index.ts` (new)

**Changes:**

- `usePlayerSkipController(paneId: string)` — runs in BrowserView for each pane.
- On mount + on `did-navigate` for the pane:
  1. Resolve current URL/title from store.
  2. Run `detectAnimeFromUrl(url, title)` — if null, send `detach-controller` and bail.
  3. Run `extractEpisodeNumber(url, title)` — if null, episode is unknown.
  4. Run `resolveMalId(detection.animeTitle, useLibraryStore.getState().entries)` — async.
  5. Read `useSettingsStore.getState().opEdSkipEnabled` — if false, send `detach-controller` and bail.
  6. Read `webview.getWebContentsId()` from `getWebview(paneId)`.
  7. Send `attach-controller` IPC with resolved values.
- On unmount or settings change: send `detach-controller`.

**Dependencies:** Task 4, Task 5, Task 8, Task 12 (settings).
**Effort:** M.
**Acceptance:** opening Steins;Gate ep 1 in webview triggers `attach-controller` IPC with correct payload; unit tests mock the helpers and verify IPC sequencing.

### Task 10 — Wire `usePlayerSkipController` into webview lifecycle

**Files:**

- `apps/web/src/hooks/useWebviewEvents.ts` (extend) OR
- `apps/web/src/components/browser/BrowserWebview.tsx` (extend, calling the hook)

**Recommend:** Add a separate hook call in `BrowserWebview.tsx` after `useWebviewEvents`. Keep `useWebviewEvents.ts` focused on its existing scope (URL/title/loading state).

**Changes:**

- Inside `BrowserWebview`, call `usePlayerSkipController(paneId)`.
- Hook re-runs on URL change because `usePlayerSkipController` itself subscribes to the store's URL slice.

**Dependencies:** Task 9.
**Effort:** XS.
**Acceptance:** tab navigation to a recognized anime URL triggers the controller; tab navigation away detaches it.

### Task 11 — Add settings: `opEdSkipEnabled`, `autoSkipEnabled`

**Files:**

- `apps/web/src/stores/useSettingsStore.ts` (extend)

**Changes:**

- Two new state fields:
  - `opEdSkipEnabled: boolean` (default `true`).
  - `autoSkipEnabled: boolean` (default `false`).
- Two new actions:
  - `setOpEdSkipEnabled(enabled)` — persisted via `electronStoreSet('settings.opEdSkipEnabled', ...)`.
  - `setAutoSkipEnabled(enabled)` — persisted via `electronStoreSet('settings.autoSkipEnabled', ...)`.
- Mirror the existing `devModeEnabled` persistence shape: localStorage accessor + electron-store async load in `initSettings`.

**Dependencies:** none.
**Effort:** S.
**Acceptance:** settings persist across app restart; toggling triggers re-render in subscribers.

### Task 12 — Settings UI in `BrowserSection`

**Files:**

- `apps/web/src/components/settings/BrowserSection.tsx` (extend)

**Changes:**

- New `SettingsCard` block titled **"Pomijanie odcinków"**, icon `SkipForward`, tone `gold` or `muted`.
- Two `SettingsToggleRow` entries:
  1. `op-ed-skip-label` — title "Automatycznie pokazuj przycisk pomijania", description "Pokazuje przycisk Pomiń intro/outro na stronach anime z obsługiwanym odtwarzaczem.".
  2. `auto-skip-label` — title "Automatyczne pomijanie", description "Pomija OP/ED bez kliknięcia. Wymaga włączonego pokazywania przycisku.". Disable when master is off.
- Info text below: "Korzysta z bazy AniSkip (MIT). Działa na ogladajanime.pl, shinden.pl i obsługiwanych odtwarzaczach."

**Dependencies:** Task 11.
**Effort:** XS.
**Acceptance:** UI renders correctly, toggles persist, sub-toggle disables when master is off.

### Task 13 — Manual verification matrix

**Files:** none (pure manual QA).

**Test matrix:** see Section 7.

**Dependencies:** Task 10, Task 12.
**Effort:** M (~3-4h to walk through all four hosts × all states).

### Task 14 — POC dock cleanup decision

**Files:**

- `apps/web/src/components/browser/PlayerDock.tsx` (no changes — keep as-is)
- Possibly: rename `Sprawdź` / `Wstrzyknij` debug labels to clarify they're for new-host probing.

**Recommend:** Keep the dock unchanged. It remains gated by `devModeEnabled`. Rationale:

- The Sprawdź / Wstrzyknij buttons are useful for _every_ future player-host addition. Stripping them now means we re-add them later.
- The dock's manual-seek buttons (`-10s`, `+120s`) are useful as developer tools when MVP injection isn't working as expected on a new host.
- It costs zero user-facing complexity (gated by devMode).
- Mark the file with a comment block at top: `/** Dev-only debug surface. Permanent — used to probe new player hosts. See player-skip-injection.ts for production user-facing UX. */`

**Dependencies:** none.
**Effort:** XS (just the comment).
**Acceptance:** comment present; dock still works under devMode.

---

## 5. Wave grouping

Tasks can run in three parallelizable waves. Sequential within a wave is OK but most pairs in a wave can be done in parallel by separate sub-agents.

### Wave A (parallel — foundations)

- Task 1 (shared types)
- Task 4 (episode extraction)
- Task 11 (settings store)
- Task 14 (POC dock comment)

All four are independent, touch different files, and don't block each other. **A coding agent can dispatch four sub-agents.**

### Wave B (after Wave A — core)

- Task 2 (AniSkip client) — depends on Task 1
- Task 5 (resolveMalId) — depends on Task 1, 4
- Task 6 (refactor player-skip injection) — independent of Wave A
- Task 12 (settings UI) — depends on Task 11

Three of four can start as Wave A finishes. **Forge can dispatch three sub-agents in parallel.**

### Wave C (after Wave B — orchestration)

- Task 3 (wire AniSkipModule) — depends on Task 2
- Task 7 (PlayerSkipController) — depends on Task 2, 6
- Task 8 (IPC) — depends on Task 7
- Task 9 (renderer hook) — depends on Task 4, 5, 8, 11

Sequential within: 3 → (7) → 8 → 9. Task 7 is the longest single task in the plan.

### Wave D (after Wave C — integration + verification)

- Task 10 (wire hook) — depends on Task 9
- Task 13 (manual QA) — depends on Task 10, 12

Task 10 is XS. Task 13 is the gate before merging.

**Critical path:** Task 1 → Task 2 → Task 7 → Task 8 → Task 9 → Task 10 → Task 13. Roughly XS + S + M + S + M + XS + M ≈ 13-21h. Other tasks compress into this critical path's slack.

---

## 6. Migration plan

**No DB migration in MVP** (per Decision D3). The schema stays at version 5.

When V2 adds the contribution flow, the migration will be:

```sql
-- migrations.ts entry, version 6
ALTER TABLE anime_library ADD COLUMN mal_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_anime_library_mal_id ON anime_library(mal_id);
```

Plus a one-shot backfill in `LibraryService` constructor: walk entries with `anilistId IS NOT NULL && mal_id IS NULL`, fetch via AniList client (already cached), set `mal_id`. Defer this work; the runtime fetch path is sufficient for MVP.

---

## 7. API contracts

### `AniSkipClient`

```ts
class AniSkipClient {
  async getSkipTimes(
    malId: number,
    episode: number,
    episodeLength: number,
    types?: AniSkipType[]
  ): Promise<AniSkipResult[]>;

  clearCache(key?: string): void;
}
```

### Renderer `electronAPI.playerSkip` additions

```ts
playerSkip: {
  // Existing POC channels — kept
  seekRelative: (webContentsId, deltaSeconds) => Promise<SeekResult>;
  probe: webContentsId => Promise<ProbeResult>;
  injectButton: (webContentsId, deltaSeconds) => Promise<InjectResult>;

  // New for MVP
  attachController: (params: {
    webContentsId: number;
    malId: number | null;
    episode: number | null;
    autoSkipEnabled: boolean;
  }) => Promise<{ ok: boolean; mode: 'aniskip' | 'fallback' | 'none' }>;

  detachController: (params: { webContentsId: number }) => Promise<{ ok: boolean }>;
}
```

### Settings store additions

```ts
interface SettingsState {
  // ...existing
  opEdSkipEnabled: boolean; // default true
  autoSkipEnabled: boolean; // default false
}

interface SettingsActions {
  // ...existing
  setOpEdSkipEnabled: (enabled: boolean) => void;
  setAutoSkipEnabled: (enabled: boolean) => void;
}
```

### IPC schemas (Zod)

```ts
export const playerAttachControllerSchema = z.tuple([
  z.object({
    webContentsId: z.number().int().positive(),
    malId: z.number().int().positive().nullable(),
    episode: z.number().int().positive().nullable(),
    autoSkipEnabled: z.boolean(),
  }),
]);

export const playerDetachControllerSchema = z.tuple([
  z.object({
    webContentsId: z.number().int().positive(),
  }),
]);
```

### Toast injection script — what gets sent into the iframe

```ts
buildSkipToastScript({
  skipTimes: AniSkipResult[],   // serialized as JSON
  autoSkipEnabled: boolean,
  polishCopy: {
    skipOp: 'Pomiń intro',
    skipEd: 'Pomiń outro',
    countdown: (s: number) => `(${s}s)`,
  },
}): string
```

Returns a string of JavaScript to be passed to `frame.executeJavaScript()`. The script:

1. Self-checks idempotency via sentinel attribute `data-shiroani-skip="root"`.
2. Walks the document for the playing `<video>` (reuses `shiroaniCollectVideos`).
3. Sets up `setInterval(500ms)` to compare `currentTime` against each skip window.
4. When entering the 5s pre-window: render the toast.
5. While inside the window: countdown updates, click handler seeks to `endTime`.
6. After the window: hide the toast.
7. Listens for `fullscreenchange` to reparent (POC pattern).
8. On click: `target.currentTime = window.endTime` (skip to end of OP/ED).

---

## 8. Test plan

MVP is mostly manual verification. Three unit-test files (Tasks 2, 4, 5) cover the pure logic; everything iframe-side requires a real Electron window.

### Verification matrix

For each combination, expected behavior:

| Scenario                                                     | Toggle ON, AniSkip data        | Toggle ON, no AniSkip   | Toggle OFF |
| ------------------------------------------------------------ | ------------------------------ | ----------------------- | ---------- |
| **ogladajanime native player** (e.g. show with native HTML5) | Toast appears at OP/ED windows | Persistent +120s button | Nothing    |
| **VK embed** (most ogladajanime episodes)                    | Toast appears at OP/ED windows | +120s button            | Nothing    |
| **rumble embed**                                             | Toast appears                  | +120s button            | Nothing    |
| **shinden.pl embed**                                         | Toast appears                  | +120s button            | Nothing    |
| **YouTube** (out of allowlist)                               | Nothing                        | Nothing                 | Nothing    |
| **Non-anime page** (e.g. google.com)                         | Nothing                        | Nothing                 | Nothing    |

For each "Toast appears" cell:

- [ ] Toast appears 5s before OP startTime.
- [ ] Countdown updates every second.
- [ ] Click seeks `currentTime` to OP endTime.
- [ ] Toast disappears 1s after OP endTime even without click.
- [ ] Same for ED.
- [ ] In fullscreen: toast remains visible (reparented).
- [ ] Re-injection on `did-navigate-in-page` doesn't pile up duplicate toasts.

Concrete test data (from feasibility doc verified curl):

- **Steins;Gate (MAL 9253)** ep 1: OP `638.489 → 728.489`, ED `1331.713 → 1421.713`. URL: ogladajanime.pl/anime/steins-gate/1.
- **A show with no AniSkip data** — pick a niche fansub show; the +120s button should appear.

### Auto-skip mode (when `autoSkipEnabled: true`)

- [ ] User opens an episode with skip data.
- [ ] At OP startTime, video auto-seeks to endTime without user action.
- [ ] Repeat for ED.
- [ ] Manual `+120s` button still works as a secondary control.

### Settings persistence

- [ ] Toggle `opEdSkipEnabled` off, restart app, confirm still off.
- [ ] Toggle `autoSkipEnabled` on, restart app, confirm still on.
- [ ] Disable master, sub-toggle becomes disabled.

### Failure modes (verify graceful degradation)

- [ ] Network offline — AniSkip request fails — fallback button appears.
- [ ] Library entry has no `anilistId` — fallback button appears.
- [ ] AniList returns no `idMal` — fallback button appears.
- [ ] Frame detaches mid-poll — controller silently no-ops, doesn't crash.
- [ ] User opens 10 tabs of different episodes simultaneously — each tab has its own controller, no cross-tab interference.

### POC dock regression

- [ ] Toggle `devModeEnabled` on, dock appears on anime hosts.
- [ ] Sprawdź still produces probe output.
- [ ] Wstrzyknij still injects the +120s button.
- [ ] Manual seek buttons still work.

---

## 9. POC cleanup recommendation

**Decision:** keep the POC dock. Strip nothing.

**Rationale:**

- The dock is gated by `devModeEnabled`. Default users never see it.
- The probe + inject buttons are exactly the tools needed when adding a new player host. Removing them means re-adding them when the next host (dailymotion, dood, etc.) comes up.
- The manual seek buttons are debug aids when MVP injection is misbehaving — diagnosis tool.
- Total maintenance cost: zero, until the underlying APIs change.

**Action item:** Add a doc comment to the top of `PlayerDock.tsx` explaining its long-term role:

```tsx
/**
 * Developer-only debug surface for the iframe-driving infra.
 *
 * Permanent — gated behind `devModeEnabled`. Used to probe new player hosts
 * and diagnose injection issues. The user-facing OP/ED skip UX is delivered
 * by `player-skip-controller.ts` directly into the player iframe — see
 * docs/research/2026-04-28-op-ed-skip-mvp-plan.md.
 */
```

---

## 10. Open questions / blockers

These need user input before forge runs.

### Q1. Library entry without `anilistId`: behavior in MVP?

**Recommendation in plan:** show fallback +120s button silently.
**Alternative:** could prompt user to "match this entry to AniList" — adds dialog complexity.
**Risk if unclear:** forge picks default (silent fallback) which is probably right but may be wrong.

### Q2. Shinden episode-number URL shape — needs live URL example.

The current `detectShinden` regex captures the slug but episode number extraction is unverified. **Action:** during Task 4 implementation, the agent must inspect a real shinden URL (the user has shinden in the verified-hosts list per POC handoff) and adapt the regex. If the URL doesn't contain the number, fall back to title scraping.
**Risk:** if title scraping also fails, shinden won't get contextual toast for AniSkip — only fallback button. Acceptable degradation.

### Q3. Title-match fuzziness for `resolveMalId`.

Slug-to-title via `slugToTitle()` produces "Steins Gate" for the slug `steins-gate`, but the library may store "Steins;Gate" (with the semicolon). Exact-match misses the semicolon. **Recommendation:** normalize both sides via `.toLowerCase().replace(/[^a-z0-9]+/g, '')` before compare. Add to Task 5.
**Risk:** false positives (different shows with similar names). Mitigation: only match library entries with `anilistId` set, since that's the ground truth.

### Q4. Branch strategy.

The POC is on `feat/op-ed-skip-poc`. Two options:

- **A:** merge POC to master first (it's already gated by devMode and self-contained), then start MVP on `feat/op-ed-skip-mvp`.
- **B:** stay on `feat/op-ed-skip-poc` and grow it into the MVP branch; rename before PR.

**Recommend B** — keeps the history coherent. The POC commits are part of the same feature arc.

### Q5. Should the "auto-skip" toggle (D10) ship in MVP or defer to V2?

**Recommendation in plan:** ship in MVP. It's one extra setting + one branch in the injected script (`if autoSkipEnabled && currentTime >= window.startTime → seek immediately`).
**Trade-off:** adds one more thing to QA. Could ship MVP without it, add in V1.1.
**Decision needed:** keep in MVP scope or split?

### Q6. AniSkip submission UUID for V2.

The AniSkip POST endpoint requires a `submitterId` (UUID per device). For MVP we don't submit, but we should generate and persist the UUID **now** so V2 has a stable identity continuous with MVP installs. Adds 1 line to settings init: `submitterUuid: string` generated via `crypto.randomUUID()` if missing.

**Recommendation:** add this opportunistically in Task 11. No UI surface, just the persisted field.

---

## 11. Out of scope (V2/V3)

Each item with a one-line rationale.

- **Crowd-source contribution flow** (V2) — explicit user click required, "submit OP/ED times" UI. _Not MVP because we want to validate the read-only consumer before introducing data quality concerns._
- **Ambient ED loop** (V2) — different feature, separate idle trigger + audio plumbing, well-scoped in feasibility doc. _Different feature, different week._
- **`mal_id` DB column + backfill** (V2) — only needed when contributions ship. _Runtime fetch is sufficient until then._
- **Recap skip type** (V3) — `recap` skip is the third AniSkip skip type but the feasibility doc deferred it. _Niche enough; OP/ED carries 95% of the value._
- **Stats dashboard** ("you saved 4h of intros this week") (V3) — depends on persisted skip events. _Cute but not the primary use case._
- **Discord RPC integration** (V3) — "Skipped intro of {anime}" presence updates. _Scope creep._
- **Additional player hosts beyond the four verified** (V2 as needed) — dailymotion, dood, sibnet. _Add reactively when users surface them, with the POC dock as the verification tool._
- **Title-search fallback when not in library** (V2) — fuzzy-match anime title to AniList by search query and resolve MAL ID. _Fuzzy and slow; preserve the "tracker thesis" of "library first."_
- **Submit-skip-time UI inside player toast** (V2) — Netflix has "this didn't work" feedback. We could too. _Defer, low signal-to-noise for first pass._
- **Per-host injection profiles** (V2) — some hosts may need different DOM strategies (e.g. dailymotion postMessage). _Not relevant to the four verified hosts._
- **Renderer overlay as fallback when iframe injection fails** (V2) — belt-and-suspenders. _Low priority since iframe injection is reliable on verified hosts._
- **Subtitle scrubber, end-of-episode detection, watch-time scrobbling** — POC handoff doc lists these as adjacent capabilities the iframe-driving infra unlocks. _Different features that share infra — separate feasibility/plan docs each._

---

## 12. Risks summary (highest first)

1. **Shinden episode extraction unknown** (Q2) — Task 4. Mitigation: title-fallback works.
2. **Title-match fuzziness** (Q3) — Task 5. Mitigation: `anilistId`-gated match.
3. **AniList round-trip latency for MAL ID** — every (paneId, anilistId) does one cached AniList call. First call ~300-800ms. Mitigation: cache result in module-level Map keyed by `anilistId` (effectively forever per session); existing `AniListClient.cachedQuery` provides 5min TTL on top.
4. **Re-injection storms during ad-tech iframe churn** — `did-frame-finish-load` fires per ad iframe load. Filter early: only act if `findPlayingVideoFrame` matches.
5. **Per-host DOM quirks not seen during POC** — some pages may have multiple visible `<video>`s, fullscreen-element ordering, etc. Mitigation: the manual QA matrix; POC dock for diagnosis.

---

**End of plan.** Ready for kirei-forge.
