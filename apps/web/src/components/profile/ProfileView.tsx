import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { useProfileStore, startProfileRefresh } from '@/stores/useProfileStore';
import { ProfileSetup } from './ProfileSetup';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProfileDashboard } from './ProfileDashboard';
import { ProfileShareDialog } from './ProfileShareDialog';
import { InAppStatsPanel } from './InAppStatsPanel';

type ProfileTab = 'anilist' | 'app';

const TAB_IDS: Record<ProfileTab, { tab: string; panel: string }> = {
  anilist: { tab: 'profile-tab-anilist', panel: 'profile-panel-anilist' },
  app: { tab: 'profile-tab-app', panel: 'profile-panel-app' },
};

const TAB_ORDER: ProfileTab[] = ['anilist', 'app'];

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
export function ProfileView() {
  const { t } = useTranslation('profile');
  const username = useProfileStore(s => s.username);
  const profile = useProfileStore(s => s.profile);
  const isLoading = useProfileStore(s => s.isLoading);
  const error = useProfileStore(s => s.error);
  const initFromStore = useProfileStore(s => s.initFromStore);
  const fetchProfile = useProfileStore(s => s.fetchProfile);
  const clearProfile = useProfileStore(s => s.clearProfile);

  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('anilist');

  useEffect(() => {
    initFromStore();
    startProfileRefresh();
  }, [initFromStore]);

  const statsEmpty = profile && profile.statistics.count === 0;

  const subtitle =
    tab === 'app'
      ? t('view.subtitleApp')
      : profile
        ? t('view.subtitleAniListConnected', { handle: profile.name.toLowerCase() })
        : username
          ? t('view.subtitleAniListConnected', { handle: username.toLowerCase() })
          : t('view.subtitleAniListConnect');

  const canShare = Boolean(profile && !statsEmpty);
  const isAniListTab = tab === 'anilist';

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader
        icon={User}
        title={t('view.title')}
        subtitle={subtitle}
        actions={
          <>
            <TabSwitcher tab={tab} onChange={setTab} />
            {isAniListTab && profile && (
              <TooltipButton
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => fetchProfile()}
                disabled={isLoading}
                tooltip={t('view.actions.refresh')}
                tooltipSide="bottom"
                aria-label={t('view.actions.refreshAria')}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </TooltipButton>
            )}
            {isAniListTab && canShare && (
              <TooltipButton
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setShareOpen(true)}
                tooltip={t('view.actions.share')}
                tooltipSide="bottom"
                aria-label={t('view.actions.shareAria')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </TooltipButton>
            )}
            {isAniListTab && profile?.siteUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(profile.siteUrl, '_blank', 'noopener,noreferrer')}
                className={cn(
                  'h-8 px-3 text-[12px] font-medium gap-1.5',
                  'bg-foreground/5 border border-foreground/10 hover:bg-foreground/10'
                )}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('view.actions.openAniList')}
              </Button>
            )}
          </>
        }
      />

      {/* ── Body: state switcher with watermark layer ──────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="我" position="br" size={280} opacity={0.03} />
        </div>

        <div
          className="relative z-[1] h-full flex flex-col"
          role="tabpanel"
          id={TAB_IDS[tab].panel}
          aria-labelledby={TAB_IDS[tab].tab}
        >
          {tab === 'app' ? (
            <InAppStatsPanel />
          ) : !username && !isLoading ? (
            <ProfileSetup />
          ) : isLoading && !profile ? (
            <ProfileSkeleton />
          ) : profile && !statsEmpty ? (
            <ProfileDashboard profile={profile} onShare={() => setShareOpen(true)} />
          ) : statsEmpty ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{t('view.private.title')}</p>
                <Button variant="outline" size="sm" onClick={() => clearProfile()}>
                  {t('view.private.changeUser')}
                </Button>
              </div>
            </div>
          ) : error && !profile ? (
            <AniListErrorState error={error} onRetry={() => fetchProfile()} />
          ) : null}
        </div>
      </div>

      {profile && !statsEmpty && (
        <ProfileShareDialog open={shareOpen} onOpenChange={setShareOpen} profile={profile} />
      )}
    </div>
  );
}

function TabSwitcher({ tab, onChange }: { tab: ProfileTab; onChange: (next: ProfileTab) => void }) {
  const { t } = useTranslation('profile');
  const refs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({ anilist: null, app: null });

  const onArrow = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = TAB_ORDER.indexOf(tab);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = TAB_ORDER[(idx + delta + TAB_ORDER.length) % TAB_ORDER.length];
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t('view.tabs.ariaLabel')}
      onKeyDown={onArrow}
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-lg',
        'bg-foreground/5 border border-foreground/10'
      )}
    >
      <TabButton
        ref={el => {
          refs.current.anilist = el;
        }}
        id={TAB_IDS.anilist.tab}
        controls={TAB_IDS.anilist.panel}
        active={tab === 'anilist'}
        onClick={() => onChange('anilist')}
      >
        {t('view.tabs.anilist')}
      </TabButton>
      <TabButton
        ref={el => {
          refs.current.app = el;
        }}
        id={TAB_IDS.app.tab}
        controls={TAB_IDS.app.panel}
        active={tab === 'app'}
        onClick={() => onChange('app')}
      >
        {t('view.tabs.app')}
      </TabButton>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id: string;
  controls: string;
  ref?: React.Ref<HTMLButtonElement>;
}

function TabButton({ active, onClick, children, id, controls, ref }: TabButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded-md text-[11.5px] font-medium tracking-[-0.01em] transition-colors',
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
      )}
    >
      {children}
    </button>
  );
}
