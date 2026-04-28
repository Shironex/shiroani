# Research: OP/ED auto-skip + ambient ED loop — technical feasibility

**Date:** 2026-04-28
**Agent:** kirei
**Status:** complete
**Scope:** ShiroAni desktop (Electron 40.8 / Chromium 134), apps/desktop + apps/web

---

## TL;DR

Both features are shippable. The hard question — _can we reach into a cross-origin video iframe?_ — has a **definitive yes** for `<webview>` content via `webContents.mainFrame.frames[].executeJavaScript()` from the main process. Electron's docs literally use the YouTube-embedded-in-Reddit example, which is the same shape as ogladajanime → mp4upload.

**Recommended path:**

- **OP/ED skip:** AniSkip API (MIT-licensed, MAL ID keyed, 120 req/min, lives at `https://api.aniskip.com/v2`) for the data, `webContents.mainFrame.frames` traversal + `executeJavaScript` for the seek. The blocking gap is that ShiroAni's library stores `anilistId`, not `idMal` — but `idMal` is _already in the AniList GraphQL response_ (`apps/desktop/src/modules/anime/queries.ts:42`), it's just not persisted. Trivial schema add.
- **Ambient ED:** AnimeThemes.moe API (MIT-licensed, MAL ID keyed, 90 req/min, direct `.ogg` audio CDN at `a.animethemes.moe`) for the audio. `powerMonitor.getSystemIdleState()` is already in use in `app-stats-tracker.ts:351` — extend it. Setting + hidden `<audio>` element in renderer.

---

## Problem

User asked for honest feasibility on two ShiroAni features:

1. **OP/ED auto-skip** with crowd-sourced timestamps. Hard problem: streaming sites (ogladajanime.pl, shinden.pl) embed video players inside cross-origin iframes — same-origin policy normally blocks parent → iframe DOM access.
2. **Ambient ED loop** — when app idle 30s, softly play the ED of a recently-watched anime.

The user was specifically skeptical about the iframe access question and wanted code-level evidence before any design proceeds.

---

## Root Cause / Key Finding (Feature 1)

**Cross-origin iframe access _is_ possible from the Electron main process** — same-origin policy is browser-level, but Electron's main process has elevated capability. Two complementary APIs:

### `webFrameMain` (the answer)

