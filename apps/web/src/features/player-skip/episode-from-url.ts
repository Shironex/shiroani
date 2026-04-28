/**
 * Pure helper that extracts an integer episode number from a URL + page title pair.
 *
 * Each site-specific extractor tries the URL path first, then falls back to
 * title scraping for sites whose URL structure doesn't carry the episode number.
 *
 * Returns null when extraction is not possible or not applicable for the host.
 */

import { hostFromUrl } from '@/lib/url-utils';

export function extractEpisodeNumber(url: string, pageTitle: string): number | null {
  const hostname = hostFromUrl(url);
  if (hostname === null) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (hostname === 'ogladajanime.pl') {
    return extractOgladajAnimeEpisode(parsed, pageTitle);
  }

  if (hostname === 'shinden.pl') {
    return extractShindenEpisode(parsed, pageTitle);
  }

  // youtube.com — episode number is not applicable for skip purposes.
  return null;
}

function extractOgladajAnimeEpisode(parsed: URL, pageTitle: string): number | null {
  const path = parsed.pathname;

  // /anime/{slug}/{number} — episode number is in the URL.
  const episodeMatch = path.match(/^\/anime\/[^/]+\/(\d+)/);
  if (episodeMatch) {
    const n = parseInt(episodeMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  // /anime/{slug}/player/{id} — no episode number in URL; fall back to title.
  // Player URLs have the form /anime/{slug}/player/{numericId}; we skip those
  // unless the page title happens to include "Odcinek N".
  const playerMatch = path.match(/^\/anime\/[^/]+\/player\/\d+/);
  if (playerMatch) {
    return extractEpisodeFromTitle(pageTitle);
  }

  return null;
}

function extractShindenEpisode(_parsed: URL, pageTitle: string): number | null {
  // TODO(shinden): URL pattern unknown; provide one via session handoff.
  // The existing detectShinden regex captures /episode/{id}-{slug}/view/{viewId},
  // but the numeric id is the episode record ID, not the episode ordinal.
  // Falling back to title scraping as the best-effort path.
  return extractEpisodeFromTitle(pageTitle);
}

/**
 * Scrapes an episode ordinal from a page title.
 * Recognises "Odcinek N" (Polish) and "Episode N" (English) patterns.
 * Returns null when no pattern matches.
 */
function extractEpisodeFromTitle(title: string): number | null {
  if (!title) return null;

  // "Odcinek 5", "Odcinek 12" — Polish
  const plMatch = title.match(/\bOdcinek\s+(\d+)/i);
  if (plMatch) {
    const n = parseInt(plMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  // "Episode 5", "Episode 12" — English fallback
  const enMatch = title.match(/\bEpisode\s+(\d+)/i);
  if (enMatch) {
    const n = parseInt(enMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}
