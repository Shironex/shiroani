import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { useProfileStore, startProfileRefresh, stopProfileRefresh } from '@/stores/useProfileStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { ProfileSetup } from './ProfileSetup';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProfileDashboard } from './ProfileDashboard';
import { ProfileShareDialog } from './ProfileShareDialog';
import { InAppStatsPanel } from './InAppStatsPanel';
import { MalStatsPanel } from './MalStatsPanel';

type ProfileTab = 'anilist' | 'mal' | 'app';

const TAB_IDS: Record<ProfileTab, { tab: string; panel: string }> = {
  anilist: { tab: 'profile-tab-anilist', panel: 'profile-panel-anilist' },
  mal: { tab: 'profile-tab-mal', panel: 'profile-panel-mal' },
  app: { tab: 'profile-tab-app', panel: 'profile-panel-app' },
};

/**
 * Tab order, gated on the MAL connection. The `mal` tab only exists while a MAL
 * account is connected — it is dropped entirely from the tablist (and keyboard
 * arrow cycle) otherwise, mirroring how the AniList tab body adapts to its own
 * connection state.
 */
function buildTabOrder(malConnected: boolean): ProfileTab[] {
  return malConnected ? ['anilist', 'mal', 'app'] : ['anilist', 'app'];
}

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
  const mode = useProfileStore(s => s.mode);
  const isLoading = useProfileStore(s => s.isLoading);
  const error = useProfileStore(s => s.error);
  const initFromStore = useProfileStore(s => s.initFromStore);
  const fetchViewerProfile = useProfileStore(s => s.fetchViewerProfile);
  const refresh = useProfileStore(s => s.refresh);
  const clearProfile = useProfileStore(s => s.clearProfile);

  const connected = useAniListAuthStore(s => s.status.connected);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const disconnect = useAniListAuthStore(s => s.disconnect);

  const malConnected = useMalAuthStore(s => s.status.connected);
  const fetchMalStatus = useMalAuthStore(s => s.fetchStatus);

  const malProfile = useMalProfileStore(s => s.profile);
  const malLoading = useMalProfileStore(s => s.isLoading);
  const fetchMalProfile = useMalProfileStore(s => s.fetchProfile);

  const navigateToBrowser = useNavigateToBrowser();

  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('anilist');
  const tabOrder = buildTabOrder(malConnected);
  // Tracks whether the initial auth-status resolution + first-profile dispatch
  // has run. Until then we show the skeleton, NOT ProfileSetup — the auth store
  // isn't persisted, so on first paint `connected` is false and `username` is
  // empty, which would otherwise flash the "connect" form for a connected user.
  const [bootstrapped, setBootstrapped] = useState(false);

  // Auth status is fetched lazily across the app (no boot-time call), so resolve
  // it BEFORE deciding viewer-vs-public. Once known: a connected account loads
  // its OWN profile (private stats, no username) via GET_VIEWER_PROFILE;
  // everyone else restores the stored public username. Awaiting status first
  // avoids a double fetch + a flash of the wrong profile when `connected`
  // resolves async.
  useEffect(() => {
    let cancelled = false;
    void fetchStatus().then(() => {
      if (cancelled) return;
      if (useAniListAuthStore.getState().status.connected) {
        fetchViewerProfile();
      } else {
        initFromStore();
      }
      setBootstrapped(true);
    });
    startProfileRefresh();
    return () => {
      cancelled = true;
      stopProfileRefresh();
    };
  }, [fetchStatus, fetchViewerProfile, initFromStore]);

  // Resolve the MAL connection lazily (no boot-time call) so the `mal` tab only
  // appears once we know an account is connected. The panel itself fetches the
  // stats on mount.
  useEffect(() => {
    void fetchMalStatus();
  }, [fetchMalStatus]);

  // If MAL disconnects while its tab is active, the tab vanishes from the
  // tablist — fall back to the always-present AniList tab so we never render a
  // panel without a matching tab.
  useEffect(() => {
    if (tab === 'mal' && !malConnected) setTab('anilist');
  }, [tab, malConnected]);

  // A connected viewer disconnects through the auth store (not `clearProfile`):
  // clearing the username while `connected` stays true would let the mount
  // effect immediately refetch, making the button look dead.
  const handleDisconnect = () => {
    if (mode === 'viewer') {
      void disconnect();
      clearProfile();
    } else {
      clearProfile();
    }
  };

  const statsEmpty = profile && profile.statistics.count === 0;

  const subtitle =
    tab === 'app'
      ? t('view.subtitleApp')
      : tab === 'mal'
        ? t('view.subtitleMal')
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
            <TabSwitcher tab={tab} onChange={setTab} order={tabOrder} />
            {isAniListTab && profile && (
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
            {tab === 'mal' && malProfile && (
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
                onClick={() => navigateToBrowser(profile.siteUrl)}
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
          ) : tab === 'mal' ? (
            <MalStatsPanel />
          ) : !bootstrapped ? (
            <ProfileSkeleton />
          ) : !connected && !username && !isLoading ? (
            <ProfileSetup />
          ) : isLoading && !profile ? (
            <ProfileSkeleton />
          ) : profile && !statsEmpty ? (
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
          ) : error && !profile ? (
            <AniListErrorState error={error} onRetry={() => refresh()} />
          ) : null}
        </div>
      </div>

      {profile && !statsEmpty && (
        <ProfileShareDialog open={shareOpen} onOpenChange={setShareOpen} profile={profile} />
      )}
    </div>
  );
}

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
