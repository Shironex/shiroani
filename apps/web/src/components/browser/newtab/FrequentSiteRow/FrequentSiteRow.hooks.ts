import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FrequentSite } from '@shiroani/shared';
import { hostFromUrl } from '@/lib/url-utils';
import { formatRelativeTime } from '@/lib/relative-time';
import type { IFrequentSiteRowView } from './FrequentSiteRow.types';

export function useFrequentSiteRow(site: FrequentSite): IFrequentSiteRowView {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const host = hostFromUrl(site.url) ?? site.url;
  const relative = formatRelativeTime(site.lastVisited, t);

  return { imgError, setImgError, host, relative };
}
