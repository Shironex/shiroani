import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuickAccessSite } from '@shiroani/shared';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useNewTabStore, type NewTabPanelId } from '@/stores/useNewTabStore';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { GreetingBanner } from './newtab/GreetingBanner';
import { AiringTodaySection } from './newtab/AiringTodaySection';
import { QuickStatsCard } from './newtab/QuickStatsCard';
import { QuickAccessPanel } from './newtab/QuickAccessPanel';
import { RecentsPanel } from './newtab/RecentsPanel';
import { ResumeWatchingSection } from './newtab/ResumeSection';

interface NewTabPageProps {
  onNavigate: (url: string) => void;
}

export function NewTabPage({ onNavigate }: NewTabPageProps) {
  const { t } = useTranslation('browser');
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

  // Build the list of panels to render, in the user's order, dropping hidden
  // ones. Quick Access and Recents render as a paired two-column sub-group only
  // when both are visible and still adjacent in the order; otherwise each falls
  // back to its own full-width block so hiding or reordering one never leaves a
  // dangling empty column.
  const renderedPanels = useMemo(() => {
    const hidden = new Set(hiddenPanels);
    const visible = panelOrder.filter(id => !hidden.has(id));

    const node = (id: NewTabPanelId): ReactNode => {
      switch (id) {
        case 'greeting':
          return <GreetingBanner showName={showGreetingName} />;
        case 'airing':
          return <AiringTodaySection maxCards={airingCount} />;
        case 'quickAccess':
          return (
            <QuickAccessPanel
              sites={sites}
              hiddenPredefined={hiddenPredefined}
              onNavigate={onNavigate}
              onRemove={handleRemoveSite}
              onAdd={() => setIsAddDialogOpen(true)}
              onShowPredefined={showPredefined}
            />
          );
        case 'recents':
          return <RecentsPanel frequentSites={frequentSites} onNavigate={onNavigate} />;
        case 'resume':
          return <ResumeWatchingSection onNavigate={onNavigate} />;
        default:
          return null;
      }
    };

    const out: ReactNode[] = [];
    for (let i = 0; i < visible.length; i++) {
      const id = visible[i];
      const next = visible[i + 1];
      if (id === 'quickAccess' && next === 'recents') {
        out.push(
          <div key="qa-recents" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-6">
            {node('quickAccess')}
            {node('recents')}
          </div>
        );
        i++; // consumed the recents panel as part of the pair
        continue;
      }
      const rendered = node(id);
      // Skip the margin wrapper for panels that self-hide (e.g. Airing today
      // with no entries) so they never leave a dangling empty gap.
      if (rendered == null) continue;
      out.push(
        <div key={id} className="mb-6">
          {rendered}
        </div>
      );
    }
    return out;
  }, [
    hiddenPanels,
    panelOrder,
    showGreetingName,
    airingCount,
    sites,
    hiddenPredefined,
    frequentSites,
    onNavigate,
    handleRemoveSite,
    showPredefined,
  ]);

  return (
    <div className="relative h-full overflow-hidden">
      {/* Decorative kanji watermark — 網 (mou: net / web).
          Clipped wrapper keeps the glyph's negative offsets from producing
          scrollbars on either axis. */}
      {showWatermark && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="網" position="br" size={320} opacity={0.03} />
        </div>
      )}

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div className="relative z-[1] mx-auto w-full max-w-5xl px-7 pt-8 pb-20">
          {renderedPanels}
          {/* Quick stats — rendered as a fixed block (not yet a reorderable
              panel; see followup to promote it into useNewTabStore). */}
          <div className="mb-6">
            <QuickStatsCard />
          </div>
        </div>
      </div>

      {/* Add Site Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('newTab.quickAccess.addDialog.title')}</DialogTitle>
            <DialogDescription>{t('newTab.quickAccess.addDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={t('newTab.quickAccess.addDialog.namePlaceholder')}
              value={newSiteName}
              onChange={e => setNewSiteName(e.target.value)}
              aria-label={t('newTab.quickAccess.addDialog.nameAria')}
              className="h-8 text-sm"
            />
            <Input
              placeholder={t('newTab.quickAccess.addDialog.urlPlaceholder')}
              value={newSiteUrl}
              onChange={e => setNewSiteUrl(e.target.value)}
              aria-label={t('newTab.quickAccess.addDialog.urlAria')}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddSite();
              }}
              className="h-8 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              size="sm"
              onClick={handleAddSite}
              disabled={!newSiteName.trim() || !newSiteUrl.trim()}
            >
              {t('newTab.quickAccess.addDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
