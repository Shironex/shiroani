# Research: Unique Feature Ideation — Post Split-View

**Date:** 2026-04-28
**Agent:** kirei
**Status:** complete
**Trigger:** Just shipped tab-drag split-view (PR #65). Looking for the next 8–15 "huh, only ShiroAni does that" features.

---

## Problem

ShiroAni is an Electron app + anime tracker + ad-blocking browser + Discord-RPC + chibi mascot, all wrapped in one window. The tab-drag split-view that just landed is the first feature that genuinely couldn't exist anywhere else — it leverages the embedded Chromium tree of `<webview>` panes the way no anime tracker can.

The question: where else are there **seam moments** between watching, tracking, discovering, and sharing — moments a website-only tracker (AniList, MAL) physically can't touch — and what small, opinionated, otaku-native features can land there next?

## Current Surface Area (what already exists)

Mapped from the codebase to anchor ideation against real touch points.

### Browser layer (the killer feature)

- `apps/desktop/src/main/browser/browser-manager.ts` — isolated `persist:browser` session, Ghostery adblocker (EasyList + EasyPrivacy), iframe-unblocking webRequest handler, Firefox UA spoof for Google auth, granted permissions: `media`, `mediaKeySystem`, `fullscreen`, `pointerLock`, `clipboard-sanitized-write`.
- `apps/web/src/stores/useBrowserStore.ts` — recursive `BrowserNode` tree with `leaf | split` variants, `splitTabs`/`unsplitTab`/`setSplitRatio` actions, focus-pane tracking, persisted tabs across launches.
- `apps/web/src/components/browser/BrowserTabBar.tsx` — `dnd-kit` with custom split-aware collision detection (inner 60% of a tab triggers merge-into-split).
- `apps/web/src/components/browser/BrowserView.tsx` — webview portal-layer trick: `<webview>` lives in a never-detached container while DOM slots are read via `getBoundingClientRect`, so split/unsplit doesn't reload the page.
- `apps/web/src/lib/scrape-metadata.ts` — site-specific DOM scrapers (ogladajanime.pl, anilist.co, myanimelist.net, shinden.pl) + og:image fallback, run via `webview.executeJavaScript()` from `AddToLibraryDialog`.

### Tracker integration

- `apps/web/src/lib/anime-detection.ts` — URL-pattern detection for ogladajanime.pl, shinden.pl, youtube.com → emits Discord RPC presence + flags `setWatchingAnime(true)` for stats.
- `apps/web/src/hooks/useWebviewEvents.ts` — listens to `did-navigate`, `did-navigate-in-page`, `page-title-updated`, `page-favicon-updated`, fullscreen events; per-pane.
- `apps/desktop/src/main/stats/app-stats-tracker.ts` — three-tier counter: `appOpenSeconds` / `appActiveSeconds` / `animeWatchSeconds` (only when an anime tab is focused), `longestSessionSeconds`, daily buckets up to 365 days, currentStreak/longestStreak. Already feeds `ActivityHeatmap.tsx`.
- `apps/desktop/src/modules/library/library.service.ts` — better-sqlite3, `resume_url` field stored per entry (clicked from `AnimeDetailModal` to jump back to last watched URL).

### Discord layer

- `apps/desktop/src/main/discord/discord-rpc-service.ts` — `@xhayper/discord-rpc`, 15s rate-limit aware, idle-after-blur, custom-template engine.
- `apps/desktop/src/main/discord/discord-presence-builder.ts` — variable substitution `{anime_title}`, `{episode}`, `{site_name}`, `{library_count}`, AniList button auto-attached when `anilistId` is known.
- `apps/web/src/components/profile/renderProfileCard.ts` — Canvas-rendered 800×420 share card (Spy×Family palette), saves PNG via `app.fetchImageBase64` IPC.

### Ambient/native layer

- `apps/desktop/src/main/mascot/overlay.ts` — Win32-only chibi overlay window, animated sprite sheets via C++ napi-rs addon, position lock, context menu.
- `apps/desktop/src/main/notifications/notification-service.ts` — NestJS-driven schedule + Electron Notifications.
- `apps/desktop/src/main/index.ts` — `powerMonitor` already wired for suspend/resume → stats pause.
- `shiroani-bg://` privileged custom protocol for backgrounds.
- 39 themes + visual editor (`ThemeEditorDialog.tsx`).

### Feed + diary + discover

- RSS ingestion (`feed-parser.service.ts` with rss-parser, default sources seeded), bookmark store, "unread since lastVisitedAt" newtab greeting.
- Diary: TipTap editor with mood pills (sakura/twilight/ocean/matcha/...), gradient covers, anime link.
- Discover: AniList trending/popular/seasonal/random, genre picker, random carousel.

### What websites physically cannot do

The embedded-browser advantages currently in use are:

1. Read DOM of any visited page (`executeJavaScript` from main).
2. Rewrite response headers (CSP/X-Frame-Options stripping) so player iframes work.
3. Run an adblocker as an Electron session middleware.
4. Detect URL changes across two tabs at once (split-view) and act on both.
5. Trigger native Notifications, Discord RPC, mascot animation.
6. Persist data via better-sqlite3 (no auth, no quota, no sync friction).
7. Track focused-window time via OS-level `powerMonitor.getSystemIdleState`.

Most of these advantages are **only partially used today**. The ideas below mine that gap.

---

## Seam Moments (where small features create disproportionate delight)

A "seam moment" is a transition where the user's mental state changes and a tiny piece of glue would feel magical. Mapped from the user journey:

| Moment                                | Today                                                         | Seam (what's missing)                                                                            |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| About to watch                        | User opens browser tab, types/picks site                      | App could open the right episode for them based on `currentEpisode + 1`                          |
| First seconds of an episode           | Webview loads, user clicks play                               | App could scrape the player and persist watch progress / detect ep-change                        |
| Mid-episode                           | Watching, no integration                                      | Mascot could "watch with you", chat could ambient-overlay, screenshots could become diary covers |
| Credits/ED rolls                      | User leaves tab                                               | App could detect end-of-video and prompt "next ep / mark watched / rate"                         |
| Right after finishing                 | User has to manually open library, find entry, change ep, x/x | One-click "I just watched ep N" prompt                                                           |
| Tracking session — moving between eps | Manual nav back to history/new tab                            | "Continue Watching" rail with deep-link URLs                                                     |
| Discovering something new             | Discover view, scroll, click external                         | Hover-preview from cover art (peek), in-place trailer, taste-graph                               |
| After finishing an entire show        | Manual diary entry                                            | "Series wrapped" prompt with auto-stats                                                          |
| Sharing                               | ProfileShareDialog, manual                                    | Auto-generated season recap, RPC deep-link to friends, OBS overlay                               |
| Ambient (app open, user browsing)     | Mascot idles                                                  | Mascot could react to events; theme could shift to current anime palette                         |
| Discord community                     | RPC presence shows                                            | Bot could react to RPC presence (currently-watching role, watch-club detection)                  |

---

## Feature Ideas — 13 Concrete Concepts

Grouped by theme. Each with: pitch / user moment / why-only-ShiroAni / implementation sketch / effort.

### Theme A — Watching companion (mid-episode delight)

#### A1. **Side-pane "Watch Notes" — finish the split-view loop**

- **Pitch:** Drag a tab onto an empty pane to split. Drag the diary onto a pane to split with **a live diary entry**, scoped to the anime detected in the other pane.
- **Moment:** Mid-episode, user wants to jot "lol Anya cooking scene goes hard" without leaving the player.
- **Only ShiroAni:** Split-view already exists; the diary already exists; Tiptap already has the gradient/mood picker; anime detection already maps URL → anime. Three primitives already built — just connect them as a special split-pane "kind".
- **Sketch:** Extend `BrowserNode` with a third leaf kind `'diary'` that renders `<DiaryEditor>` instead of `<webview>`. `useWebviewEvents` resolves the sibling pane's anime, passes it into the editor's `linkedAnimeId`. New "drop diary onto tab" affordance in the side dock or via a "split with notes" button next to the existing `Columns2` icon in `BrowserView.tsx`.
- **Effort:** **M** (1–2 days). Reuses 80% of the split machinery.

#### A2. **Auto-screenshot → diary cover ("Cap this moment")**

- **Pitch:** Floating ⌘⇧3-style button on the active webview pane: captures the current `<webview>` frame, opens a diary entry with the screenshot pre-filled as cover.
- **Moment:** "Holy shit that frame was beautiful" → 0-friction journaling with the actual frame.
- **Only ShiroAni:** Electron's `webContents.capturePage()` returns a `NativeImage` — websites can't screenshot their own video element across CORS, and OS screenshots don't know what anime/episode you were on. ShiroAni's anime-detection already knows. Persist as base64 (or to userData) and link the resulting diary entry to the library entry.
- **Sketch:** Toolbar button in `BrowserToolbar.tsx` next to `BookmarkPlus`. New IPC `browser:capture-pane` → main process calls `webContents.fromId(paneId).capturePage()`. Wire the resulting PNG into a new diary entry (replace `coverGradient` with `coverImage`), prefill `linkedAnimeId` from `detectAnimeFromUrl`. Bonus: tag it `mood: love` by default.
- **Effort:** **S** (4–6 hrs).

#### A3. **End-of-episode "Did you finish?" toast**

- **Pitch:** When a video player goes from playing → ended (or the user closes a known anime tab), pop a small toast: "Skończony odcinek 7? / Następny / Oceń". One click increments `currentEpisode` in the library.
- **Moment:** The 30 seconds after the ED rolls, when motivation to update tracking is highest and friction is lowest.
- **Only ShiroAni:** Browser tabs can run `executeJavaScript` to monitor the `<video>` element's `ended` event on the player iframe. Site-scoped scrapers already live in `scrape-metadata.ts`. Library write is local (no auth round-trip).
- **Sketch:** Inject a `MutationObserver`-based content script on `dom-ready` for known hosts (similar to `IFRAME_PATCH_SCRIPT` in `useWebviewEvents.ts`) that pings the renderer when `<video>.ended` fires. Renderer surfaces a `sonner` toast with three actions: increment, mark-completed-if-final, snooze. New `lib/end-of-episode.ts` for the script and host detection.
- **Effort:** **M** (1 day). Hardest part is robust video-element discovery inside cross-origin player iframes — may need to inject into subframes too (subFrame webview events are accessible).

#### A4. **Mascot reactions to your tab — Shiro-chan watches with you**

- **Pitch:** When anime detection fires, mascot switches to a "watching" sprite-sheet animation (popcorn, rapt expression). When `<video>.ended`, she does a tiny clap. When you mark an anime "completed", confetti animation.
- **Moment:** Ambient warmth — your desktop pet reacts to what you do, not just idles.
- **Only ShiroAni:** Mascot already runs as a Win32 overlay window with `setWin32Animation(sheetPath, frameCount, ...)` — it's literally designed for this. Hook into the existing `setWatchingAnime` signal and library mutations.
- **Sketch:** New `mascot/mascot-reactions.ts` that subscribes to `appStatsTracker.setWatchingAnime` calls and library `LibraryEvents.UPDATED` events. Maps to a small set of new sprite sheets (commission/draw 3-4 new poses). Throttled so it doesn't churn. Win-only matches existing overlay scope.
- **Effort:** **M** (1 day code + sprite sheet artwork). Sprites are the long pole.

---

### Theme B — Watch → track in zero clicks

#### B1. **"Resume" button as the primary New Tab action**

- **Pitch:** New tab page already shows quick-access sites. Replace the top of it with a "Continue watching" rail of the user's `status: 'watching'` library entries with `resumeUrl`. One click jumps directly to the player URL of the last episode.
- **Moment:** "I want to watch more of X" → today they pick a site, search, click; tomorrow it's one click.
- **Only ShiroAni:** `resumeUrl` is already stored per entry (`AnimeDetailModal.tsx`). Library is local, instant. AniList can't deep-link into a streaming site — ShiroAni can.
- **Sketch:** Hero rail in `apps/web/src/components/browser/NewTabPage.tsx`. Pulls `useLibraryStore(s => s.entries.filter(e => e.status === 'watching' && e.resumeUrl))`, sorts by `updatedAt`. Click → `navigate(entry.resumeUrl)`. Long-press / right-click → "ep N+1?" picker that rewrites the URL pattern (e.g. `/anime/slug/8` → `/anime/slug/9` for ogladajanime.pl).
- **Effort:** **S** (3–5 hrs). The episode-increment URL rewriter is the only fiddly bit and is host-specific.

#### B2. **Auto-tracking — "I noticed you watched ep 7"**

- **Pitch:** Anime detection already fires `setWatchingAnime(true)` when the URL matches. Extend it: if user spends >X minutes (say 15) with the active pane on `/anime/slug/N`, surface a one-click "mark ep N watched" notification when they leave the tab.
- **Moment:** The user almost always forgets to update progress. ShiroAni already knows. Stop pretending it doesn't.
- **Only ShiroAni:** `app-stats-tracker.ts` already tracks `animeWatchSeconds` per day. The detector already extracts episode number from URL slugs (`detectOgladajAnime` returns `episodeInfo`). Just plumb the time-on-page accumulator into a "saw enough of this episode" signal.
- **Sketch:** Add a per-pane "seen for N seconds" counter in the renderer (incremented in `setInterval` while pane is focused + URL matches a known episode pattern). When the URL changes away or the tab closes, if accumulator > threshold, dispatch `library/auto-progress-suggest` toast. User confirms or dismisses. Threshold per host is configurable (24-min show ≠ a 6-min recap). Do NOT auto-write — always confirm to avoid wrong-anime mistakes.
- **Effort:** **M** (1–2 days). Threshold tuning and "did the user actually watch or just leave the tab open" heuristic is the real work.

#### B3. **Cross-site resolver — "Open in a different streaming site"**

- **Pitch:** Right-click any anime cover (in library, in discover, in the schedule) → "Otwórz w… ogladajanime / lycoris / shinden / YouTube search". Builds the slug-friendly URL per site and opens a new tab.
- **Moment:** "lycoris is down today, where else can I watch this?" — currently the user manually retypes the title into another site's search.
- **Only ShiroAni:** ShiroAni knows the canonical title (from AniList) AND has a browser to deep-link into. AniList doesn't host streaming.
- **Sketch:** New `lib/streaming-deeplinks.ts` with per-host URL builders (e.g. `ogladajanime: title => 'https://ogladajanime.pl/?subaction=search&story=' + encodeURI(...)`). Reused from `AnimeCard`, `DiscoverCard`, `AnimeInfoDialog` context menus. The browser is already there to receive the deep link.
- **Effort:** **S** (3–5 hrs).

---

### Theme C — Discord / community magic

#### C1. **"Ogląda razem ze mną" — RPC-aware Discord watch parties**

- **Pitch:** When two ShiroAni users in the same Discord guild are watching the same anime (matched by AniList ID via Discord RPC), the bot pins a thread "[user A] i [user B] oglądają teraz Naruto S2 ep. 17 — dołącz?" with a 1-click "open in your ShiroAni" deep link.
- **Moment:** Async watch party — find your friends mid-watch, tag along.
- **Only ShiroAni:** RPC presence already includes `anilistId`. Bot already exists in NestJS. Custom URL scheme handler can deep-link `shiroani://watch/<anilistId>?url=<resumeUrl>`. AniList/MAL can't make Discord aware of "what episode" because they don't run on the desktop.
- **Sketch:** Discord bot module new `watch-along.module.ts` (NestJS, mirror existing `leveling/`). Listens to `presenceUpdate` on its server, fingerprints the RPC application (ShiroAni's Discord client ID is already public: `1481042476402872361`), parses the AniList button URL (already in payload), groups by anilistId in Redis with a TTL. When ≥2 users overlap, post into a designated `#oglądamy-teraz` channel. Desktop side: register `shiroani://` protocol via `app.setAsDefaultProtocolClient`, route to `BrowserView.openTab`. Privacy switch in Discord settings.
- **Effort:** **L** (3–5 days). Bot module + protocol handler + privacy UX. Highest delight ceiling.

#### C2. **Profile-card auto-DM — "season wrapped"**

- **Pitch:** When the user marks an anime `completed`, `ProfileShareDialog` already generates a 800×420 PNG card. Auto-build a finer "show wrapped" card: cover, total watch time on this show, score, mood-of-diary-entries-while-watching, "started → finished" date range. One-click "copy" or "share to Discord" (Discord webhook URL configurable).
- **Moment:** "I just finished Frieren" — auto-celebration without opening a separate sharing flow.
- **Only ShiroAni:** Per-show watch time isn't tracked yet (only per-day buckets), but it's a small extension. ProfileShareDialog already does Canvas rendering with anime-themed palettes.
- **Sketch:** Extend `app-stats-tracker.ts` with an optional `byAnime: Record<anilistId, seconds>` bucket — incremented when `setWatchingAnime` is true AND active pane has a resolved anilistId. New `ShowWrappedDialog.tsx` re-using `renderProfileCard.ts` template. On `LibraryEvents.UPDATED` with `status: 'completed'`, surface a one-shot toast "podziel się?" linking to the dialog. Discord webhook posting is opt-in in Settings.
- **Effort:** **M** (1–2 days).

#### C3. **Discord RPC "join my browser" deep link**

- **Pitch:** Add a third RPC button: "Watch with me" → `shiroani://join/<sessionId>`. Friends with ShiroAni installed can mirror your tab in their browser (same URL — they'd watch independently, but in sync, like Twitch hype trains).
- **Moment:** Casual co-watching, no Watch2Gether/Teleparty needed for two people who both have ShiroAni.
- **Only ShiroAni:** Custom protocol + embedded browser = trivial deep-link. Spinning up a syncing experience without a screen-share permission.
- **Sketch:** Per-session UUID minted on first browser navigate, stored in main process. New RPC button URL = `shiroani://join/<sessionId>?host=<host>&url=<encoded>`. Receiver's protocol handler navigates a new tab. **Stretch:** light WebSocket sync of play/pause via `<webview>.executeJavaScript` injection of a heartbeat. Skip the stretch for v1 — the delight is "we landed on the same URL", not strict sync.
- **Effort:** **M** (1–2 days for the deep-link only; sync stretch is L).

---

### Theme D — Discovery + ambient delight

#### D1. **Cover-art hover preview ("peek") with embedded trailer**

- **Pitch:** In Discover, Library, Schedule — hovering an anime cover for 600ms pops a small floating panel with: synopsis, AniList score, **and the YouTube trailer auto-playing muted in a tiny inline `<webview>`** (200×112). Click → opens the trailer full-size in a new browser tab.
- **Moment:** Browsing the seasonal grid. Today the user clicks → modal → maybe gets a trailer link → clicks again → trailer opens in a new tab. Tomorrow it just appears.
- **Only ShiroAni:** A tiny `<webview>` in a hover popover is trivial in Electron, impossible/sketchy on web. AniList GraphQL already returns `Media.trailer { id, site }`.
- **Sketch:** New `<HoverPeekCard>` component used by `DiscoverCard`, `AnimeCard`, and `AiringEntry`. Lazy-mounts on hover. Renders an embedded YouTube player URL (`https://youtube.com/embed/<id>?autoplay=1&mute=1`) inside a `<webview partition="persist:browser">` so it inherits the adblock session — ad-free trailer previews. Trailer ID query lives in a new `TRAILER_QUERY` in `apps/desktop/src/modules/anime/queries.ts`, batched.
- **Effort:** **M** (1 day). The hover-debounce + tab-flicker prevention is the design polish.

#### D2. **Theme-of-the-anime — match palette to what you're watching**

- **Pitch:** When the user is actively watching anime X, `ThemesSection` offers "use Frieren palette" — auto-derived from the cover image's dominant colors. Optionally, the app subtly shifts the active theme accent while a watch session is active and reverts when it ends.
- **Moment:** Cozy ambient touch — the app feels co-curated with what's on screen.
- **Only ShiroAni:** 39 themes + a custom-theme editor (`useCustomThemeStore.ts`, `custom-theme-css.ts`) already exist. Cover URL is already cached per entry. Browser-DOM color extraction works in renderer.
- **Sketch:** New `lib/cover-palette.ts` using a tiny color-thief style algorithm (downscale cover to 32×32, k-means 3 clusters). Per-anime palette cached in the store. Settings toggle "Pasuj motyw do oglądanego anime" enables auto-shift. Reverts on idle/unfocus. Uses existing custom-theme CSS variable injection so no new theme system is needed.
- **Effort:** **M** (1–2 days). The "subtle shift not seizure" is the UX challenge — limit to accent + glow color, never full palette swap.

#### D3. **"Tylko 1 odcinek dziennie" mode — the 24-min reward**

- **Pitch:** Per-show streak cap. User toggles "ograniczenie 1 odcinek/dzień" on a library entry. After they've finished an episode (auto-detected or marked manually), the app dims the resume button until tomorrow ("Wracaj jutro 🌙"). Bonus mascot animation: Shiro-chan napping with a cup of tea.
- **Moment:** Anti-binge / pacing reward — the otaku version of Duolingo's streak. Frieren is meant to be savored, not finished in two days.
- **Only ShiroAni:** Library is local; can store per-anime daily limit + last-watched date. The browser is the gate — refusing to navigate is the enforcement, not a server flag.
- **Sketch:** New field `dailyEpisodeCap?: number` + `lastWatchedDate?: string` on `AnimeEntry` (additive migration in `apps/desktop/src/modules/library/library.service.ts`). UI toggle in `AnimeDetailModal`. Hook in `BrowserToolbar`'s `onAddToLibrary` flow + the New Tab Resume rail: refuse with a soft "Wracaj jutro" overlay if cap hit. Mascot cooldown sprite during the lockout.
- **Effort:** **M** (1 day).

---

### Theme E — Sharing / showing off

#### E1. **OBS browser-source overlay — "Now Watching" widget**

- **Pitch:** ShiroAni hosts a tiny local HTTP route (NestJS already runs on a known port — `getBackendPort()`) at `/overlay/now-watching` that returns an OBS-friendly HTML widget showing the currently-watching anime cover + episode + elapsed time, auto-updated via WebSocket. Streamers add it as a Browser Source.
- **Moment:** "I want to stream my anime watch-along on Twitch and have a cute corner widget" — currently impossible without manual scene edits.
- **Only ShiroAni:** NestJS server already runs locally; Socket.IO already powers the renderer. Anime detection already drives Discord RPC — the same signal can drive the overlay.
- **Sketch:** New module `apps/desktop/src/modules/overlay/overlay.module.ts` exposes a styled HTML page and a `now-watching` WebSocket channel. Reuses the same `DiscordPresenceActivity` payload feed. Theme editor lets users pick the overlay's accent color. Settings → Suite → "Twitch/OBS overlay" with a copy-the-URL button.
- **Effort:** **M** (1–2 days). CORS + dynamic port discovery for the OBS user is the real work.

#### E2. **Year recap — "ShiroAni Wrapped" auto-built every January**

- **Pitch:** On Jan 1, the app generates a Spotify-Wrapped-style scrollable recap: most-watched anime, total hours, longest streak, top mood, top genre, your "anime of the year" (highest-scored completed). Shareable PNG.
- **Moment:** End-of-year nostalgia bait. Twitter loves these. Free marketing.
- **Only ShiroAni:** `MAX_DAY_BUCKETS = 365` is already configured in `app-stats-tracker.ts` exactly for this. Library has scores, statuses, dates. Diary has moods + dates. Genres are cached from AniList. All local data → no privacy hand-wringing.
- **Sketch:** New view `apps/web/src/components/recap/RecapView.tsx`, gated to show only when `byDay` has ≥ 90 days. Uses the existing `renderProfileCard.ts` Canvas approach to produce a tall (1080×1920, IG-story-shaped) image. Per-slide animation in framer-motion. Triggered from a button in Settings (year-round) and a banner on Jan 1 (bot can announce in Discord too).
- **Effort:** **L** (3–5 days). Mostly design — the data is all there.

---

## Bonus: Two micro-features that are nearly free

#### M1. **"Picture-in-picture this player" button**

- Electron's `webview.executeJavaScript("document.querySelector('video').requestPictureInPicture()")` — already permitted by `picture-in-picture=*` Permissions-Policy in `browser-manager.ts`. Add a button on the active pane's chrome.
- **Moment:** Watching while doing something else in the same window.
- **Effort:** **XS** (1 hr).

#### M2. **Tab-group "study session" — split your library against your editor**

- Drop a library entry into a pane → opens its `resumeUrl`. Drop the diary into another pane. Save the layout as a named "session". Reopen with one click later.
- **Effort:** **S** (3–5 hrs) once A1 (diary-as-pane) lands.

---

## Recommended Approach — The 3 to ship next

If I had to pick the bets, weighted by `delight × feasibility / effort`:

### 🥇 Ship first: **A2. Cap this moment (auto-screenshot → diary cover)**

- **Why:** Smallest possible scope (S, ~4 hrs). Reuses two existing systems (capture + diary) with one new IPC. Produces an immediately shareable artifact (people post anime screenshots constantly). Single biggest "huh, only ShiroAni does that" per hour-of-work in the list.
- **Risk:** None of substance. `webContents.capturePage()` is documented and stable.

### 🥈 Ship second: **B1. Resume rail on New Tab**

- **Why:** S effort, immediately changes the browser's identity from "Chrome with adblock" to "anime-shaped browser". Touches the user every single session.
- **Risk:** Episode-URL incrementer is host-specific and brittle if those sites restructure. Solution: ship without the increment first, just the resume URL.

### 🥉 Ship third: **A1. Diary-as-split-pane**

- **Why:** Hardest of the three (M effort) but the deepest moat. Reuses split-view (the most novel thing the app does). Finishes the loop "watching ↔ journaling" the diary feature was always trying to enable.
- **Risk:** `BrowserNode` shape changes — needs care so existing persisted tab trees don't break (additive `kind: 'diary'` works; the union type is the seam).

**Wildcard / stretch bet:** **C1. RPC-aware Discord watch parties.** Highest ceiling for "did you see what ShiroAni does?" virality, but L-effort and depends on having ≥2 active users in the same guild watching at the same time — currently rare. Better to ship A2 + B1 + A1 first to seed those moments, then come back to C1.

---

## Files to Modify (per idea, summary)

Cross-reference for the build/forge agent.

- **A1 (diary pane):** `packages/shared/src/types/browser.ts` (extend `BrowserLeafNode` kind union), `apps/web/src/components/browser/BrowserView.tsx` (slot renderer switch), new `apps/web/src/components/browser/DiaryPane.tsx`, `apps/web/src/stores/useBrowserStore.ts` (`splitWithDiary` action).
- **A2 (capture moment):** `apps/desktop/src/main/ipc/browser.ts` (new `browser:capture-pane` handler), `apps/desktop/src/main/preload/browser.ts` (expose), `apps/web/src/components/browser/BrowserToolbar.tsx` (new button), new `apps/web/src/lib/capture-to-diary.ts`.
- **A3 (end-of-episode toast):** new `apps/web/src/lib/end-of-episode.ts` (content script), `apps/web/src/hooks/useWebviewEvents.ts` (inject on dom-ready for known hosts).
- **A4 (mascot reactions):** new `apps/desktop/src/main/mascot/mascot-reactions.ts`, sprite-sheet assets in `assets/mascot/`.
- **B1 (resume rail):** `apps/web/src/components/browser/NewTabPage.tsx`, `apps/web/src/lib/episode-url-rewriter.ts` (new).
- **B2 (auto-progress):** `apps/web/src/lib/anime-detection.ts` (extend), `apps/web/src/hooks/useWebviewEvents.ts` (timer), `apps/web/src/lib/auto-progress.ts` (new heuristic).
- **B3 (cross-site resolver):** new `apps/web/src/lib/streaming-deeplinks.ts`, context-menu wiring in `AnimeCard.tsx`, `DiscoverCard.tsx`, `AiringEntry.tsx`.
- **C1 (watch parties):** new `apps/bot/src/modules/watch-along/` (NestJS module), `apps/desktop/src/main/index.ts` (`app.setAsDefaultProtocolClient('shiroani')`), new `apps/desktop/src/main/protocol-handler.ts`.
- **C2 (show wrapped):** `apps/desktop/src/main/stats/app-stats-tracker.ts` (`byAnime` bucket), new `apps/web/src/components/library/ShowWrappedDialog.tsx`, extend `apps/web/src/components/profile/renderProfileCard.ts`.
- **C3 (join my browser RPC):** `apps/desktop/src/main/discord/discord-presence-builder.ts` (third button), protocol handler same as C1.
- **D1 (hover peek):** `apps/desktop/src/modules/anime/queries.ts` (trailer query), new `apps/web/src/components/shared/HoverPeekCard.tsx`.
- **D2 (theme-of-anime):** new `apps/web/src/lib/cover-palette.ts`, `apps/web/src/stores/useCustomThemeStore.ts` (auto-shift slot).
- **D3 (1 episode/day):** library schema additive migration, `apps/web/src/components/library/AnimeDetailModal.tsx` (toggle), `apps/web/src/components/browser/NewTabPage.tsx` (lockout overlay).
- **E1 (OBS overlay):** new `apps/desktop/src/modules/overlay/overlay.module.ts`, route + WS channel.
- **E2 (year recap):** new `apps/web/src/components/recap/RecapView.tsx`, reuses `renderProfileCard.ts`.

---

## Reference Files (do not modify — patterns to follow)

- `apps/web/src/components/browser/BrowserView.tsx` — the portal-layer trick that lets webviews survive split/unsplit. Any pane-kind extension must preserve it.
- `apps/web/src/components/browser/BrowserTabBar.tsx` — split-aware collision detection pattern.
- `apps/web/src/lib/anime-detection.ts` — site-detector pattern, copy this shape for any new host.
- `apps/web/src/lib/scrape-metadata.ts` — webview JS-injection pattern with site-specific scrapers.
- `apps/desktop/src/main/discord/discord-presence-builder.ts` — template-substitution pattern, follow for any new templated card.
- `apps/web/src/components/profile/renderProfileCard.ts` — Canvas image generation pattern for any "share PNG" feature.
- `apps/desktop/src/main/stats/app-stats-tracker.ts` — local-day-key + suspend-aware tick pattern; reuse for any new local-time accumulator.

## Risks & Gotchas

- **Auto-progress (B2)** is the single highest-risk feature — wrong-anime writes destroy trust. Always show a confirmation toast, never silently mutate the library. Test against playlist-style URLs that don't change for hours.
- **Diary-as-split-pane (A1)** must remain backward-compatible with persisted tab trees. The union extension `BrowserLeafNode = WebLeaf | DiaryLeaf` is fine but every walker (`mapLeaves`, `collectLeaves`, `findLeaf`) must stay total over the new variant.
- **Mascot reactions (A4)** — sprite sheet artwork is the long pole. Coordinate with whoever drew the existing mascot before scoping a sprint.
- **Watch parties (C1)** — listening to other users' RPC presence requires the bot to read presence intents, which Discord has rate-limited and intent-gated. Verify the bot's `GUILD_PRESENCES` intent is enabled before scoping.
- **Theme-of-the-anime (D2)** — easy to make seizure-inducing. Limit to a single accent + a glow color; never swap the full theme. Add an opt-out per-anime.
- **OBS overlay (E1)** — exposing an HTTP route changes the security surface. Bind to `127.0.0.1` only; never `0.0.0.0`. Document the port (it's already random per launch via `getBackendPort()`, so the user needs a copy-button).
- **Episode URL rewriter (B1, B3)** — host pattern fragility. Build it as a registry of per-host transformers (mirror `anime-detection.ts`'s shape), cover with unit tests, fail-soft to "open the show page" if the rewriter doesn't recognise the URL.
- **End-of-episode detection (A3)** — cross-origin player iframes need same-origin script injection; `executeJavaScript` works at the top-level webview, but the `<video>` element is inside an iframe of a different origin. May require detecting via subFrame load events instead of direct DOM access.

## How to Verify (for whichever feature ships next)

For A2 (recommended first ship):

1. Open browser → navigate to ogladajanime.pl player URL.
2. Click new "Cap" button in toolbar.
3. Diary editor opens with screenshot as cover and `linkedAnimeId` resolved.
4. Save → diary entry persists with the image as `coverImage`.
5. Repeat with a non-anime tab (e.g. Wikipedia) — diary entry still works but `linkedAnimeId` is undefined, mood defaults are sensible.

For B1 (recommended second ship):

1. Have ≥1 entry with `status: watching` and a `resumeUrl`.
2. Open new tab → resume rail visible above the quick-access grid.
3. Click → navigates to the resume URL.
4. With episode-incrementer: long-press / right-click → "Następny odcinek?" → URL is mutated for ogladajanime.pl pattern.

## Open Questions

- **Mascot artwork capacity?** Several ideas (A4, D3) want new sprite sheets. Is there a reliable channel to commission them?
- **Discord bot ownership** — is the bot's presence intent already turned on? (Check Discord Developer Portal — required for C1.)
- **Per-show watch time storage** — should `byAnime` go in `app-stats-tracker.ts` (local file, no schema) or in the better-sqlite3 `anime_library` table? Latter is cleaner but requires a migration.
- **Custom protocol conflicts** — `shiroani://` should be uncontested but worth verifying in `app.setAsDefaultProtocolClient` lands safely on macOS (no popup spam).
- **Privacy default for C1** — opt-in or opt-out? Strong opinion: opt-in, with a clear "your friends can see what you're watching when this is on" line in settings.
- **Polish copy review** — none of the strings above have been workshopped with a native speaker; "Wracaj jutro 🌙", "Skończony odcinek?", "Ogląda razem ze mną" should be reviewed before code lands.
