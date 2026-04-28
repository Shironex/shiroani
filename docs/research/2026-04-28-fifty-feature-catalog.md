# Research: ShiroAni — 50-Idea Broad Feature Catalog

**Date:** 2026-04-28
**Agent:** kirei
**Status:** complete

## Problem

The user already has 13 focused feature ideas from a prior session. They now want **breadth** — 50 unique, opinionated ideas across 10 surface areas, so they can skim, pick, and mix. Goal: discover the under-exploited seams between Electron shell, built-in browser, anime tracker, native mascot, and Discord bot/RPC.

Constraints:

- Single-user, Polish UI, Spy×Family aesthetic
- Don't repeat the prior 13
- Avoid generic productivity / anything AniList/MAL already does
- Bias toward ideas that exploit the Electron+browser+tracker+Discord seam

## Root Cause

ShiroAni's signature moat is the **shell + browser + tracker + mascot + RPC stack under one process**. Most "anime app" ideas live on websites; most "browser" ideas live in extensions; most "Discord" ideas live in bots. ShiroAni can fuse all three. Every idea below tries to land in that intersection rather than lean on a single layer.

## Evidence

- Working browser stack: `<webview>` + `persist:browser`, anime-detection per host (ogladajanime, shinden, youtube), Ghostery adblocker — already a CDP-adjacent surface for novel features.
- Native mascot via napi-rs Win32 — gives system-level presence not available to web apps.
- App-stats-tracker with 365-day buckets and streaks — a behavioral data warehouse most trackers lack.
- Discord RPC + Necord bot under same maintainer — webhook + bot + presence triangle is unusual.
- 39 themes + custom CSS injection + Canvas profile cards — strong existing "artifact generation" muscle to extend.
- Single-user assumption removes whole classes of complexity (auth, sharding, ratelimiting per tenant) and unlocks "personal computing" weirdness that SaaS can't ship.

## The Catalog (50 ideas)

### A. Watching companion — features that ride alongside the player tab

| ID  | Pitch                                                                                           | User moment                                                                  | Effort | Rating | Stack hint                                              |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------- |
| A01 | Live subtitle scrubber sidebar — extracts `<track>` cues into a clickable scrollable transcript | "I missed that line, what did she say?" — click line, video seeks back       | M      | 🔥     | webview preload, BrowserWebview, new SidePane component |
| A02 | OP/ED auto-skip with crowd-sourced timestamps stored locally per show                           | Skip the same opening 80 times across a 24-ep cour without manual seeking    | M      | 🔥     | webview preload, app-stats-tracker, library store       |
| A03 | "Heatmap of attention" — log when you tab away, generate per-episode focus score                | "Did I actually watch ep 7 or just had it on?" — see honest engagement chart | S      | ✨     | tab activity events, stats bucket, episode page         |
| A04 | Inline kanji/kana hover — hovering Japanese text on shinden synopsis pops jisho.org gloss       | Reading raw synopsis without leaving tab                                     | S      | ✨     | webview preload script, content-script injection        |
| A05 | "Rewind 8s" floating button matched to player keymap regardless of host                         | Streaming sites all have different rewind keys — one button works everywhere | XS     | 🛠     | webview overlay, keyboard shortcut service              |

### B. Library & tracking — auto-filling, querying, surfacing your library

| ID  | Pitch                                                                                          | User moment                                                                         | Effort | Rating | Stack hint                                       |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------ |
| B01 | Local SQL-ish library search bar — `genre:isekai status:watching score:>8`                     | "What unfinished isekai do I have above 8?" — instant filter, no AniList round-trip | M      | 🔥     | library store, new query parser, command palette |
| B02 | "Why is this in my list?" — show provenance (added from which tab, which date, which mood tag) | "I have no idea why I added this 6 months ago" — see the trigger                    | S      | ✨     | library store metadata, stats-tracker join       |
| B03 | Watching-pace forecaster — given current rate, predicts when each show finishes                | "Will I finish Frieren before season 2?" — calendar projection per show             | S      | 🛠     | stats-tracker, library episode counts            |
| B04 | "Backlog triage Tuesday" — weekly modal shows 5 unwatched picks, you swipe keep/drop           | Backlog rot — turn it into a 60-second weekly ritual                                | S      | ✨     | scheduled task, library store, modal flow        |
| B05 | Auto-detect "dropped" — if untouched 60+ days mid-cour, prompt to mark as dropped or revive    | "I forgot I was watching this" — gentle nudge instead of guilty backlog             | XS     | 🛠     | stats-tracker last-touched, library store        |

