import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startAppStatsPolling,
  stopAppStatsPolling,
  useAppStatsStore,
} from '@/stores/useAppStatsStore';
import { daysSinceCreated } from '@/lib/stats-conversions';
import type { IProfileSidebarProps, IProfileSidebarView } from './ProfileSidebar.types';

export function useProfileSidebar({
  profile,
}: Pick<IProfileSidebarProps, 'profile'>): IProfileSidebarView {
  const { t, i18n } = useTranslation('profile');
  const { statistics: stats } = profile;
  const appStatsSnapshot = useAppStatsStore(s => s.snapshot);

  // Keep the sidebar badge ("Aktywny od X dni") alive without depending on the
  // ProfileView mounting the in-app stats tab first.
  useEffect(() => {
    startAppStatsPolling();
    return () => {
      stopAppStatsPolling();
    };
  }, []);

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt * 1000).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
      })
    : null;

  const daysActive = appStatsSnapshot.createdAt ? daysSinceCreated(appStatsSnapshot) : 0;
  const daysActiveLabel = t('sidebar.days', { count: daysActive });

  return { stats, language: i18n.language, memberSince, daysActive, daysActiveLabel };
}
