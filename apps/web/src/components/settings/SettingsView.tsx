import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Palette,
  Image as ImageIcon,
  LayoutGrid,
  LayoutDashboard,
  Eye,
  Globe,
  Download,
  Info,
  Bell,
  Boxes,
  Cat,
  Database,
  MessageCircle,
  Settings,
  Terminal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tDynamic } from '@/lib/i18n';
import { useAppVersion } from '@/hooks/useAppVersion';
import { IS_WINDOWS, IS_ELECTRON } from '@/lib/platform';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { ThemesSection } from '@/components/settings/ThemesSection';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { DockSection } from '@/components/settings/DockSection';
import { ViewsSection } from '@/components/settings/ViewsSection';
import { BrowserSection } from '@/components/settings/BrowserSection';
import { NewTabSection } from '@/components/settings/NewTabSection';
import { UpdatesSection } from '@/components/settings/UpdatesSection';
import { AboutSection } from '@/components/settings/AboutSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { MascotSection } from '@/components/settings/MascotSection';
import { DataSection } from '@/components/settings/DataSection';
import { DiscordSection } from '@/components/settings/DiscordSection';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { SuiteSection } from '@/components/settings/SuiteSection';
import { DeveloperSection } from '@/components/settings/DeveloperSection';

type SettingsSection =
  | 'general'
  | 'themes'
  | 'background'
  | 'dock'
  | 'views'
  | 'browser'
  | 'newtab'
  | 'notifications'
  | 'discord'
  | 'mascot'
  | 'data'
  | 'updates'
  | 'suite'
  | 'about'
  | 'developer';

type SectionGroup = 'app' | 'appearance' | 'integrations' | 'data' | 'advanced';

interface SectionDef {
  id: SettingsSection;
  /** i18n key for the label under `settings:nav.{labelKey}` */
  labelKey: string;
  /** i18n key for the subtitle under `settings:nav.{subtitleKey}` */
  subtitleKey: string;
  group: SectionGroup;
  Icon: LucideIcon;
}

const ALL_SECTIONS: SectionDef[] = [
  {
    id: 'general',
    labelKey: 'general',
    subtitleKey: 'generalSubtitle',
    group: 'app',
    Icon: Settings,
  },
  {
    id: 'browser',
    labelKey: 'browser',
    subtitleKey: 'browserSubtitle',
    group: 'app',
    Icon: Globe,
  },
  {
    id: 'newtab',
    labelKey: 'newtab',
    subtitleKey: 'newtabSubtitle',
    group: 'app',
    Icon: LayoutDashboard,
  },
  {
    id: 'notifications',
    labelKey: 'notifications',
    subtitleKey: 'notificationsSubtitle',
    group: 'app',
    Icon: Bell,
  },
  {
    id: 'themes',
    labelKey: 'themes',
    subtitleKey: 'themesSubtitle',
    group: 'appearance',
    Icon: Palette,
  },
  {
    id: 'background',
    labelKey: 'background',
    subtitleKey: 'backgroundSubtitle',
    group: 'appearance',
    Icon: ImageIcon,
  },
  {
    id: 'dock',
    labelKey: 'dock',
    subtitleKey: 'dockSubtitle',
    group: 'appearance',
    Icon: LayoutGrid,
  },
  {
    id: 'views',
    labelKey: 'views',
    subtitleKey: 'viewsSubtitle',
    group: 'appearance',
    Icon: Eye,
  },
  {
    id: 'discord',
    labelKey: 'discord',
    subtitleKey: 'discordSubtitle',
    group: 'integrations',
    Icon: MessageCircle,
  },
  {
    id: 'mascot',
    labelKey: 'mascot',
    subtitleKey: 'mascotSubtitle',
    group: 'integrations',
    Icon: Cat,
  },
  {
    id: 'data',
    labelKey: 'data',
    subtitleKey: 'dataSubtitle',
    group: 'data',
    Icon: Database,
  },
  {
    id: 'updates',
    labelKey: 'updates',
    subtitleKey: 'updatesSubtitle',
    group: 'data',
    Icon: Download,
  },
  {
    id: 'suite',
    labelKey: 'suite',
    subtitleKey: 'suiteSubtitle',
    group: 'data',
    Icon: Boxes,
  },
  {
    id: 'about',
    labelKey: 'about',
    subtitleKey: 'aboutSubtitle',
    group: 'data',
    Icon: Info,
  },
  {
    id: 'developer',
    labelKey: 'developer',
    subtitleKey: 'developerSubtitle',
    group: 'advanced',
    Icon: Terminal,
  },
];

