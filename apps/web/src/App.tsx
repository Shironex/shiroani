import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';

import { TitleBar } from '@/components/shared/TitleBar';
import { NavigationDock } from '@/components/shared/NavigationDock';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BrowserView } from '@/components/browser/BrowserView';
import { LibraryView } from '@/components/library/LibraryView';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { SettingsView } from '@/components/settings/SettingsView';
import { DiaryView } from '@/components/diary/DiaryView';
import { FeedView } from '@/components/feed/FeedView';
import { DiscoverView } from '@/components/discover/DiscoverView';
import { ProfileView } from '@/components/profile/ProfileView';
import { ChangelogView } from '@/components/changelog/ChangelogView';
import { SplashScreen } from '@/components/splash';
import { OnboardingWizard } from '@/components/onboarding';
import { hydrateLanguageFromStore } from '@/lib/i18n';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAppStore } from '@/stores/useAppStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useDockStore } from '@/stores/useDockStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { AppBackground } from '@/components/shared/AppBackground';
import { BackgroundOverlay } from '@/components/shared/BackgroundOverlay';
import { ConnectionBanner } from '@/components/shared/ConnectionBanner';

function App() {
  const activeView = useAppStore(s => s.activeView);
  const navigateTo = useAppStore(s => s.navigateTo);
  const { ready, error } = useAppInitialization();
  const [splashDone, setSplashDone] = useState(false);
  const customBackground = useBackgroundStore(s => s.customBackground);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);
  const initSettings = useSettingsStore(s => s.initSettings);

  const onboardingCompleted = useOnboardingStore(s => s.completed);
  const initOnboarding = useOnboardingStore(s => s.initOnboarding);
  // Track locally so resetting from settings immediately shows onboarding
  const [onboardingDone, setOnboardingDone] = useState(onboardingCompleted);

  // Sync when store resets (e.g. user clicked "rerun onboarding" in settings)
  useEffect(() => {
    if (!onboardingCompleted) setOnboardingDone(false);
  }, [onboardingCompleted]);

  // Reconcile renderer i18next with the durable electron-store value once on
  // mount. The synchronous boot already seeded from localStorage in lib/i18n;
  // this catches the case where another window changed the language after
  // this window's last reload. Idempotent / StrictMode-safe.
  useEffect(() => {
    void hydrateLanguageFromStore();
  }, []);

  const handleSplashDismissed = useCallback(() => setSplashDone(true), []);
  const handleOnboardingComplete = useCallback(() => setOnboardingDone(true), []);

  const initDock = useDockStore(s => s.initDock);

  // Restore persisted visual settings and dock settings on startup
  useEffect(() => {
    if (ready) {
      void initSettings();
      void initDock();
      void initOnboarding();
    }
  }, [ready, initSettings, initDock, initOnboarding]);

  // Listen for navigation events from the main process (e.g. mascot overlay context menu)
  useEffect(() => {
    const unsub = window.electronAPI?.overlay?.onNavigate?.((view: string) => {
      if (
        view === 'schedule' ||
        view === 'library' ||
        view === 'discover' ||
        view === 'profile' ||
        view === 'settings' ||
        view === 'browser' ||
        view === 'diary' ||
        view === 'feed' ||
        view === 'changelog'
      ) {
        navigateTo(view);
      }
    });
    return () => {
      unsub?.();
    };
  }, [navigateTo]);

  const hasBg = !!customBackground;

  return (
    <>
      {/* Splash screen overlay — covers everything during initialization */}
      <SplashScreen ready={ready} error={error} onDismissed={handleSplashDismissed} />

      {/* Onboarding wizard — shown after splash on first launch */}
      {splashDone && !onboardingDone && <OnboardingWizard onComplete={handleOnboardingComplete} />}

      {splashDone && onboardingDone && (
        <div
          data-testid="app-ready"
          className={cn(
            'h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden relative',
            IS_ELECTRON && 'rounded-t-[10px]'
          )}
        >
          {/* Decorative radial glows + SVG noise — behind user wallpaper (if any) */}
          {!isFullScreen && <AppBackground />}

          {/* Custom background overlay — covers entire window including sidebar */}
          {hasBg && !isFullScreen && <BackgroundOverlay />}

          {/* Custom title bar for frameless window — hidden in fullscreen */}
          {IS_ELECTRON && !isFullScreen && <TitleBar />}

          {/* Connection status banner */}
          <ConnectionBanner />

          {/* Content area — full width, with bottom padding for the dock */}
          <main
            id="main-content"
            className={cn(
              'flex-1 flex overflow-hidden relative z-[1]',
              hasBg ? 'bg-transparent' : 'bg-background'
            )}
          >
            <ErrorBoundary>
              <div
                style={{
                  display: activeView === 'browser' ? 'flex' : 'none',
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                <BrowserView />
              </div>
              {activeView === 'library' && <LibraryView />}
              {activeView === 'discover' && <DiscoverView />}
              {activeView === 'diary' && <DiaryView />}
              {activeView === 'schedule' && <ScheduleView />}
              {activeView === 'feed' && <FeedView />}
              {activeView === 'profile' && <ProfileView />}
              {activeView === 'changelog' && <ChangelogView />}
              {activeView === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </main>

          {/* Floating dock navigation — hidden in fullscreen */}
          {!isFullScreen && <NavigationDock hasBg={hasBg} />}
        </div>
      )}
    </>
  );
}

export default App;
