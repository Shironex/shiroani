import { IS_ELECTRON } from '@/lib/platform';
import { hostFromUrl } from '@/lib/url-utils';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import type { BrowserNode, DiscordPresenceActivity } from '@shiroani/shared';

// ── Types ─────────────────────────────────────────────────────────

export interface AnimeDetection {
  animeTitle: string;
  episodeInfo?: string;
  episodeNumber?: number;
}

// ── Pure utilities ────────────────────────────────────────────────

/**
 * Converts a URL slug to a human-readable title.
 * "naruto-shippuuden" → "Naruto Shippuuden"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Detects anime information from the current URL and page title.
 * Pure function — no DOM access, no side effects.
 */
export function detectAnimeFromUrl(url: string, pageTitle: string): AnimeDetection | null {
  const hostname = hostFromUrl(url);
  if (hostname === null) return null;

  // Safe to parse again — hostFromUrl returning non-null guarantees the URL is well-formed.
  const parsed = new URL(url);

  // ── ogladajanime.pl ───────────────────────────────────────────
  if (hostname === 'ogladajanime.pl') {
    return detectOgladajAnime(parsed, pageTitle);
  }

  // ── shinden.pl ────────────────────────────────────────────────
  if (hostname === 'shinden.pl') {
    return detectShinden(parsed);
  }

  // ── youtube.com / youtu.be ────────────────────────────────────
  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be') {
    return detectYoutube(parsed, pageTitle);
  }

  return null;
}

// ── Site-specific detectors ───────────────────────────────────────

function detectOgladajAnime(parsed: URL, pageTitle: string): AnimeDetection | null {
  const path = parsed.pathname;

  // /anime/{slug}/player/{id} → watching
  const playerMatch = path.match(/^\/anime\/([^/]+)\/player\/\d+/);
  if (playerMatch) {
    return { animeTitle: slugToTitle(playerMatch[1]) };
  }

  // /anime/{slug}/{number} → watching episode N
  const episodeMatch = path.match(/^\/anime\/([^/]+)\/(\d+)/);
  if (episodeMatch) {
    return {
      animeTitle: slugToTitle(episodeMatch[1]),
      episodeInfo: `Odcinek ${episodeMatch[2]}`,
    };
  }

  // ?action=anime&subaction=watch → watching (use page title)
  if (
    parsed.searchParams.get('action') === 'anime' &&
    parsed.searchParams.get('subaction') === 'watch'
  ) {
    return { animeTitle: pageTitle || 'Anime' };
  }

  return null;
}

function detectShinden(parsed: URL): AnimeDetection | null {
  // /episode/{id}-{slug}/view/{viewId}
  const match = parsed.pathname.match(/^\/episode\/\d+-([^/]+)\/view\/\d+/);
  if (match) {
    return { animeTitle: slugToTitle(match[1]) };
  }

  return null;
}

function detectYoutube(parsed: URL, pageTitle: string): AnimeDetection | null {
  const hostname = hostFromUrl(parsed.href);

  // youtu.be short links always have a video ID as the path
  const isWatching =
    hostname === 'youtu.be' || (parsed.pathname === '/watch' && parsed.searchParams.has('v'));

  if (!isWatching) return null;

  const title = pageTitle.replace(/\s*-\s*YouTube\s*$/, '').trim();
  return { animeTitle: title || 'YouTube' };
}

// ── Integration ───────────────────────────────────────────────────

/**
 * Checks the given tab for anime content and updates Discord Rich Presence.
 * Should be called after tab URL or title changes.
 *
 * Parameters are optional — when omitted, values are read from stores.
 * New callers should prefer passing data explicitly to avoid coupling
 * a lib utility to store internals.
 */
export function updateAnimePresence(
  paneId: string,
  tabs?: BrowserNode[],
  activePaneId?: string | null,
  activeView?: string
): void {
  if (!IS_ELECTRON) return;

  const _tabs = tabs ?? useBrowserStore.getState().tabs;
  const _activePaneId =
    activePaneId !== undefined ? activePaneId : useBrowserStore.getState().activePaneId;
  const _activeView = activeView ?? useAppStore.getState().activeView;

  // Only update for the focused pane while the browser view is visible
  if (paneId !== _activePaneId || _activeView !== 'browser') return;

  const leaf = findLeafById(_tabs, paneId);
  if (!leaf) return;

  const detection = detectAnimeFromUrl(leaf.url, leaf.title);

  const siteName = hostFromUrl(leaf.url) ?? undefined;

  const activity: DiscordPresenceActivity = detection
    ? {
        view: 'browser',
        animeTitle: detection.episodeInfo
          ? `${detection.animeTitle} — ${detection.episodeInfo}`
          : detection.animeTitle,
        episodeNumber: detection.episodeInfo,
        siteName,
      }
    : { view: 'browser', siteName };

  window.electronAPI?.discordRpc?.updatePresence(activity);

  // Drive the local "anime watch" counter so animeWatchSeconds increments
  // only while the active tab is on a recognized anime site.
  window.electronAPI?.appStats?.setWatchingAnime(detection !== null);
}

/**
 * Trailing-edge debounce wrapper around `updateAnimePresence` for focus-change
 * call sites (switchTab, focusPane). Quick alternation between panes A and B
 * would otherwise spam Discord's RPC client past its rate limit and leave
 * stale activity sticking; coalescing the call ensures the latest focused
 * pane wins. Non-focus paths (did-navigate, page-title-updated) keep calling
 * `updateAnimePresence` directly so URL/title changes still fire immediately.
 */
const PRESENCE_DEBOUNCE_MS = 350;
let presenceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPaneId: string | null = null;

export function updateAnimePresenceDebounced(paneId: string): void {
  pendingPaneId = paneId;
  if (presenceTimer) return;
  presenceTimer = setTimeout(() => {
    presenceTimer = null;
    const id = pendingPaneId;
    pendingPaneId = null;
    if (id !== null) updateAnimePresence(id);
  }, PRESENCE_DEBOUNCE_MS);
}