### C. Browser native — features only possible because YOU own the shell

| ID  | Pitch                                                                                                                        | User moment                                                                 | Effort | Rating | Stack hint                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------- |
| C01 | "Reader mode for fansubs" — strips shinden/ogladajanime UI, leaves only player + your notes                                  | Fullscreen-but-better, no chrome-clutter, theme-matched frame               | M      | 🔥     | webview CSS injection, theme system, new mode toggle |
| C02 | Per-site adblock profile — heavy on shinden, off on YouTube creators you support                                             | Granular control SaaS extensions can't easily do per persistent session     | S      | 🛠     | adblocker config, browser-manager, settings pane     |
| C03 | "Steal this stylesheet" — capture CSS overrides you write live, save as named theme                                          | Power users tweak sites; let them export tweaks as portable ShiroAni themes | M      | ✨     | DevTools protocol, theme system, custom CSS store    |
| C04 | History split by intent — separate buckets for "watching", "researching", "doomscrolling" inferred from host+duration        | Real history that admits what you were actually doing                       | M      | ✨     | stats-tracker, history store, classifier service     |
| C05 | "Tab cemetery" — closed-tab archive with reason inferred (finished ep / lost interest / replaced)                            | "What did I close last week?" — better than Ctrl+Shift+T                    | S      | ✨     | tab lifecycle events, new archive store              |
| C06 | Webview snapshot diff — when a tracked page (e.g. Reddit thread) updates, banner says "12 new replies since you last viewed" | Async forum-watching without notifications spam                             | M      | 🔥     | webview capture, hash diff, banner overlay           |

### D. Discord / community — RPC, bot, webhook, social

| ID  | Pitch                                                                                                  | User moment                                            | Effort | Rating | Stack hint                                               |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------ | ------ | -------------------------------------------------------- |
| D01 | Bot slash command `/co-ogladasz` — "what's everyone watching right now?" reads RPC of opted-in members | Find someone live to chat with mid-episode             | M      | 🔥     | bot Necord, RPC presence registry, opt-in store          |
| D02 | "Wstyd-list" channel — bot posts when a member ranks something below 4/10 (with consent)               | Funny shared moments around bad takes                  | S      | ✨     | bot webhook, leveling-style listener, opt-in flag        |
| D03 | Mood-roles auto-applied from your watching mix — "Romance Arc", "Mecha Phase", "Iyashikei Era"         | Roles that reflect your current vibe, refreshed weekly | M      | 🔥     | bot scheduled job, library aggregation API, role manager |
| D04 | Episode-club threads — bot auto-spawns thread when 3+ members start same ep within 24h                 | Social discovery without a feed                        | M      | 🔥     | bot, RPC presence stream, channel/thread service         |
| D05 | "Watch streak shame" — bot DMs a soft prod when your streak is about to die at 11pm                    | Streak protection without public shame                 | S      | ✨     | bot scheduler, stats-tracker streak, DM service          |
| D06 | Voice-channel "silent watchalong" — same anime, muted mics, bot synchronizes timestamps                | Comfy parallel viewing without forced talking          | L      | 🔥     | bot voice gateway, RPC sync, app-side timecode broadcast |

### E. Ambient / mascot / desktop — system-level presence

