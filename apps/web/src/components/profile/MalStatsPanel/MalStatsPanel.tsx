import { useTranslation } from 'react-i18next';
import { Info, RefreshCw, UserX } from 'lucide-react';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProfileSkeleton } from '../ProfileSkeleton';
import { useMalStatsPanel } from './MalStatsPanel.hooks';
import {
  MalBreakdownSection,
  MalHeadlineStats,
  MalSidebar,
  MalTimeSection,
} from './MalStatsPanel.parts';

/**
 * "MyAnimeList" tab body. Mirrors the AniList tab's two-column
 * {@link ProfileDashboard} layout — a fixed sidebar (avatar + summary stats +
 * sync status + open-profile action) beside a scrollable main column — so the
 * two profile tabs read as one design. Fed by the desktop main process via
 * {@link MalEvents.GET_VIEWER_PROFILE} (token never crosses the socket).
 *
 * The stat set is deliberately lighter than AniList's: MAL's v2 API only exposes
 * ~15 scalars for `@me`, so there are no genre / voice-actor / score-distribution
 * breakdowns — the main column visualises the status counts and per-status day
 * counts instead.
 */
export default function MalStatsPanel() {
  const { t, i18n } = useTranslation(['profile', 'common']);
  const { profile, isLoading, error, notConnected, fetchProfile } = useMalStatsPanel();

  if (isLoading && !profile) return <ProfileSkeleton />;
  if (error && !profile) return <AniListErrorState error={error} onRetry={() => fetchProfile()} />;
  if (!profile) {
    // Settled not-connected: never park on a skeleton with no exit.
    if (notConnected) {
      return (
        <EmptyState
          icon={UserX}
          title={t('malPanel.notConnected.title')}
          subtitle={t('malPanel.notConnected.subtitle')}
          action={{
            label: t('common:actions.retry'),
            icon: RefreshCw,
            onClick: () => fetchProfile(),
          }}
        />
      );
    }
    return <ProfileSkeleton />;
  }

  const locale = i18n.language;

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Sidebar (mirrors the AniList ProfileSidebar) ───────────── */}
      <MalSidebar profile={profile} locale={locale} />

      {/* ── Main scroll column ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-6">
        <MalHeadlineStats profile={profile} locale={locale} />
        <MalBreakdownSection profile={profile} locale={locale} />
        <MalTimeSection profile={profile} locale={locale} />

        {/* "lighter stat set" note */}
        <section className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border-glass bg-foreground/[0.025]">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
            {t('malPanel.lighterNote')}
          </p>
        </section>
      </div>
    </div>
  );
}
