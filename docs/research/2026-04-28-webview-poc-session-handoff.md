# Webview POC — Session Handoff

**Session date:** 2026-04-28
**Branch:** `feat/op-ed-skip-poc` (5 commits ahead of master, 1 uncommitted tweak as of this writing)
**Status:** POC working, architecture validated, ready to escalate to MVP

---

## TL;DR

We proved that Electron's `<webview>` is a substantially more powerful surface than a normal website. From the main process via `webFrameMain.executeJavaScript()`, we can:

- Read `<video>` state inside cross-origin iframes (same-origin policy is a renderer-side rule — main process bypasses it)
- Pierce open shadow roots to find videos modern players hide there
- Seek any playing video by writing to `currentTime`
- Inject DOM elements into cross-origin iframes that survive fullscreen by reparenting on `fullscreenchange`

Verified live on **ogladajanime.pl** (native + VK + rumble players). Still unverified live: **shinden.pl**, behavior on hosts using truly closed shadow roots (none of the mainstream ones do).

The original feasibility doc's MVP architecture stands — no architectural surprises emerged from the POC.

---

## The unlock — what we learned about webview capabilities

This is the bigger insight worth chewing on. A "browser tab" gives a website extension limited DOM access. Our `<webview>` lets the **main process** drive arbitrary JavaScript inside any frame at any depth. Implications for ShiroAni features:

| Capability                        | What it enables (besides OP/ED skip)                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-frame `<video>` reads       | End-of-episode detection (A03), per-episode focus heatmap (A03 catalog), watch-time scrobbling that's actually accurate                |
| Shadow DOM piercing               | Reading subtitles from any modern player, capturing player metadata (quality, rate, language)                                          |
| Frame-tree introspection          | Detecting which player host is in use → fansub group memory, per-host adblock profiles, "this is loading from sketchy source" warnings |
| DOM injection per-iframe          | Injecting overlay UI into players (skip buttons, timestamps, "watched" markers) that survive fullscreen                                |
| CSS injection                     | "Reader mode for fansubs" (C01), per-site theming, hiding decoy elements                                                               |
| `<track>` extraction              | Live subtitle scrubber sidebar (A01), language-learning gloss layer (A04 + J07)                                                        |
| Page navigation hooks             | Auto-progress "watched ep N?" (B02), URL-rewrite cross-site resolver (B3)                                                              |
| `webContents.capturePage()`       | "Cap this moment" diary cover (A02 from prior research)                                                                                |
| `getMediaStream` from a `<video>` | Could record short clips from playing video for highlights (G03), ambient audio capture                                                |

**Practical takeaway:** every "watching companion" idea from the prior 50-feature catalog that depended on player interaction is _more_ feasible than initially scoped. The split-view feature was the user-visible novelty; the iframe-driving capability is the platform novelty.

---

## Branch state

```
feat/op-ed-skip-poc
├── 3949c1c feat(player-skip): add main-process frame walker for cross-origin video seek
├── 27e20b4 feat(player-skip): wire IPC + preload bridge for player-skip channels
├── 3db314e feat(player-skip): add floating PlayerDock UI for POC verification
├── 1a0cf45 fix(player-skip): pierce shadow DOM and survive fullscreen
└── 5233263 fix(player-dock): scroll panel, shorten URLs, sort interesting frames
[uncommitted: bottom: 96 → 72px tweak after rumble-player feedback]
```

### Files

- `apps/desktop/src/main/browser/player-skip.ts` — frame walker, probe, seek, DOM injection. `shiroaniCollectVideos` BFS pierces shadow roots. Fullscreen reparenting via `fullscreenchange` listener bound once per iframe `window`.
- `apps/desktop/src/main/ipc/player-skip.ts` — three IPC channels: `player:seek-relative`, `player:probe`, `player:inject-button`. Zod schemas in `schemas.ts`.
- Preload bridge under `electronAPI.playerSkip` (existing pattern matched).
- `apps/web/src/components/browser/PlayerDock.tsx` — floating dock with four buttons (Cofnij -10s / Pomiń +120s / Sprawdź / Wstrzyknij). Shows on any URL where `detectAnimeFromUrl()` returns non-null. Result panel: scrollable (`max-h: min(480px, 55vh)`), URL-shortened (origin + truncated path), interesting-frames-first sorting.

### Verified live

