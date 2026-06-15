import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { tDynamic } from '@/lib/i18n';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { useSettingsView, GROUP_ORDER, GROUP_LABEL_KEYS } from './SettingsView.hooks';
import { SidebarGroup } from './SettingsView.parts';

export default function SettingsView() {
  const { t, i18n } = useTranslation('settings');
  const { activeSection, setActiveSection, grouped, currentSection, Panel } = useSettingsView();

  const currentLabel = tDynamic(i18n, `settings:nav.${currentSection.labelKey}`);
  const currentSubtitle = tDynamic(i18n, `settings:nav.${currentSection.subtitleKey}`);

  const groupSections = GROUP_ORDER.map(group => {
    const items = grouped[group];
    if (!items.length) return null;
    return (
      <SidebarGroup
        key={group}
        i18n={i18n}
        groupLabelKey={GROUP_LABEL_KEYS[group]}
        items={items}
        activeSection={activeSection}
        onSelect={setActiveSection}
      />
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader icon={currentSection.Icon} title={currentLabel} subtitle={currentSubtitle} />

      {/* ── Body: sidebar + main scroll area ────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar navigation — a plain div carries role="tablist"; an <aside>'s
            implicit complementary role can't be overridden to tablist (axe:
            aria-allowed-role). */}
        <div
          className="min-w-[220px] max-w-[280px] w-fit shrink-0 border-r border-border-glass overflow-y-auto pt-4 pb-20 px-3"
          role="tablist"
          aria-label={t('nav.ariaSections')}
        >
          {groupSections}
        </div>

        {/* Main section content */}
        <div className="flex-1 relative overflow-hidden" role="tabpanel" aria-label={currentLabel}>
          {/* Decorative kanji watermark — 設 (setsu: settings/establish).
              Lives outside the scroll container so its negative offsets don't
              contribute to scrollbars on either axis. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <KanjiWatermark kanji="設" position="br" size={280} opacity={0.03} />
          </div>

          {/* Scrollable content fills the area above the watermark layer */}
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
            <div
              className={cn(
                'relative z-[1] px-7 pt-5 pb-24',
                currentSection.id === 'discord' ? 'max-w-[1040px]' : 'max-w-[720px]'
              )}
            >
              <Panel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
