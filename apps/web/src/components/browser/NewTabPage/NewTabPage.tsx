import { useTranslation } from 'react-i18next';
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
import { QuickStatsCard } from '../newtab/QuickStatsCard';
import { useNewTabPage } from './NewTabPage.hooks';
import { NewTabPanels } from './NewTabPage.parts';
import type { INewTabPageProps } from './NewTabPage.types';

export default function NewTabPage({ onNavigate }: INewTabPageProps) {
  const { t } = useTranslation('browser');
  const {
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
  } = useNewTabPage();

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
          <NewTabPanels
            panelOrder={panelOrder}
            hiddenPanels={hiddenPanels}
            showGreetingName={showGreetingName}
            airingCount={airingCount}
            sites={sites}
            hiddenPredefined={hiddenPredefined}
            frequentSites={frequentSites}
            onNavigate={onNavigate}
            onRemoveSite={handleRemoveSite}
            onAddSite={() => setIsAddDialogOpen(true)}
            onShowPredefined={showPredefined}
          />
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