[Electron docs — webFrameMain](https://www.electronjs.org/docs/latest/api/web-frame-main):

> "You can also access frames of existing pages by using the `mainFrame` property of `WebContents`."

Documented example (their words, not mine):

```js
const win = new BrowserWindow({ width: 800, height: 600 });
await win.loadURL('https://reddit.com');
const youtubeEmbeds = win.webContents.mainFrame.frames.filter(frame => {
  try {
    return new URL(frame.url).host === 'www.youtube.com';
  } catch {
    return false;
  }
});
```

That `frames` collection contains `WebFrameMain` instances for cross-origin children. Each exposes:

- `frame.url`, `frame.origin`, `frame.processId`, `frame.routingId`, `frame.detached`
- `frame.executeJavaScript(code, userGesture?)` → **runs `code` _inside_ the cross-origin frame's DOM context**
- `frame.framesInSubtree` for nested iframes (e.g. anime site → embed wrapper → final player)
- `frame.send(channel, args)` / `frame.postMessage(...)` for IPC if we run a preload there

### `did-frame-finish-load` (the hook)

`webContents.on('did-frame-finish-load', (event, isMainFrame, frameProcessId, frameRoutingId) => { ... })` lets us snapshot a frame the instant it finishes loading. Combined with `webFrameMain.fromId(frameProcessId, frameRoutingId)` we can target it precisely.

### Caveats (Electron 33+ behavior change)

[Breaking changes — Electron 33](https://www.electronjs.org/docs/latest/breaking-changes#behavior-changed-frame-properties-may-retrieve-detached-webframemain-instances-or-none-at-all):

- `webContents.mainFrame.frames` may return `null` or detached frames if accessed mid-navigation. Workaround: always use the `did-frame-finish-load` hook and check `frame.detached` before calling `executeJavaScript`.
- Stale `WebFrameMain` references may resolve to detached instances after navigation. Don't cache frame refs across navigations — re-resolve via `webFrameMain.fromId` each time.

### Subframe preload (the alternative we're NOT using)

`<webview nodeintegrationinsubframes preload="...">` exists but ShiroAni explicitly strips both at `apps/desktop/src/main/window.ts:164–172`:

```ts
webPreferences.nodeIntegrationInSubFrames = false;
delete webPreferences.preload;
```

Re-enabling subframe preload would expose Node APIs to every iframe on every site — security regression, not worth it. The `mainFrame.frames` traversal from main process is strictly better: zero attack surface increase, runs sandboxed JS, fully under our control.

---

## Evidence

### Codebase findings (already-built infra we can lean on)

- `apps/desktop/src/main/browser/browser-manager.ts:79-91` — `isWebTopFrame()` already discriminates http/https top-frames from local pages. Subframe injection should reuse this scope.
- `apps/desktop/src/main/browser/browser-manager.ts:223-291` — composite `webRequest.onHeadersReceived` already strips `X-Frame-Options` + `frame-ancestors` for streaming sites; the iframe injection capability lives orthogonal to this.
- `apps/desktop/src/main/ipc/browser.ts:160` — `mainWindow.webContents.on('did-attach-webview', (_event, webContents) => { ... })` is the spot to wire subframe injection per-webview.
- `apps/web/src/hooks/useWebviewEvents.ts:67-69` — there's already a `dom-ready` handler running `el.executeJavaScript(IFRAME_PATCH_SCRIPT)` from the renderer side. That script only patches `iframe.allow=` attributes; it cannot reach into iframes (renderer-side JS is same-origin-policy locked). Subframe code injection has to come from main process.
- `apps/web/src/lib/anime-detection.ts` — already detects ogladajanime.pl, shinden.pl, youtube.com URLs; provides `animeTitle`, `episodeInfo` via slug parsing. **We already know "is on player page" without any iframe inspection.**
- `apps/web/src/lib/scrape-metadata.ts` — precedent for "inject site-specific JS into the active webview" via `el.executeJavaScript()`. Same pattern, but for top-frame only.
- `apps/desktop/src/modules/library/library.service.ts:15-50` — `anime_library` SQLite table stores `anilist_id` only, **no `mal_id` column**.
- `apps/desktop/src/modules/anime/queries.ts:42` — AniList `ANIME_DETAILS_QUERY` already requests `idMal`. The data is fetched but discarded. Adding it to library is a small migration.
- `apps/desktop/src/main/stats/app-stats-tracker.ts:351` — `powerMonitor.getSystemIdleState(60)` already polls every 10s. Ambient ED idle trigger reuses this signal.
- `apps/desktop/src/main/discord/discord-rpc-service.ts:33-35` — pattern for "20s window-blur idle timer that fires presence change" — mirror this for ambient ED.

### API verification (live curl tests)

**AniSkip v2** — tested `GET https://api.aniskip.com/v2/skip-times/9253/1?types[]=op&types[]=ed&episodeLength=0`:

```json
{
  "found": true,
  "results": [
    {
      "interval": { "startTime": 638.489, "endTime": 728.489 },
      "skipType": "op",
      "skipId": "...",
      "episodeLength": 1418.624
    },
    {
      "interval": { "startTime": 1331.713, "endTime": 1421.713 },
      "skipType": "ed",
      "skipId": "...",
      "episodeLength": 1436.979
    }
  ],
  "message": "Successfully found skip times",
  "statusCode": 200
}
```

- Headers confirmed: `x-ratelimit-limit: 120` per minute, `access-control-allow-origin: *` (CORS open).
- Path: `/v2/skip-times/{malId}/{episodeNumber}` query: `types[]=op&types[]=ed&types[]=mixed-op&types[]=mixed-ed&types[]=recap&episodeLength={s}`. Pass `episodeLength=0` if unknown — server returns nearest match.
- License: **MIT** (verified via GitHub API on `aniskip/aniskip-api`).
- Submit endpoint exists at `POST /v2/skip-times/{malId}/{episodeNumber}` with `{skipType, providerName, startTime, endTime, episodeLength, submitterId(uuid)}`. Server validates `endTime > startTime`. We can crowd-source through the same DB.
- Skip types: `op`, `ed`, `mixed-op`, `mixed-ed`, `recap`. Recap skip = "skip the previous-episode flashback at the start of this episode."

**AnimeThemes.moe** — tested `GET https://api.animethemes.moe/anime?filter[has]=resources&filter[site]=MyAnimeList&filter[external_id]=9253&include=animethemes.song,animethemes.animethemeentries.videos.audio`:

```json
{
  "anime": [{
    "id":2761, "name":"Steins;Gate", "year":2011,
    "animethemes": [{
      "slug":"OP1", "type":"OP",
      "song": {"title":"Hacking to the Gate"},
      "animethemeentries": [{
        "videos": [{
          "link": "https://v.animethemes.moe/SteinsGate-OP1.webm",
          "audio": { "link": "https://a.animethemes.moe/SteinsGate-OP1.ogg", "size": 3690119 }
        }]
      }]
    }, ... ED1 ...]
  }]
}
```

- Headers: `x-ratelimit-limit: 90` per minute, `access-control-allow-origin: *` indirectly via Cloudflare; `cross-origin-resource-policy: cross-origin` so renderer-side `<audio>` can stream it.
- Direct CDN URLs: `a.animethemes.moe/{filename}.ogg` (audio-only, ~3-4 MB), `v.animethemes.moe/{filename}.webm` (video, ~50 MB).
- License of the API code: **MIT** (https://github.com/AnimeThemes).
- License of the _content_: per FAQ — "You cannot use AnimeThemes.moe for a competitive or commercial service without approval from the moderation team." ShiroAni is non-commercial OSS — fine, but document it and add an attribution surface; team reserves right to revoke.
- Coverage: every meaningful TV anime since the 80s. Steins;Gate, current-season shows, all there.

### Player host inventory (from existing `anime-detection.ts` + community sources)

ogladajanime.pl + shinden.pl iframe player hosts:

| Host              | Player                  | Reachability via `<video>`                                      |
| ----------------- | ----------------------- | --------------------------------------------------------------- |
| cda.pl            | Native HTML5 `<video>`  | Yes                                                             |
| mp4upload.com     | JWPlayer (HTML5 backed) | Yes via `document.querySelector('video')`                       |
| streamtape.com    | JWPlayer skin           | Yes                                                             |
| sibnet.ru         | Native `<video>`        | Yes                                                             |
| vidoza.net        | Custom (JWPlayer-like)  | Yes — has `video` element                                       |
| dood / doodstream | Native `<video>`        | Yes                                                             |
| yourupload        | Native `<video>`        | Yes                                                             |
| dailymotion.com   | DM SDK                  | Yes via `postMessage` API (different shape — handle separately) |
| youtube.com       | YouTube IFrame API      | Yes via `postMessage` (skip irrelevant — no anime OP/ED there)  |

**No DRM** on any fansub mirror — DRM is a Crunchyroll/Netflix concern, out of scope. MAL-Sync browser extension already proves these exact hosts are scriptable from the outside.

---

## Solution Options

### Feature 1 — OP/ED auto-skip

#### Option A — AniSkip API + main-process subframe injection (recommended)

Architecture:

1. **Main process subframe watcher** — new `apps/desktop/src/main/browser/player-skip.ts`:
   - On `did-attach-webview` (already wired in `ipc/browser.ts:160`), attach a `did-frame-finish-load` listener on the webview's `webContents`.
   - When a frame finishes load, check if its host matches the player allowlist (mp4upload, streamtape, etc.).
   - If yes, call `frame.executeJavaScript()` to install a tiny detector: `document.querySelector('video')` poll until `readyState >= 1`, then `postMessage` the `{currentTime, duration}` back to the parent, plus a `seek(t)` channel.
   - Store the `WebFrameMain` ref keyed by `webContents.id` for active seek calls. Re-resolve via `webFrameMain.fromId` on each use to dodge the Electron 33 detached-frame footgun.
2. **Renderer skip controller** — new `apps/web/src/features/player-skip/`:
   - `usePlayerSkip(paneId)` hook: subscribes to main-process events `player-skip:metadata-ready`, `player-skip:time-update`. Cross-references with `useLibraryStore` entry → fetches AniSkip times → renders the overlay.
   - Skip overlay component sits _outside_ the iframe (positioned over the webview using bounding rect). Renderer overlay because injecting React-rendered UI into a cross-origin iframe is hostile and brittle.
3. **AniSkip client** — new `apps/desktop/src/modules/aniskip/aniskip-client.ts`:
   - `getSkipTimes(malId, episode, episodeLength)` → `https://api.aniskip.com/v2/skip-times/{malId}/{ep}?types[]=op&types[]=ed&episodeLength={s}`.
   - In-memory TTL cache keyed by `${malId}:${ep}` (mirror `anilist-client.ts` pattern).
   - Optional `submitSkipTime(...)` for the crowd-source UI. Stores submitter UUID in user settings (one per device).
4. **MAL ID gap fix** — DB migration:
   - Add `mal_id INTEGER` column to `anime_library` table.
   - Backfill on next AniList fetch by reading `idMal` from `ANIME_DETAILS_QUERY` (already present, line 42).
   - Update `LibraryService.rowToEntry`, `AnimeEntry`, `LibraryAddPayload` types in `packages/shared/src`.
5. **Episode number** — already detected in `anime-detection.ts:69` for ogladajanime; extract similarly for shinden's `/episode/{id}-{slug}` route. Pass to skip controller.
6. **Episode length** — read `video.duration` once `loadedmetadata` fires inside the iframe via the injected detector.

Pro:

- Uses real, MIT-licensed, 5-year-mature data source. ~120 req/min headroom is plenty (1 req per ep open).
- We get crowd-sourcing for free via the existing AniSkip submit endpoint — no need to host our own DB.
- Main-process subframe injection is documented, official, and side-steps SOP without weakening security defaults.
- Renderer overlay UI = full React, full ShiroAni theme.

Con:

- AniSkip coverage is mostly mainstream/popular anime. Niche shows may have no entry. UX must degrade gracefully (show a "submit OP/ED times" button and call AniSkip POST).
- Polish anime sites use slugs, not MAL IDs in URLs. We'll get title from URL but need library entry to bridge to MAL ID. If the user is watching anime _not_ in their library, we either:
  - Auto-add it (matches ShiroAni's "anime tracker" thesis), or
  - Show "Add to library to enable skip" CTA.
- Adblock interaction: anti-adblock guards on some hosts (mp4upload occasionally) inject decoy `<video>` elements. Detector must filter to the largest/playing video, not the first.

#### Option B — Crowd-source from our own users only

Build a Postgres-backed API in `apps/bot` (already has Postgres). Users mark OP start/end → stored on our backend.

Pro: Full control. No third-party dependency.

Con: Cold-start. Years of user growth before coverage matches AniSkip. **AniSkip is literally the open community DB that solved exactly this — re-implementing is wasted effort.**

#### Option C — Audio fingerprinting

Detect OP/ED from audio signature (Shazam-style). Massive scope: needs real-time audio capture from the iframe video, fingerprint DB, sub-second matching. **Not viable** in v1.

**Recommendation: Option A.**

---

### Feature 2 — Ambient ED loop when app idle 30s

#### Option A — AnimeThemes.moe + hidden renderer `<audio>` (recommended)

Architecture:

1. **Idle trigger (main process)** — extend `app-stats-tracker.ts` or add a new `apps/desktop/src/main/ambient-audio/idle-watcher.ts`:
   - Reuse the existing 10s tick interval (`TICK_INTERVAL_MS`, line 15).
   - When `powerMonitor.getSystemIdleState(30) === 'idle'` AND ambient setting enabled AND no media currently playing in any webview → emit IPC `ambient:trigger`.
   - When `'active'` again → emit `ambient:stop`.
   - "Media currently playing in any webview": mainFrame.executeJavaScript a poll of `Array.from(document.querySelectorAll('video,audio')).some(el => !el.paused)` against each webview, OR simpler — track the existing `isWatchingAnime` flag and the user's _interaction with the webview_ (we already have `did-start-loading` events). Pragmatic: if `isWatchingAnime === true && win.isFocused() === false` → don't trigger.
2. **Anime selection (renderer)** — new `apps/web/src/features/ambient-ed/select-anime.ts`:
   - Pull from `useLibraryStore` filtered by status. Order: _currently watching_ (most recent updatedAt) → _completed_ (random). Skip `dropped`/`plan_to_watch`.
   - Cache the selected anime's MAL ID + theme list per session.
3. **AnimeThemes client** — new `apps/desktop/src/modules/animethemes/animethemes-client.ts`:
   - `getThemes(malId)` → `https://api.animethemes.moe/anime?filter[has]=resources&filter[site]=MyAnimeList&filter[external_id]={malId}&include=animethemes.song,animethemes.animethemeentries.videos.audio`.
   - Pick `type === 'ED'` (fall back to `OP` if no ED), prefer entry with `nsfw === false && spoiler === false`.
   - Return `{ audioUrl, songTitle, animeName }`.
4. **Audio shell (renderer)** — new `apps/web/src/components/ambient/AmbientAudioPlayer.tsx`:
   - Single `<audio>` tag in the React tree (mounted at app root).
   - On `ambient:trigger` IPC: fetch theme, set `audio.src`, fade-in volume from 0 → setting (default 0.15) over 3000ms.
   - On `ambient:stop`: fade-out over 1000ms, pause.
   - Loop the audio (`audio.loop = true`).
5. **Settings (renderer)** — extend `useSettingsStore.ts`:
   - `ambientEdEnabled: boolean` (default **false** — opt-in, intrusive otherwise).
   - `ambientEdVolume: number` (0.05–0.5 range, default 0.15).
   - `ambientEdSelection: 'currently_watching' | 'completed_random' | 'last_finished'` (default `'currently_watching'`).
6. **Theme accent shift** — optional: while playing, briefly tint the bg-store theme to the show's `coverImage` color (we already have `apps/web/src/stores/useBackgroundStore.ts`). Defer to v2.

Pro:

- Audio-only OGG = 3-4 MB. Streams instantly, low bandwidth.
- AnimeThemes coverage is _enormous_; every show in someone's library will have a theme.
- All audio playback in renderer = no native packaging concerns. Hidden `<audio>` element is the simplest possible shell.
- Reuses existing idle-detection plumbing — no new powerMonitor wiring.

Con:

- AnimeThemes ToS reserves revocation right. Mitigation: graceful failure, ship with attribution surface ("Theme: {song} from {anime} — via AnimeThemes.moe"), no aggressive caching of audio files (just standard HTTP cache headers).
- "Don't stomp on YouTube the user left open" requires checking `<video>/<audio>` in subframes — adds an extra mainFrame.frames sweep. Acceptable; runs only at idle-trigger time.
- Cross-platform behavior of `getSystemIdleState` is OS-dependent; macOS/Windows reliable, Linux varies. We already use it in stats — same risk profile, no new platform issues.

#### Option B — User-uploaded audio

User picks a folder of MP3s. Random pick when idle.

Pro: Zero third-party dependency.

Con: Major friction (most users won't upload anything). AnimeThemes is right there.

#### Option C — yt-dlp / youtube embed

Pull ED from official anime channels on YouTube. ShiroAni's sister project Shiranami already uses yt-dlp.

Pro: Larger coverage incl. recent shows that AnimeThemes hasn't ingested.

Con: yt-dlp packaging is heavy (50MB+ binary, OS-specific builds, signing concerns); embedded YT iframe = autoplay restrictions + ad insertion. AnimeThemes is purpose-built and adds zero deps.

**Recommendation: Option A.**

---

## Recommended Approach (combined)

Ship in **three tiers**:

### MVP (Feature 1 — OP/ED skip, ~5-7 days work)

Goal: visible skip button on ogladajanime.pl + shinden.pl when AniSkip has data.

- **DB:** Add `mal_id` column to `anime_library` table (migration). Update shared types.
- **Backfill:** When LibraryService fetches AniList details, persist `idMal` from the existing query response.
- **Main process:** New `apps/desktop/src/main/browser/player-skip.ts`:
  - Hooks into existing `did-attach-webview` to register `did-frame-finish-load` per webview.
  - Maintains `Map<webContentsId, FrameInfo>` of player frames.
  - Exposes IPC `player-skip:fetch-skip-times`, `player-skip:seek`, event `player-skip:player-state`.
- **AniSkip client:** New `apps/desktop/src/modules/aniskip/`. Pattern-match `anilist-client.ts`. Cache, error handling, rate-limit awareness.
- **Renderer:** New `apps/web/src/features/player-skip/`:
  - `usePlayerSkip(paneId)` — subscribes to main IPC, fetches AniSkip when player metadata arrives, renders `<SkipButton />` overlay.
  - Overlay positioned absolutely over the webview using getBoundingClientRect on the iframe element (we already enumerate iframes in `IFRAME_PATCH_SCRIPT`).
- **Polish:** Animated countdown 5s before OP, "Skip OP" / "Skip ED" Polish copy, settings toggle.

### V2 (Feature 1 polish + Feature 2 MVP, ~3-5 days)

- **Crowd-source UI:** "OP starts here" / "OP ends here" buttons + AniSkip POST. UUID submitter ID stored in settings.
- **Player hosts beyond ogladaj/shinden:** dailymotion via postMessage, additional fansub mirrors as users surface them.
- **Ambient ED MVP:**
  - AnimeThemes client.
  - Idle trigger (extend app-stats-tracker).
  - Settings entries.
  - Hidden `<audio>` + fade.
  - Default OFF.

### V3 (delight, ~2-3 days)

- **Theme accent during ED** — tint bg-store from cover color while playing.
- **OP/ED skip stats** in app-stats — "saved you 4h 12min of openings this week."
- **Better player detection** — auto-detect the playing video (largest, currentTime > 0) when site has decoy videos.
- **Recap skip type** — surface separately ("Skip recap?" earlier in episode).

---

## Files to Modify

### Feature 1 — OP/ED skip

- `apps/desktop/src/modules/library/library.service.ts` — add `mal_id` to row shape; expose in `rowToEntry`.
- `apps/desktop/src/modules/library/library.module.ts` _(or wherever migrations live)_ — add column migration.
- `packages/shared/src/types/anime.ts` _(or equivalent)_ — add `malId?: number` to `AnimeEntry`, `LibraryAddPayload`.
- `apps/desktop/src/modules/anime/anime.service.ts` — when handling AniList details, propagate `idMal` to library upserts.
- `apps/desktop/src/modules/aniskip/aniskip-client.ts` — **new file**. HTTP client + cache.
- `apps/desktop/src/modules/aniskip/aniskip.module.ts` — **new file**.
- `apps/desktop/src/main/browser/player-skip.ts` — **new file**. `did-frame-finish-load` watcher, frame-scoped detector script, IPC bridge.
- `apps/desktop/src/main/ipc/player-skip.ts` — **new file**. IPC handlers for `player-skip:*`.
- `apps/desktop/src/main/ipc/register.ts` — wire the new IPC handlers.
- `apps/desktop/src/main/preload/player-skip.ts` — **new file**. Expose `electronAPI.playerSkip`.
- `apps/web/src/features/player-skip/usePlayerSkip.ts` — **new file**. Renderer hook.
- `apps/web/src/features/player-skip/SkipButton.tsx` — **new file**. Overlay component.
- `apps/web/src/components/browser/BrowserView.tsx` _(or wherever the webview is wrapped)_ — mount `<SkipButton />` overlay alongside the webview per active pane.
- `apps/web/src/stores/useSettingsStore.ts` — add `opEdSkipEnabled`, `autoSkipEnabled`, `skipCountdownSeconds`.
- `apps/web/src/lib/anime-detection.ts` — extend `detectShinden` to extract episode number (currently only extracts title slug).

### Feature 2 — Ambient ED

- `apps/desktop/src/modules/animethemes/animethemes-client.ts` — **new file**.
- `apps/desktop/src/modules/animethemes/animethemes.module.ts` — **new file**.
- `apps/desktop/src/main/ambient-audio/idle-watcher.ts` — **new file** (or extend `app-stats-tracker.ts`).
- `apps/desktop/src/main/ipc/ambient-audio.ts` — **new file**.
- `apps/desktop/src/main/preload/ambient-audio.ts` — **new file**.
- `apps/web/src/features/ambient-ed/AmbientAudioPlayer.tsx` — **new file**.
- `apps/web/src/features/ambient-ed/useAmbientEd.ts` — **new file** (selection logic).
- `apps/web/src/App.tsx` _(or root)_ — mount `<AmbientAudioPlayer />` once.
- `apps/web/src/stores/useSettingsStore.ts` — add `ambientEdEnabled`, `ambientEdVolume`, `ambientEdSelection`.

---

## Reference Files (do not modify, but read first)

- `apps/desktop/src/modules/anime/anilist-client.ts` — TTL cache + GraphQL retry pattern. Mirror for AniSkip + AnimeThemes clients.
- `apps/desktop/src/modules/anime/queries.ts:38-121` — `ANIME_DETAILS_QUERY` already returns `idMal` (line 42); we just don't persist it.
- `apps/desktop/src/main/discord/discord-rpc-service.ts:33-35,270-296` — idle timer + reconnect pattern. Same shape for ambient ED debounce.
- `apps/desktop/src/main/stats/app-stats-tracker.ts:299-374` — idle-state polling already wired. Reuse the tick.
- `apps/desktop/src/main/browser/browser-manager.ts:79-91,232` — top-frame protocol gating. Skip injection should respect the same scope.
- `apps/web/src/lib/scrape-metadata.ts` — site-specific JS injection precedent (top-frame only currently). Skip detector follows the same shape but in main process per subframe.
- `apps/web/src/hooks/useWebviewEvents.ts:30-50` — `IFRAME_PATCH_SCRIPT` shows we already enumerate iframes from the renderer. The bounding-rect for the skip overlay can use the same enumeration.

---

## Risks & Gotchas

### Feature 1

- **Electron 33+ detached frames** — always `if (frame.detached) return;` before `executeJavaScript`. Re-resolve via `webFrameMain.fromId` per call; don't cache `WebFrameMain` references across navigations.
- **Anti-adblock decoy videos** — sites occasionally inject hidden `<video>` elements that aren't the real player. Detector should filter by `videoWidth > 0 && videoHeight > 0 && currentTime > 0` and pick the largest playing one.
- **Rate-limit cooperation** — AniSkip's 120 req/min is shared by the IP. Cache aggressively (per-episode TTL forever, since OP/ED times don't change). De-dupe in-flight requests.
- **MAL ID coverage gap** — AniList → MAL ID coverage is high (95%+) but not 100%. For shows with `idMal === null`, skip silently, no error noise.
- **Episode length unknown when AniSkip queried** — pass `episodeLength=0`; AniSkip returns the closest match. If actual `video.duration` differs >5%, log warning and consider re-querying with the actual length once metadata loads (but this is rare).
- **Polish copy** — all UI text in Polish per project convention. "Pomiń intro / outro / streszczenie".
- **Per-pane skip state** — ShiroAni supports split-view tabs (multiple webviews simultaneously). Skip controller must be paneId-scoped.
- **Fullscreen iframe** — when user fullscreens the player, our renderer overlay disappears (it's outside the webview). Acceptable degradation; overlay reappears on exit. Alternative: inject overlay HTML into the iframe via `executeJavaScript`. Discuss for V2.
- **Submit endpoint abuse risk** — AniSkip enforces server-side validation (we saw the `check_end_time` constraint). Submit submission requires user gesture + visible review step ("does this look right?") to prevent garbage data.

### Feature 2

- **AnimeThemes ToS revocation risk** — ship with attribution + a feature kill-switch (settings toggle that can be remotely disabled if it ever comes to that). Don't bundle their CDN URLs as baked-in constants — fetch fresh.
- **Audio autoplay policy** — Chromium autoplay-on-user-gesture rules. Since the app is launched by the user's gesture, the first `audio.play()` should succeed. Test cold-start case (app launched via OS auto-start at login).
- **Volume ducking** — when user resumes activity, fade-out before pausing. Don't hard-stop, jarring.
- **Idle false-positives** — `getSystemIdleState` returns `idle` based on OS-level mouse/keyboard. If the user is reading a long article in the webview without touching anything, we'd trigger ambient ED. Mitigate: also require `win.isFocused() === false` (user is in another app), not just OS idle.
- **Don't stomp on YouTube/active media** — before triggering ambient, sweep all webview frames for `<video>/<audio>` with `!paused` and bail if any. Cheap one-time `executeJavaScript` per frame.
- **Settings default OFF** — feature is intrusive. Onboarding should surface it once, not enable silently.
- **Cross-platform idle accuracy** — Linux is flaky. Document; matches existing app-stats behavior.

---

## How to Verify

### Feature 1 — OP/ED skip

1. **Subframe access check:** Build a debug command. Load `https://ogladajanime.pl/anime/steins-gate/1` in webview. From devtools of the main process (or via a temporary IPC handler), enumerate `webContents.mainFrame.framesInSubtree.map(f => ({ url: f.url, origin: f.origin }))`. Confirm we see `mp4upload.com` / `streamtape` / etc. cross-origin frames.
2. **Inject test:** From the same handler, on the player frame call `frame.executeJavaScript('document.querySelectorAll("video").length')`. Should return `1` once the player loaded.
3. **Read currentTime:** `frame.executeJavaScript('document.querySelector("video").currentTime')`. Should return a number.
4. **Seek test:** `frame.executeJavaScript('document.querySelector("video").currentTime = 90')`. Should jump to 1:30.
5. **AniSkip integration:** Load Steins;Gate ep 1, open library entry, manually inject `mal_id = 9253`, watch for the skip button to appear at 638s.
6. **Negative case:** Load a show not in AniSkip — confirm no skip button + no error toast.

### Feature 2 — Ambient ED

1. **Idle detect:** Set ambientEdEnabled=true. Switch to another app for 30s. Confirm IPC `ambient:trigger` fires.
2. **Audio plays:** Hidden `<audio>` element source resolves to `a.animethemes.moe/...ogg`, network tab shows the request, audio is audible at low volume.
3. **Fade in/out:** Switch back to ShiroAni. Audio fades out within 1s, doesn't hard-stop.
4. **Don't stomp test:** Open YouTube in webview, play a video, switch away. Confirm ambient does NOT trigger.
5. **Setting OFF default:** Fresh install — confirm ambient never plays without explicit opt-in.

---

## Open Questions

- **Crowd-source policy for AniSkip POST:** do we auto-submit or require explicit "submit this" click? Recommend: explicit click with a confirmation modal showing the proposed times. User trust > frictionless contribution.
- **Library-not-tracked anime:** when user is on shinden.pl/episode/... for a show not in their library, do we (a) auto-add to plan-to-watch, (b) silently fetch AniSkip via title-search → MAL match, or (c) show "add to library to enable skip"? Lean toward (c) for v1 — keeps the tracker thesis intact.
- **Discord RPC interaction:** while ED is playing, should we update RPC to `Listening to {song} from {anime}`? Cute, but probably overreach for v1.
- **Ambient ED on multiple monitors:** if ShiroAni window is on monitor 2 and user is using monitor 1, OS may report idle. Acceptable behavior is debatable. Match existing app-stats semantics.
- **AnimeThemes pre-approval:** worth a courtesy email to AnimeThemes mods before shipping? FAQ doesn't require it for non-commercial OSS, but goodwill.
- **Fullscreen overlay (Feature 1 V2):** inject the skip button into the iframe DOM via `executeJavaScript` so it survives fullscreen, or live with the disappearance? Brittle to inject — many sites strip injected elements via MutationObserver. Ship without first.
