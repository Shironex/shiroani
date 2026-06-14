import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/relative-time';
import type { ISocialActivityRowView } from './SocialActivityRow.types';

export function useSocialActivityRow(createdAt: number): ISocialActivityRowView {
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(createdAt * 1000, tBrowser);
  return { relative };
}
