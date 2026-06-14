import { useMemo, useState } from 'react';
import type { QuickAccessSite } from '@shiroani/shared';
import { hostFromUrl } from '@/lib/url-utils';
import type { ISiteCardView } from './SiteCard.types';

/**
 * Resolve a high-resolution logo URL for a quick-access tile.
 *
 * Prefers a freshly-constructed Google favicon URL at sz=128 (gives a
 * sharper image than the default 16/32 px favicons shipped on site.icon).
 * Falls back to the site's own icon, then `null` so the tile can render a
 * text fallback.
 */
function getLogoUrl(site: QuickAccessSite): string | null {
  try {
    const host = new URL(site.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return site.icon ?? null;
  }
}

export function useSiteCard(site: QuickAccessSite): ISiteCardView {
  const [faviconError, setFaviconError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const displayHost = hostFromUrl(site.url);
  const logoUrl = useMemo(() => getLogoUrl(site), [site]);

  return { faviconError, setFaviconError, logoError, setLogoError, displayHost, logoUrl };
}
