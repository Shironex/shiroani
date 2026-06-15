import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { ProfileSetup } from '../ProfileSetup';
import { ProfileSkeleton } from '../ProfileSkeleton';
import { ProfileDashboard } from '../ProfileDashboard';
import { InAppStatsPanel } from '../InAppStatsPanel';
import { MalStatsPanel } from '../MalStatsPanel';
import type { IProfileViewView, ProfileTab } from './ProfileView.types';

export const TAB_IDS: Record<ProfileTab, { tab: string; panel: string }> = {
  anilist: { tab: 'profile-tab-anilist', panel: 'profile-panel-anilist' },
  mal: { tab: 'profile-tab-mal', panel: 'profile-panel-mal' },
  app: { tab: 'profile-tab-app', panel: 'profile-panel-app' },
};

/**
 * Tab labels keyed by id — `as const satisfies` keeps the lookup a closed enum
 * dispatch over the typed `profile` namespace, so the literal-key `t()` overload
 * accepts each value without falling back to the `tDynamic` escape hatch.
 */
const TAB_LABEL_KEY = {
  anilist: 'view.tabs.anilist',
  mal: 'view.tabs.mal',
  app: 'view.tabs.app',
} as const satisfies Record<ProfileTab, string>;

type HeaderView = Pick<
  IProfileViewView,
  | 'tab'
  | 'setTab'
  | 'tabOrder'
  | 'isAniListTab'
  | 'profile'
  | 'isLoading'
  | 'refresh'
  | 'malProfile'
  | 'malLoading'
  | 'fetchMalProfile'
  | 'canShare'
  | 'setShareOpen'
  | 'navigateToBrowser'
>;

/** The header action cluster: tab switcher + per-tab refresh/share/open actions. */
export function ProfileHeaderActions(view: HeaderView) {
  const { t } = useTranslation('profile');
  const {
    tab,
    setTab,
    tabOrder,
    isAniListTab,
    profile,
    isLoading,
    refresh,
    malProfile,
    malLoading,
    fetchMalProfile,
    canShare,
    setShareOpen,
    navigateToBrowser,
  } = view;

  // Chained visibility booleans lifted out of JSX render position.
  const showAniListRefresh = isAniListTab && Boolean(profile);
  const showMalRefresh = tab === 'mal' && Boolean(malProfile);
  const showShare = isAniListTab && canShare;
  const showOpenAniList = isAniListTab && Boolean(profile?.siteUrl);

  return (
    <>
      <TabSwitcher tab={tab} onChange={setTab} order={tabOrder} />
      {showAniListRefresh && (
        <TooltipButton
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => refresh()}
          disabled={isLoading}
          tooltip={t('view.actions.refresh')}
          tooltipSide="bottom"
          aria-label={t('view.actions.refreshAria')}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </TooltipButton>
      )}
      {showMalRefresh && (
        <TooltipButton
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => fetchMalProfile()}
          disabled={malLoading}
          tooltip={t('view.actions.refresh')}
          tooltipSide="bottom"
          aria-label={t('view.actions.refreshAria')}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', malLoading && 'animate-spin')} />
        </TooltipButton>
      )}
      {showShare && (
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
      {showOpenAniList && profile?.siteUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateToBrowser(profile.siteUrl as string)}
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
  );
}

type BodyView = Pick<
  IProfileViewView,
  | 'tab'
  | 'bootstrapped'
  | 'connected'
  | 'username'
  | 'isLoading'
  | 'profile'
  | 'statsEmpty'
  | 'mode'
  | 'error'
  | 'setShareOpen'
  | 'refresh'
  | 'handleDisconnect'
>;

/** The state-switched tab panel body (app / mal / setup / skeleton / dashboard). */
export function ProfileBody(view: BodyView) {
  const { t } = useTranslation('profile');
  const {
    tab,
    bootstrapped,
    connected,
    username,
    isLoading,
    profile,
    statsEmpty,
    mode,
    error,
    setShareOpen,
    refresh,
    handleDisconnect,
  } = view;

  // Pre-narrowed branch flags so the JSX stays free of chained logicals.
  const showSetup = !connected && !username && !isLoading;
  const showLoadingSkeleton = isLoading && !profile;
  const showDashboard = Boolean(profile) && !statsEmpty;
  const showErrorState = Boolean(error) && !profile;

  return (
    <div
      className="relative z-[1] h-full flex flex-col"
      role="tabpanel"
      id={TAB_IDS[tab].panel}
      aria-labelledby={TAB_IDS[tab].tab}
    >
      {tab === 'app' ? (
        <InAppStatsPanel />
      ) : tab === 'mal' ? (
        <MalStatsPanel />
      ) : !bootstrapped ? (
        <ProfileSkeleton />
      ) : showSetup ? (
        <ProfileSetup />
      ) : showLoadingSkeleton ? (
        <ProfileSkeleton />
      ) : showDashboard && profile ? (
        <ProfileDashboard
          profile={profile}
          onShare={() => setShareOpen(true)}
          onRefresh={refresh}
          onDisconnect={handleDisconnect}
        />
      ) : statsEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {mode === 'viewer' ? t('view.empty.title') : t('view.private.title')}
            </p>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              {mode === 'viewer' ? t('view.empty.disconnect') : t('view.private.changeUser')}
            </Button>
          </div>
        </div>
      ) : showErrorState && error ? (
        <AniListErrorState error={error} onRetry={() => refresh()} />
      ) : null}
    </div>
  );
}

function TabSwitcher({
  tab,
  onChange,
  order,
}: {
  tab: ProfileTab;
  onChange: (next: ProfileTab) => void;
  order: ProfileTab[];
}) {
  const { t } = useTranslation('profile');
  const refs = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});

  const onArrow = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = order.indexOf(tab);
    if (idx === -1) return;
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = order[(idx + delta + order.length) % order.length];
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
      {order.map(id => (
        <TabButton
          key={id}
          ref={el => {
            refs.current[id] = el;
          }}
          id={TAB_IDS[id].tab}
          controls={TAB_IDS[id].panel}
          active={tab === id}
          onClick={() => onChange(id)}
        >
          {t(TAB_LABEL_KEY[id])}
        </TabButton>
      ))}
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
