import { useState, useEffect } from 'react';
import { DEFAULT_FEED_STARTUP_REFRESH, FEED_STARTUP_REFRESH_SETTING_KEY } from '@shiroani/shared';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useMountedRef } from '@/hooks/useMountedRef';
import type { IGeneralSectionProps, IGeneralSectionView } from './GeneralSection.types';

export function useGeneralSection(_props?: IGeneralSectionProps): IGeneralSectionView {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [feedRefreshOnStartup, setFeedRefreshOnStartup] = useState(DEFAULT_FEED_STARTUP_REFRESH);
  const [loaded, setLoaded] = useState(false);
  const displayName = useSettingsStore(s => s.displayName);
  const setDisplayName = useSettingsStore(s => s.setDisplayName);
  const isMounted = useMountedRef();

  useEffect(() => {
    Promise.all([
      window.electronAPI?.app?.getAutoLaunch(),
      window.electronAPI?.store?.get<boolean>(FEED_STARTUP_REFRESH_SETTING_KEY),
    ])
      .then(([enabled, startupRefresh]) => {
        if (!isMounted()) return;
        setAutoLaunch(enabled ?? false);
        setFeedRefreshOnStartup(startupRefresh ?? DEFAULT_FEED_STARTUP_REFRESH);
      })
      .catch(() => {
        // Fall back to defaults — still mark loaded so the section renders
        // instead of staying blank forever.
      })
      .finally(() => {
        if (isMounted()) setLoaded(true);
      });
  }, [isMounted]);

  const handleAutoLaunchChange = async (enabled: boolean) => {
    setAutoLaunch(enabled);
    const actual = await window.electronAPI?.app?.setAutoLaunch(enabled);
    if (actual !== undefined) {
      setAutoLaunch(actual);
    }
  };

  const handleFeedRefreshOnStartupChange = async (enabled: boolean) => {
    setFeedRefreshOnStartup(enabled);
    await window.electronAPI?.store?.set(FEED_STARTUP_REFRESH_SETTING_KEY, enabled);
  };

  return {
    autoLaunch,
    feedRefreshOnStartup,
    loaded,
    displayName,
    setDisplayName,
    handleAutoLaunchChange,
    handleFeedRefreshOnStartupChange,
  };
}
