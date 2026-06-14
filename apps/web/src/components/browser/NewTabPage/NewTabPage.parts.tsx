import { useMemo, type ReactNode } from 'react';
import type { NewTabPanelId } from '@/stores/useNewTabStore';
import { GreetingBanner } from '../newtab/GreetingBanner';
import { AiringTodaySection } from '../newtab/AiringTodaySection';
import { QuickAccessPanel } from '../newtab/QuickAccessPanel';
import { RecentsPanel } from '../newtab/RecentsPanel';
import { ResumeWatchingSection } from '../newtab/ResumeSection';
import type { INewTabPanelsProps } from './NewTabPage.types';

/**
 * Build the list of panels to render, in the user's order, dropping hidden
 * ones. Quick Access and Recents render as a paired two-column sub-group only
 * when both are visible and still adjacent in the order; otherwise each falls
 * back to its own full-width block so hiding or reordering one never leaves a
 * dangling empty column.
 */
export function NewTabPanels({
  panelOrder,
  hiddenPanels,
  showGreetingName,
  airingCount,
  sites,
  hiddenPredefined,
  frequentSites,
  onNavigate,
  onRemoveSite,
  onAddSite,
  onShowPredefined,
}: INewTabPanelsProps) {
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
              onRemove={onRemoveSite}
              onAdd={onAddSite}
              onShowPredefined={onShowPredefined}
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
    onRemoveSite,
    onAddSite,
    onShowPredefined,
  ]);

  return <>{renderedPanels}</>;
}
