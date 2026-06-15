import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { ProfileShareDialog } from '../ProfileShareDialog';
import { useProfileView } from './ProfileView.hooks';
import { ProfileBody, ProfileHeaderActions } from './ProfileView.parts';

/**
 * Top-level Profile view. Renders the editorial `.vh`-style header and
 * delegates the body to one of three states:
 *   - {@link ProfileSetup}      — no AniList username stored yet
 *   - {@link ProfileSkeleton}   — fetching the first profile payload
 *   - {@link ProfileDashboard}  — full stat surface
 *
 * Header actions (refresh / share as PNG / open on AniList) live here so
 * they remain accessible across all states. `startProfileRefresh` keeps
 * the cached payload fresh in the background.
 */
export default function ProfileView() {
  const { t } = useTranslation('profile');
  const view = useProfileView();
  const { profile, statsEmpty, subtitle, shareOpen, setShareOpen } = view;

  // Chained boolean lifted out of JSX render position.
  const showShareDialog = Boolean(profile) && !statsEmpty;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader
        icon={User}
        title={t('view.title')}
        subtitle={subtitle}
        actions={<ProfileHeaderActions {...view} />}
      />

      {/* ── Body: state switcher with watermark layer ──────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="我" position="br" size={280} opacity={0.03} />
        </div>

        <ProfileBody {...view} />
      </div>

      {showShareDialog && (
        <ProfileShareDialog open={shareOpen} onOpenChange={setShareOpen} profile={profile!} />
      )}
    </div>
  );
}
