import { useCallback, useState, type KeyboardEvent } from 'react';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { IBrowserSectionProps, IBrowserSectionView } from './BrowserSection.types';

export function useBrowserSection(_props?: IBrowserSectionProps): IBrowserSectionView {
  const adblockEnabled = useBrowserStore(state => state.adblockEnabled);
  const setAdblockEnabled = useBrowserStore(state => state.setAdblockEnabled);
  const popupBlockEnabled = useBrowserStore(state => state.popupBlockEnabled);
  const setPopupBlockEnabled = useBrowserStore(state => state.setPopupBlockEnabled);
  const adblockWhitelist = useBrowserStore(state => state.adblockWhitelist);
  const addAdblockDomain = useBrowserStore(state => state.addAdblockDomain);
  const removeAdblockDomain = useBrowserStore(state => state.removeAdblockDomain);
  const restoreTabsOnStartup = useBrowserStore(state => state.restoreTabsOnStartup);
  const setRestoreTabsOnStartup = useBrowserStore(state => state.setRestoreTabsOnStartup);
  const splitTabsEnabled = useBrowserStore(state => state.splitTabsEnabled);
  const setSplitTabsEnabled = useBrowserStore(state => state.setSplitTabsEnabled);
  const favoritesBarVisible = useBrowserStore(state => state.favoritesBarVisible);
  const setFavoritesBarVisible = useBrowserStore(state => state.setFavoritesBarVisible);
  const trackFrequentSites = useQuickAccessStore(state => state.trackFrequentSites);
  const setTrackFrequentSites = useQuickAccessStore(state => state.setTrackFrequentSites);
  const autoTrackProgress = useSettingsStore(state => state.autoTrackProgress);
  const setAutoTrackProgress = useSettingsStore(state => state.setAutoTrackProgress);

  const [whitelistInput, setWhitelistInput] = useState('');

  const handleAddWhitelist = useCallback(() => {
    const value = whitelistInput.trim();
    if (!value) return;
    addAdblockDomain(value);
    setWhitelistInput('');
  }, [whitelistInput, addAdblockDomain]);

  const handleWhitelistKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddWhitelist();
      }
    },
    [handleAddWhitelist]
  );

  return {
    adblockEnabled,
    setAdblockEnabled,
    popupBlockEnabled,
    setPopupBlockEnabled,
    adblockWhitelist,
    removeAdblockDomain,
    restoreTabsOnStartup,
    setRestoreTabsOnStartup,
    splitTabsEnabled,
    setSplitTabsEnabled,
    favoritesBarVisible,
    setFavoritesBarVisible,
    trackFrequentSites,
    setTrackFrequentSites,
    autoTrackProgress,
    setAutoTrackProgress,
    whitelistInput,
    setWhitelistInput,
    handleAddWhitelist,
    handleWhitelistKeyDown,
  };
}
