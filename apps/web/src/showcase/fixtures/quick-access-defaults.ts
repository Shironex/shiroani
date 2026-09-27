/**
 * Showcase stand-in for `@/lib/quick-access-defaults` (aliased in
 * vite.config.ts): the built-in new-tab shortcuts point at real third-party
 * sites, so the showcase build ships invented ones in their place.
 */
import type { QuickAccessSite } from '@shiroani/shared';
import { iconArt } from './art';

export const SHOWCASE_SITES: Array<{ name: string; host: string }> = [
  { name: 'Kumo Stream', host: 'kumo-stream.example' },
  { name: 'Hoshi Wiki', host: 'hoshi-wiki.example' },
  { name: 'Lantern Forum', host: 'lantern-forum.example' },
  { name: 'Crane Clips', host: 'crane-clips.example' },
  { name: 'Tsuki Radio', host: 'tsuki-radio.example' },
];

export const PREDEFINED_SITES: QuickAccessSite[] = SHOWCASE_SITES.map((site, index) => ({
  id: `predefined-showcase-${index + 1}`,
  name: site.host,
  url: `https://${site.host}`,
  icon: iconArt(index, site.name.charAt(0)),
  isPredefined: true,
}));
