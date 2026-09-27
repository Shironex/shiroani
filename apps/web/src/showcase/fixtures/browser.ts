import type { FrequentSite } from '@shiroani/shared';
import { iconArt } from './art';
import { localMoment } from './context';
import { SHOWCASE_SITES } from './quick-access-defaults';

export function frequentSites(): FrequentSite[] {
  return SHOWCASE_SITES.slice(0, 3).map((site, index) => ({
    url: `https://${site.host}/`,
    title: site.name,
    favicon: iconArt(index, site.name.charAt(0)),
    visitCount: 30 - index * 7,
    lastVisited: localMoment(-index, 18, 0).getTime(),
  }));
}