| ID  | Pitch                                                                                      | User moment                                          | Effort | Rating | Stack hint                                            |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------ | ------ | ----------------------------------------------------- |
| E01 | Mascot "weather" reflects your watchlist heat — sweats during cour finale week             | Glanceable signal that something's about to happen   | S      | 🔥     | napi-rs mascot, stats-tracker, AnimeSchedule API      |
| E02 | Ambient ED loop — last finished episode's ED plays softly when app goes idle for 30s       | Cozy decompression, the way anime nights end         | M      | ✨     | idle detection, audio service, OP/ED metadata source  |
| E03 | Tray icon shows current ep number as a tiny badge                                          | At-a-glance "where am I?" without opening the window | S      | 🛠     | tray service, library current-watching state          |
| E04 | "Desktop diary" — tiny corner widget on Windows showing today's stats, click to expand     | Feels like a Tamagotchi for your watching habit      | L      | 🔥     | napi-rs window, stats-tracker, IPC bridge             |
| E05 | Mascot blocks the screen for 20s every 50min ("oczy odpoczywają") — Pomodoro for eyes      | Eye-strain protection that has personality           | S      | ✨     | napi-rs mascot animation, scheduler service           |
| E06 | Wallpaper-of-the-day pulled from your highest-rated finishes — handoff to Kirei sister-app | Cross-product aesthetic synergy                      | M      | 🔥     | Kirei IPC or shared registry, library top-rated query |

### F. Power-user / keyboard — workflows for heavy users

| ID  | Pitch                                                                                                         | User moment                                           | Effort | Rating | Stack hint                                             |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ | ------ | ------------------------------------------------------ |
| F01 | Command palette (Ctrl+K) with verbs: "play next ep of Frieren", "open shinden for current tab", "log dropped" | One keystroke to action across browser+library+player | M      | 🔥     | new palette component, command registry, intent router |
| F02 | Vim-style chord layer — `g l` go library, `g b` browser, `, w` mark watched                                   | Keyboard-first navigation for the addicted            | M      | ✨     | global keymap service, mode indicator                  |
| F03 | Per-show macro recorder — "every Wednesday 9pm open ogladajanime tab for show X"                              | Autopilot ritualized viewing                          | S      | ✨     | scheduler, tab lifecycle, library link store           |
| F04 | Scriptable hooks (`~/.shiroani/hooks/on-episode-end.ts`) — TS hooks the user writes                           | Power users get programmable ShiroAni                 | L      | 🔥     | sandboxed VM, event bus, docs                          |
| F05 | Quick-rate overlay — finishing an episode triggers a 1-3-5-7-9 numpad scorer for 5 seconds                    | Frictionless rating capture beats post-hoc forgetting | XS     | 🛠     | post-episode toast (already planned), keymap           |
| F06 | "Replay this session" — playback of the last hour as a timeline of tabs/episodes/mascot                       | Self-quantified entertainment archeology              | M      | ✨     | session log, stats-tracker, timeline UI                |

### G. Sharing & artifacts — generated outputs

| ID  | Pitch                                                                                                 | User moment                                                 | Effort | Rating | Stack hint                                       |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------ | ------ | ------------------------------------------------ |
| G01 | "Postcard" generator — pick episode, get framed screenshot + your one-line review as PNG/Twitter card | Sharable artifact that leaves the app and pulls people back | M      | 🔥     | Canvas, capturePage, theme accent (T12)          |
| G02 | Seasonal poster collage — every cour, auto-generates a 9-grid of covers with rating border colors     | Year-end without being year-end; share to BlueSky/Discord   | M      | ✨     | Canvas profile-card stack, library query         |
| G03 | "My top 5 fights / cries / laughs" annotation reels — tag moments, export as 30s clip via FFmpeg      | Personal greatest-hits highlight reel                       | XL     | 🔥     | FFmpeg static, capturePage, moment store         |
| G04 | Letterboxd-style export of ratings with timestamps for portability                                    | "What if I want to leave?" — no-lock-in respect             | XS     | 🛠     | library store, JSON/CSV writer                   |
| G05 | One-click "send poster to my Discord avatar" — bot updates avatar to current top show cover           | Personal status flex via avatar instead of role             | S      | ✨     | bot user route, library top-show, image pipeline |

### H. Discovery & taste — surfacing what to watch next from YOUR data