const GROUP_LABEL_KEYS: Record<SectionGroup, string> = {
  app: 'groupApp',
  appearance: 'groupAppearance',
  integrations: 'groupIntegrations',
  data: 'groupData',
  advanced: 'groupAdvanced',
};

const GROUP_ORDER: SectionGroup[] = ['app', 'appearance', 'integrations', 'data', 'advanced'];

export function SettingsView() {
  const { t, i18n } = useTranslation('settings');
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    IS_ELECTRON ? 'general' : 'themes'
  );
  const version = useAppVersion('');

  // Filter platform-specific sections
  const sections = useMemo(
    () =>
      ALL_SECTIONS.filter(s => {
        if (s.id === 'mascot') return IS_WINDOWS;
        if (s.id === 'general') return IS_ELECTRON;
        return true;
      }),
    []
  );

  // Bucket sections by group while preserving the ALL_SECTIONS order
  const grouped = useMemo(() => {
    const buckets: Record<SectionGroup, SectionDef[]> = {
      app: [],
      appearance: [],
      integrations: [],
      data: [],
      advanced: [],
    };
    for (const s of sections) buckets[s.group].push(s);
    return buckets;
  }, [sections]);

  const currentSection = sections.find(s => s.id === activeSection) ?? sections[0];
  const currentLabel = tDynamic(i18n, `settings:nav.${currentSection.labelKey}`);
  const currentSubtitle = tDynamic(i18n, `settings:nav.${currentSection.subtitleKey}`);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader icon={currentSection.Icon} title={currentLabel} subtitle={currentSubtitle} />

      {/* ── Body: sidebar + main scroll area ────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar navigation */}
        <aside
          className="min-w-[220px] max-w-[280px] w-fit shrink-0 border-r border-border-glass overflow-y-auto pt-4 pb-20 px-3"
          role="tablist"
          aria-label={t('nav.ariaSections')}
        >
          {GROUP_ORDER.map(group => {
            const items = grouped[group];
            if (!items.length) return null;
            return (
              <div key={group} className="mb-1.5">
                <div className="px-2.5 pt-2 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                  {tDynamic(i18n, `settings:nav.${GROUP_LABEL_KEYS[group]}`)}
                </div>
                {items.map(section => {
                  const Icon = section.Icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg',
                        'text-[12.5px] font-medium text-left',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground/90'
                      )}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                        />
                      )}
                      <Icon
                        className={cn(
                          'w-[15px] h-[15px] shrink-0',
                          isActive ? 'opacity-100' : 'opacity-85'
                        )}
                      />
                      <span className="truncate">
                        {tDynamic(i18n, `settings:nav.${section.labelKey}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

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
                activeSection === 'discord' ? 'max-w-[1040px]' : 'max-w-[720px]'
              )}
            >
              {activeSection === 'general' && <GeneralSection />}
              {activeSection === 'themes' && <ThemesSection />}
              {activeSection === 'background' && <BackgroundSettings />}
              {activeSection === 'dock' && <DockSection />}
              {activeSection === 'views' && <ViewsSection />}
              {activeSection === 'browser' && <BrowserSection />}
              {activeSection === 'newtab' && <NewTabSection />}
              {activeSection === 'notifications' && <NotificationsSection />}
              {activeSection === 'discord' && <DiscordSection />}
              {activeSection === 'mascot' && <MascotSection />}
              {activeSection === 'data' && <DataSection />}
              {activeSection === 'updates' && <UpdatesSection version={version} />}
              {activeSection === 'suite' && <SuiteSection />}
              {activeSection === 'about' && <AboutSection version={version} />}
              {activeSection === 'developer' && <DeveloperSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
