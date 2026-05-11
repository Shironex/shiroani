import { useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useProfileStore } from '@/stores/useProfileStore';
import { ProfileSidebar } from './ProfileSidebar';
import { ProfileStatGrid } from './ProfileStatGrid';
import { ProgressRing } from './ProgressRing';
import { GenreBreakdown } from './GenreBreakdown';
import { StudioBreakdown } from './StudioBreakdown';
import { ActivityFeed } from './ActivityFeed';
import { useStatusLabels, formatDays, formatDaysLabel } from './profile-constants';
import { FavouriteCard } from './ProfileCharts';
import { type UserProfile } from '@shiroani/shared';

interface ProfileDashboardProps {
  profile: UserProfile;
  onShare: () => void;
}

/**
 * Main content area of the Profile view. Two-column layout: the
 * {@link ProfileSidebar} on the left (avatar + summary stats + actions)
 * and a scrollable main column containing the 4-up stat grid, library
 * status rings, genre/studio breakdowns, the activity feed and — when
 * present — favourite anime.
 */
export function ProfileDashboard({ profile, onShare }: ProfileDashboardProps) {
  const { t, i18n } = useTranslation('profile');
  const STATUS_LABELS = useStatusLabels();
  const { statistics: stats } = profile;
  const clearProfile = useProfileStore(s => s.clearProfile);
  const fetchProfile = useProfileStore(s => s.fetchProfile);
  const isLoading = useProfileStore(s => s.isLoading);

  const totalStatusCount = useMemo(
    () => stats.statuses.reduce((sum, s) => sum + s.count, 0) || 1,
    [stats.statuses]
  );

  const statusRings = useMemo(() => {
    // Preserve the mock's ring order regardless of backend order.
    const byName = new Map(stats.statuses.map(s => [s.name, s.count]));
    return RING_DEFS.map(def => ({
      ...def,
      count: byName.get(def.name) ?? 0,
      pct: ((byName.get(def.name) ?? 0) / totalStatusCount) * 100,
    }));
  }, [stats.statuses, totalStatusCount]);

  const topYear = useMemo(() => {
    if (stats.releaseYears.length === 0) return null;
    return [...stats.releaseYears].sort((a, b) => b.count - a.count)[0];
  }, [stats.releaseYears]);

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <ProfileSidebar
        profile={profile}
        isLoading={isLoading}
        onRefresh={fetchProfile}
        onShare={onShare}
        onDisconnect={clearProfile}
      />

      {/* ── Main scroll column ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-5">
        {/* Big stats row */}
        <ProfileStatGrid profile={profile} />

        {/* Library status rings */}
        <section>
          <SectionHead>{t('dashboard.sections.libraryBreakdown')}</SectionHead>
          <div className="flex gap-5 items-center flex-wrap">
            {statusRings.map(ring => (
              <ProgressRing
                key={ring.name}
                value={ring.pct}
                stroke={ring.color}
                label={STATUS_LABELS[ring.name] ?? ring.name}
                valueLabel={`${Math.round(ring.pct)}%`}
              />
            ))}
            <div className="flex-1 min-w-[220px] px-3.5 text-[12px] text-foreground/75 leading-[1.6] space-y-1">
              <div>
                <Trans
                  i18nKey="dashboard.summary.watched"
                  t={t}
                  values={{
                    episodes: stats.episodesWatched
                      .toLocaleString(i18n.language)
                      .replace(/,/g, ' '),
                  }}
                  components={{ 1: <b className="text-foreground font-bold tabular-nums" /> }}
                />
              </div>
              <div>
                <Trans
                  i18nKey="dashboard.summary.screenTime"
                  t={t}
                  values={{
                    value: formatDays(stats.minutesWatched),
                    unit: formatDaysLabel(stats.minutesWatched),
                  }}
                  components={{
                    1: <b className="text-[oklch(0.8_0.14_70)] font-bold tabular-nums" />,
                  }}
                />
              </div>
              {topYear && (
                <div>
                  <Trans
                    i18nKey="dashboard.summary.favoriteYear"
                    t={t}
                    values={{
                      year: topYear.year,
                      count: topYear.count,
                      titles: t('dashboard.titles', { count: topYear.count }),
                    }}
                    components={{ 1: <b className="text-primary font-bold tabular-nums" /> }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Genre + studio breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <section>
            <SectionHead>{t('dashboard.sections.favoriteGenres')}</SectionHead>
            <GenreBreakdown genres={stats.genres} />
          </section>
          <section>
            <SectionHead>{t('dashboard.sections.favoriteStudios')}</SectionHead>
            <StudioBreakdown studios={stats.studios} />
          </section>
        </div>

        {/* Recent activity (placeholder — no backend data yet) */}
        <section>
          <SectionHead>{t('dashboard.sections.recentActivity')}</SectionHead>
          <ActivityFeed />
        </section>

        {/* Favourites (kept from the pre-redesign dashboard — the mock
            replaces this slot with the "share card" surface that now
            lives behind the sidebar's "Eksportuj kartę PNG" button). */}
        {profile.favourites.length > 0 && (
          <section>
            <SectionHead>{t('dashboard.sections.favorites')}</SectionHead>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {profile.favourites.map(fav => (
                <FavouriteCard key={fav.id} fav={fav} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2.5 mb-3">
      <span>{children}</span>
      <span aria-hidden="true" className="flex-1 h-px bg-border-glass" />
    </h3>
  );
}

const RING_DEFS: Array<{ name: string; color: string }> = [
  { name: 'COMPLETED', color: 'oklch(0.74 0.15 355)' },
  { name: 'CURRENT', color: 'oklch(0.7 0.15 220)' },
  { name: 'PLANNING', color: 'oklch(0.8 0.14 70)' },
  { name: 'PAUSED', color: 'oklch(0.6 0.05 298)' },
  { name: 'DROPPED', color: 'oklch(0.65 0.18 25)' },
];