- [x] **ogladajanime.pl native player** — top-level `<video>` on the page itself, 19 ad/tracker frames. Seek +120s works. Frame walk takes ~11ms.
- [x] **VK embedded player** (`vk.com/video_ext.php`) — uses **open shadow DOM**. After adding `shiroaniCollectVideos`, vids=1 detected, seek works.
- [x] **Rumble embedded player** (`rumble.com/embed/...`) — DOM injection works, button visible in player chrome area.
- [x] **shinden.pl** — confirmed working end-of-session by user (no probe screenshot shared, but seek + dock visibility verified).
- [x] **DOM injection survives** in non-fullscreen mode on all four above.
- [x] **Re-injection idempotency** — clicking Wstrzyknij multiple times doesn't pile up duplicate buttons.
- [x] **Polish UI text** throughout (Cofnij / Pomiń / Sprawdź / Wstrzyknij / Trackery / Z wideo / Czas).

### NOT verified live (still TBD)

- [ ] **Fullscreen reparenting** — the 1a0cf45 commit added it but the user hasn't fullscreened a player and tested whether the injected button stays visible.
- [ ] **Position tweak (bottom: 72px)** — user requested but hasn't visually verified yet across players.
- [ ] **Closed shadow root** behavior — no mainstream player uses one but if we encounter it, vids=0 will be a real architectural finding (no JS workaround exists).
- [ ] **`Cofnij -10s` button** — only `Pomiń +120s` and the inject button were screenshot-verified. `-10s` should work via the same `seekActiveVideo` path but unconfirmed.
- [ ] **Probe-on-non-anime-tab** error path — dock is hidden via `detectAnimeFromUrl` gate so this is theoretical.

### Real-world frame-tree observations

From two probes the user ran:

```
Top: ogladajanime.pl/anime/tsue-to-tsurugi-no-wistoria-2/3
Ramki: 19-22 | Z wideo: 0-1 | Trackery: 18-21
Czas: 6-11ms

Ad/tracker iframes seen (all vids=0):
  spolecznosci.net, smartadserver.com, admatic.de, ssp.wp.pl,
  prebid.a-mo.net, acdn.adnxs.com, csync.smartadserver.com,
  ap.lijit.com, ssp-sync.criteo.com, u-ams.4dex.io, pbs-cs.yellowblue.io,
  www.wp.pl, eu-u.openx.net, ssum-sec.casalemedia.com,
  dsp-service.adtarget.biz, image8.pubmatic.com,
  + several about:blank slots Prebid.js uses

Player iframes seen:
  vk.com/video_ext.php  (uses open shadow DOM)
  rumble.com/embed/...   (no shadow DOM, plain video)
```

**Interesting:** ogladajanime's frame tree is roughly 18 ad-tech iframes + 1 player iframe (sometimes) + the top page (sometimes carries the video itself). The MVP's "find playing video" filter doing the heavy lifting against decoy + tracker noise is essential.

---

## Open questions before MVP work begins

From the feasibility doc, still unanswered:

1. **AniSkip contribution UX** — silent auto-submit timestamps from our users, or explicit "submit to AniSkip?" modal? _Strong rec from feasibility: explicit click. User trust > frictionless data._
2. **Anime not in library** — auto-add silently when skip data exists, or "add to library to enable skip"? _Rec: the second — preserves the tracker thesis._
3. **Ambient ED + Discord RPC** — `Listening to {song} from {anime}` while it plays? _Rec: defer to V3, scope creep._
4. **Heads-up to AnimeThemes mods** before V2 ambient ED ships?

Plus new questions raised by the POC:

5. **Keep PlayerDock as a permanent debug surface?** — the Sprawdź / Wstrzyknij buttons are useful for debugging future player-host issues. Could live behind a `dev-tools` settings flag, or get stripped before the MVP merges.
6. **MVP UI shape** — single "Skip OP" / "Skip ED" button that animates in 5s before the timestamp window? Floating mini-toast? Inline in the renderer overlay or DOM-injected into the iframe?
7. **Should the per-frame video probe become a cached service?** — Right now every IPC re-walks the tree. Once we hook `did-frame-finish-load` (per the feasibility doc), we can cache the playing-video-frame handle and just re-resolve at seek time. Saves ~10ms per skip. Worth the listener complexity?

---

## Suggested next-session paths (pick one)

### Option A — Finish the POC verifications

Cheap completion-tax. Probe shinden.pl, test fullscreen reparenting, test `-10s`, test injection across two more episodes. Clean branch, commit the position tweak. Maybe ~30 min.