| ID  | Pitch                                                                                              | User moment                                                                             | Effort | Rating | Stack hint                                   |
| --- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ | ------ | -------------------------------------------- |
| H01 | "Twin shows" — given a finished pick, find another in your backlog with similar tag/studio overlap | Recommendation that respects your already-curated backlog instead of inventing new pile | M      | 🔥     | local tag index, similarity scoring          |
| H02 | Taste graph by season — see a radar chart of how your genre weighting shifted year over year       | Self-knowledge moment, year-end-like but always available                               | S      | ✨     | stats-tracker buckets, chart component       |
| H03 | "Studio loyalty" page — which studios you've watched 5+ titles from, with completion rates         | Discover personal patterns invisible on AniList                                         | S      | ✨     | library aggregations                         |
| H04 | Mood-pick button — "I have 24 minutes and feel sad" returns one ep from your backlog matching      | Decision fatigue killer                                                                 | M      | 🔥     | mood tag schema, runtime metadata, picker UI |
| H05 | "Reverse-recommendation" — show what you've avoided despite tags suggesting you'd like it          | Anti-bubble nudge from your own data                                                    | M      | ✨     | library negative-space query                 |

### I. Accessibility & comfort — eye strain, attention, neurodivergent-friendly

| ID  | Pitch                                                                                                    | User moment                                           | Effort | Rating | Stack hint                                         |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ | ------ | -------------------------------------------------- |
| I01 | Photosensitivity scanner — pre-scans episode for high-flash scenes (e.g. that JJK scene), warns at start | Safer viewing for migraine/seizure-prone users        | XL     | 🔥     | webview frame sampling, brightness delta heuristic |
| I02 | "Calm shell" mode — disables all motion, mascot, framer transitions in one toggle                        | Bad-day setting that survives a panic moment          | XS     | 🛠     | global motion-pref state, framer-motion guard      |
| I03 | Episode runtime "without OP/ED/recap" displayed honestly — true watch time                               | "Do I really have time for this?" — accurate planning | S      | ✨     | OP/ED timestamps store (shared with A02)           |
| I04 | Reading-pace dyslexia-friendly subtitle font swap with one click                                         | Inclusive viewing without leaving the player          | S      | 🛠     | webview CSS injection (shared with C01)            |
| I05 | Focus session — locks all browser hosts EXCEPT current anime + lyrics tab for 25 min                     | ADHD-friendly hyperfocus assist                       | S      | ✨     | tab-group system, host allowlist temporarily       |

### J. Anime-otaku-native — features that only make sense in this niche

| ID  | Pitch                                                                                                                | User moment                                           | Effort | Rating | Stack hint                                             |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ | ------ | ------------------------------------------------------ |
| J01 | Seiyuu radar — when an episode starts, show "you've heard this VA in 4 other shows you watched"                      | Otaku delight, recognition rush                       | M      | 🔥     | seiyuu DB (Jikan/AniList), library cross-ref           |
| J02 | OP/ED jukebox — collects every OP/ED of every finished show, plays as a custom radio                                 | "Just play me bangers" — an iyashikei loop machine    | M      | 🔥     | metadata source, audio service (handoff to Shiranami?) |
| J03 | Fansub group preference memory — auto-prefers your favorite group when multiple options                              | "Where's the GJM rip?" — solved                       | S      | ✨     | per-show source ranking store                          |
| J04 | "Rec line" — write a 1-sentence rec for a finished show; bot auto-posts to a channel only if 3+ friends haven't seen | Zero-effort community curation that respects spoilers | M      | 🔥     | library hook, bot channel, exclusion query             |
| J05 | Studio anniversary surfacer — "Kyoto Animation founded today, you've watched 6 of theirs"                            | Tiny moments of belonging in the calendar             | XS     | ✨     | studio metadata, date-based scheduler                  |
| J06 | "Manga gap" — for finished anime with manga continuation, prompt to track manga next                                 | Bridge anime→manga that most trackers fumble          | M      | ✨     | MangaDex/AniList ID join, library schema extension     |
| J07 | Untranslated raw catcher — detects you're on a raw page (no subs), opens jisho/DeepL pane                            | Language-learning otaku workflow                      | S      | 🔥     | webview content-script, side pane                      |

---

## "10 Strongest Combos" — pairs/trios that compound

Each combo turns two cheap features into a signature moment.

