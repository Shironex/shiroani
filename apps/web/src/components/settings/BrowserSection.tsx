import { useCallback, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Shield, X, AppWindow, Copy, ListVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PillTag } from '@/components/ui/pill-tag';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { SettingsCard, SettingsToggleRow } from '@/components/settings/SettingsCard';
import { cn } from '@/lib/utils';

const BLOCKED_CATEGORY_KEYS = ['graphic', 'trackers', 'videoAds'] as const;

export function BrowserSection() {
  const { t } = useTranslation('settings');
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

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Shield}
        title={t('browser.adblock.card.title')}
        subtitle={t('browser.adblock.card.subtitle')}
      >
        <SettingsToggleRow
          id="browser-adblock-label"
          title={t('browser.adblock.toggleTitle')}
          description={t('browser.adblock.toggleDescription')}
          checked={adblockEnabled}
          onCheckedChange={setAdblockEnabled}
        />

        {/* Blocked categories status chips */}
        <div className="flex flex-col gap-1.5">
          {BLOCKED_CATEGORY_KEYS.map(key => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-border-glass/70 bg-background/30 px-3 py-2 text-[12px]"
            >
              <span className="text-muted-foreground">
                {t(`browser.adblock.categories.${key}`)}
              </span>
              <PillTag variant={adblockEnabled ? 'green' : 'muted'}>
                {adblockEnabled
                  ? t('browser.adblock.categoryBlocked')
                  : t('browser.adblock.categoryDisabled')}
              </PillTag>
            </div>
          ))}
        </div>

        {/* Whitelist subsection */}
        <div className="border-t border-border-glass/50 pt-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {t('browser.adblock.exceptions')}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
              {t('browser.adblock.exceptionsCount', { count: adblockWhitelist.length, max: 500 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={whitelistInput}
              onChange={e => setWhitelistInput(e.target.value)}
              onKeyDown={handleWhitelistKeyDown}
              placeholder={t('browser.adblock.addPlaceholder')}
              aria-label={t('browser.adblock.addAria')}
              maxLength={253}
              className="flex-1 font-mono text-[12px]"
            />
            <Button size="sm" onClick={handleAddWhitelist} disabled={!whitelistInput.trim()}>
              {t('browser.adblock.addButton')}
            </Button>
          </div>

          {adblockWhitelist.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground/80 leading-snug">
              {t('browser.adblock.emptyExceptions')}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label={t('browser.adblock.listAria')}>
              {adblockWhitelist.map(host => (
                <li key={host}>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-[3px]',
                      'bg-foreground/[0.05] border border-border-glass',
                      'font-mono text-[11px] text-foreground'
                    )}
                  >
                    <span className="leading-none">{host}</span>
                    <button
                      type="button"
                      onClick={() => removeAdblockDomain(host)}
                      aria-label={t('browser.adblock.removeAria', { host })}
                      className={cn(
                        'grid place-items-center size-[18px] rounded-full',
                        'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]',
                        'transition-colors cursor-pointer'
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11.5px] text-muted-foreground/85 leading-relaxed">
            {t('browser.adblock.exceptionsHint')}
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={AppWindow}
        title={t('browser.popups.card.title')}
        subtitle={t('browser.popups.card.subtitle')}
        tone="gold"
      >
        <SettingsToggleRow
          id="browser-popup-block-label"
          title={t('browser.popups.toggleTitle')}
          description={t('browser.popups.toggleDescription')}
          checked={popupBlockEnabled}
          onCheckedChange={setPopupBlockEnabled}
        />
      </SettingsCard>

      <SettingsCard
        icon={Copy}
        title={t('browser.tabs.card.title')}
        subtitle={t('browser.tabs.card.subtitle')}
        tone="blue"
      >
        <SettingsToggleRow
          id="browser-restore-tabs-label"
          title={t('browser.tabs.restoreTitle')}
          description={t('browser.tabs.restoreDescription')}
          checked={restoreTabsOnStartup}
          onCheckedChange={setRestoreTabsOnStartup}
        />

        <SettingsToggleRow
          id="browser-split-tabs-label"
          title={t('browser.tabs.splitTitle')}
          description={t('browser.tabs.splitDescription')}
          checked={splitTabsEnabled}
          onCheckedChange={setSplitTabsEnabled}
        />

        <SettingsToggleRow
          id="browser-track-frequent-label"
          title={t('browser.tabs.trackTitle')}
          description={t('browser.tabs.trackDescription')}
          checked={trackFrequentSites}
          onCheckedChange={setTrackFrequentSites}
        />
      </SettingsCard>

      <SettingsCard
        icon={ListVideo}
        title={t('browser.tracking.card.title')}
        subtitle={t('browser.tracking.card.subtitle')}
        tone="green"
      >
        <SettingsToggleRow
          id="browser-auto-track-label"
          title={t('browser.tracking.toggleTitle')}
          description={t('browser.tracking.toggleDescription')}
          checked={autoTrackProgress}
          onCheckedChange={setAutoTrackProgress}
        />
      </SettingsCard>

      <SettingsCard
        icon={Globe}
        title={t('browser.general.card.title')}
        subtitle={t('browser.general.card.subtitle')}
        tone="muted"
      >
        <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
          {t('browser.general.description')}
        </p>
      </SettingsCard>
    </div>
  );
}