### Option B — Start the MVP

Per the feasibility doc plan (~5–7 days):

- Migration: add `mal_id` to `anime_library` (already in AniList query, just unused)
- New module `apps/desktop/src/modules/aniskip/` (mirror `anilist-client.ts` cache pattern)
- Hook `did-frame-finish-load` for per-tab playing-video-frame cache
- Replace POC dock with real "Skip OP" / "Skip ED" toasts that fire ~5s before the timestamp window
- Strip the debug buttons (Sprawdź / Wstrzyknij) or hide behind dev flag

### Option C — Brainstorm round 2

The user said "u gave me so much ideas i never thought we can do much more on webviews." Now that the capability surface is concretely understood, the prior 50-feature catalog could be re-scored: which ideas just got cheaper? Which become signature features now that we know iframe-driving works? Worth a 30-min ideation session before committing weeks to MVP work.

### Option D — Generalize the frame-driving infra

Refactor `player-skip.ts` into a more general `webview-bridge` module that powers ANY future iframe interaction. End-of-episode detection, subtitle extraction, episode metadata scraping — all want the same `findFrameMatching(predicate) + executeInFrame(script)` primitives. Pays off the moment we ship a second feature that uses webview internals.

### Option E — Local archive / video extraction (raised end of session)

User's last-question-of-the-night: can we extract & download the video from these players for offline local library?

**Short answer:** yes, via four paths in order of feasibility:

1. **yt-dlp** — Shiranami sister project already uses it. Hands the page URL to yt-dlp and gets back an MP4. Battle-tested for VK, rumble, mp4upload, streamtape, dozens of fansub hosts. ~95% coverage with minimal code.
2. **Network sniffing** — `webContents.session.webRequest.onCompleted` lets us watch every `.m3u8` / `.mp4` / `.ts` request the player fires; collect URLs, hand to ffmpeg for HLS reassembly. Universal fallback for hosts yt-dlp doesn't know.
3. **MediaSource hijacking** — override `MediaSource.appendBuffer` via `executeJavaScript` to capture buffers as they're appended. Works on any non-DRM stream but fragile, needs MP4-fragment recombination.
4. **Direct `<video>.currentSrc` MP4** — trivial on the rare host that serves direct MP4. Already exposed in our probe.

**DRM is the line:** Widevine-protected services (Netflix, Crunchyroll proper, Disney+) are out — and we should not try. Fansub hosts (mp4upload, streamtape, VK reuploads) are not DRM-protected.

**Strategic implication this raises** — ShiroAni would shift from "anime tracker with browser" to "personal anime archive with built-in browser." Plex-shaped local library, offline watching (huge for mobile), pairs naturally with the ambient ED loop (audio already on disk), 1-episode-a-day pacing (D3), Shiranami yt-dlp infra reuse. But: storage management becomes a first-class concern (200-500MB per ep), and the legal framing needs to be explicit (personal archival use only, no bulk redistribution, no DRM bypass).

**Needs a feasibility doc before any code.** Roughly the shape of the OP/ED skip feasibility doc but covering yt-dlp dependency model, ffmpeg bundling (~70MB hit), per-host extractor map, storage UX, and where the local library lives in the existing app architecture.

**Recommendation:** A first (cheap closure on POC), then C (re-score the catalog now that capability is real), then either B (OP/ED MVP) or E (local-archive feasibility) depending on which excites you more — they're roughly the same effort but very different product directions.

---

## Pointers to related docs

- [`2026-04-28-unique-feature-ideation.md`](./2026-04-28-unique-feature-ideation.md) — the original 13-idea kirei output that started this thread
- [`2026-04-28-fifty-feature-catalog.md`](./2026-04-28-fifty-feature-catalog.md) — broad 50-idea catalog across 10 surface areas
- [`2026-04-28-op-ed-skip-feasibility.md`](./2026-04-28-op-ed-skip-feasibility.md) — full feasibility research with verified AniSkip + AnimeThemes APIs, three-tier MVP plan, file paths

---

## Resume command for new session

```
git checkout feat/op-ed-skip-poc
git status   # see whether the bottom: 72px tweak is still uncommitted
pnpm dev
# Read docs/research/2026-04-28-webview-poc-session-handoff.md (this file)
```

Pick a path from "Suggested next-session paths" above and we're moving in 60 seconds.
