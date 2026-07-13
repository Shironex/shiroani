import { useTranslation } from 'react-i18next';
import { ProfileSidebar } from '../ProfileSidebar';
import { ProfileStatGrid } from '../ProfileStatGrid';
import { GenreBreakdown } from '../GenreBreakdown';
import { StudioBreakdown } from '../StudioBreakdown';
import { ActivityFeed } from '../ActivityFeed';
import { ProfileFollow } from '../ProfileFollow';
import { ProfileExtraStats } from '../ProfileExtraStats';
import { ProfileFavourites } from '../ProfileFavourites';
import { useProfileDashboard } from './ProfileDashboard.hooks';
import { LibraryBreakdown } from './ProfileDashboard.parts';
import { SectionHead } from '../shared-parts';
import type { IProfileDashboardProps } from './ProfileDashboard.types';

/**
 * Main content area of the Profile view. Two-column layout: the
 * {@link ProfileSidebar} on the left (avatar + summary stats + actions)
 * and a scrollable main column containing the 4-up stat grid, library
 * status rings, genre/studio breakdowns, the activity feed and — when
 * present — favourite anime.
 */
export default function ProfileDashboard({
  profile,
  onShare,
  onRefresh,
  onDisconnect,
}: IProfileDashboardProps) {
  const { t } = useTranslation('profile');
  const { stats, isLoading, statusRings, topYear } = useProfileDashboard({ profile });

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <ProfileSidebar
        profile={profile}
        isLoading={isLoading}
        onRefresh={onRefresh}
        onShare={onShare}
        onDisconnect={onDisconnect}
      />

      {/* ── Main scroll column ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-5">
        {/* Big stats row */}
        <ProfileStatGrid profile={profile} />

        {/* Library status rings */}
        <section>
          <SectionHead>{t('dashboard.sections.libraryBreakdown')}</SectionHead>
          <LibraryBreakdown statusRings={statusRings} stats={stats} topYear={topYear} />
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

        {/* Richer statistics — voice actors / staff / start years / lengths.
            Each block renders only when AniList exposes the data (private stats
            via the viewer path, or public stats where available). */}
        <ProfileExtraStats stats={stats} renderHead={head => <SectionHead>{head}</SectionHead>} />

        {/* Recent activity (viewer-scoped — real entries when connected) */}
        <section>
          <SectionHead>{t('dashboard.sections.recentActivity')}</SectionHead>
          <ActivityFeed />
        </section>

        {/* Following / followers (viewer-scoped — renders only when connected) */}
        <ProfileFollow renderHead={head => <SectionHead>{head}</SectionHead>} />

        {/* Favourites (anime + manga + characters + staff + studios). The
            "share card" surface lives behind the sidebar's PNG export button. */}
        <ProfileFavourites
          profile={profile}
          renderHead={head => <SectionHead>{head}</SectionHead>}
        />
      </div>
    </div>
  );
}
