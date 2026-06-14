import { useState, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { QuickAccessSite } from '@shiroani/shared';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useNewTabStore } from '@/stores/useNewTabStore';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import type { INewTabPageView } from './NewTabPage.types';

export function useNewTabPage(): INewTabPageView {
  const { customSites, frequentSites, hiddenPredefinedIds } = useQuickAccessStore(
    useShallow(s => ({
      customSites: s.sites,
      frequentSites: s.frequentSites,
      hiddenPredefinedIds: s.hiddenPredefinedIds,
    }))
  );
  const { addSite, removeSite, hidePredefined, showPredefined } = useQuickAccessStore.getState();

  const sites: QuickAccessSite[] = useMemo(() => {
    const visiblePredefined = PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id));
    return [...visiblePredefined, ...customSites];
  }, [hiddenPredefinedIds, customSites]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  const handleAddSite = useCallback(() => {
    const trimmedName = newSiteName.trim();
    const trimmedUrl = newSiteUrl.trim();
    if (!trimmedName || !trimmedUrl) return;

    const url = trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`;

    let icon: string | undefined;
    try {
      const domain = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      // Invalid URL, skip icon
    }

    addSite({ name: trimmedName, url, icon });
    setNewSiteName('');
    setNewSiteUrl('');
    setIsAddDialogOpen(false);
  }, [newSiteName, newSiteUrl, addSite]);

  const handleRemoveSite = useCallback(
    (site: QuickAccessSite) => {
      if (site.isPredefined) {
        hidePredefined(site.id);
      } else {
        removeSite(site.id);
      }
    },
    [hidePredefined, removeSite]
  );

  const hiddenPredefined = PREDEFINED_SITES.filter(s => hiddenPredefinedIds.includes(s.id));

  const hiddenPanels = useNewTabStore(s => s.hiddenPanels);
  const panelOrder = useNewTabStore(s => s.order);
  const showWatermark = useNewTabStore(s => s.showWatermark);
  const showGreetingName = useNewTabStore(s => s.showGreetingName);
  const airingCount = useNewTabStore(s => s.airingCount);

  return {
    sites,
    hiddenPredefined,
    frequentSites,
    hiddenPanels,
    panelOrder,
    showWatermark,
    showGreetingName,
    airingCount,
    isAddDialogOpen,
    setIsAddDialogOpen,
    newSiteName,
    setNewSiteName,
    newSiteUrl,
    setNewSiteUrl,
    handleAddSite,
    handleRemoveSite,
    showPredefined,
  };
}