1. **F01 (palette) + B01 (query language) + H04 (mood pick)** → Ctrl+K → "sad 24min" → instant single suggestion playable on enter. The whole app collapses into one keystroke.
2. **A01 (subtitle scrubber) + I04 (dyslexia font) + J07 (raw catcher)** → A complete language-learning side workspace; ShiroAni becomes a soft Anki for anime watchers.
3. **A02 (OP/ED skip data) + J02 (OP/ED jukebox) + I03 (true runtime)** → One shared timestamps DB powers three features. Build the data once, harvest 3 signature moments.
4. **C06 (snapshot diff) + B05 (auto-dropped) + D04 (episode-club threads)** → Async social viewing — you don't need to be online when friends are; the app notices the overlap and creates the room for later.
5. **G01 (postcard) + G05 (avatar update) + D03 (mood roles)** → Identity-as-a-feature — your Discord presence is automatically curated by what you watch, with shareable artifacts at every step.
6. **E01 (mascot weather) + E04 (desktop diary widget) + E05 (eye-rest blocker)** → A mascot that isn't decorative — it's the OS-level companion that nobody else has, because nobody else has napi-rs Win32 + tracker + RPC.
7. **D01 (co-ogladasz) + D06 (silent watchalong) + RPC watch parties (prior #8)** → Discord becomes the "is anyone here?" layer. Three feature levels: see them → join them → sync with them.
8. **C03 (steal stylesheet) + theme-of-the-anime (prior #12) + custom CSS injection** → User-generated theme economy entirely contained inside your single-user app — exportable as theme files, perfect for your blog or community.
9. **F04 (scriptable hooks) + F03 (macro recorder) + F06 (session replay)** → Power-user trifecta that turns ShiroAni into a programmable personal client — the kind of moat that makes uninstalling unthinkable.
10. **J01 (seiyuu radar) + H01 (twin shows) + H03 (studio loyalty)** → "Why I love what I love" — three views into your taste graph that AniList literally cannot replicate because they don't have your behavioral data.

---

## Files to Modify

This is research-only — no files modified. Implementation hints are in the "Stack hint" column for whichever idea(s) move forward.

## Reference Files (do not modify)

- `/Users/shirone/Documents/Projects/shiroani/apps/desktop/src/main/browser/browser-manager.ts` — webview session
- `/Users/shirone/Documents/Projects/shiroani/apps/desktop/src/main/window.ts` — main window + CSP
- `/Users/shirone/Documents/Projects/shiroani/apps/web/src/components/browser/BrowserWebview.tsx` — webview React mount
- `/Users/shirone/Documents/Projects/shiroani/apps/web/src/stores/useBrowserStore.ts` — browser state
- `/Users/shirone/Documents/Projects/shiroani/apps/bot/` — Necord bot for D-series
- `/Users/shirone/Documents/Projects/shiroani/docs/research/2026-04-28-unique-feature-ideation.md` — prior 13 ideas

## Risks & Gotchas

- **OP/ED timestamps (A02, I03, J02)** — depends on a data source. AnimeThemes.moe has APIs; AniSongDB exists. Self-detect via audio fingerprinting is XL territory.
- **Photosensitivity scanner (I01)** — XL because needs frame sampling pipeline; medically-adjacent claim, be careful with copy.
- **Voice watchalong (D06)** — bot voice gateway is a different beast than text/RPC; rate limits and discord.js voice churn matter.
- **Scriptable hooks (F04)** — sandboxing user TS is non-trivial; isolated-vm or worker_threads with permission boundaries.
- **Mood roles (D03)** — single-user app means "community" is one Discord; ensure the bot still works for that one server without multi-tenant assumptions.
- **Twin shows / studio loyalty (H01, H03)** — needs decent anime metadata; Jikan/AniList GraphQL with local cache.

## How to Verify

- User reads the catalog, picks 3-5 to add to backlog or expand into kirei-build/forge tickets
- Each picked idea gets a follow-up kirei research task scoped to its specific module
- Combos validated by checking shared dependencies (e.g., OP/ED timestamps DB) — build shared infra once

## Open Questions

- Is the user open to a small **shared metadata service** in `packages/shared` for OP/ED timestamps + seiyuu cross-refs? It powers ~6 of these ideas.
- Should D-series Discord features assume opt-in per member or per channel? Affects bot DB schema.
- Is **Kirei (wallpaper engine)** integration (E06) in scope this year, or sister-app dream?
- Is FFmpeg static binary acceptable in the desktop bundle (G03)? Adds ~70MB.
