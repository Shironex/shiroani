import { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Image as ImageIcon,
  LayoutGrid,
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
import { IS_WINDOWS, IS_MAC, IS_ELECTRON } from '@/lib/platform';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { ThemesSection } from '@/components/settings/ThemesSection';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { DockSection } from '@/components/settings/DockSection';
import { ViewsSection } from '@/components/settings/ViewsSection';
import { BrowserSection } from '@/components/settings/BrowserSection';
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
  label: string;
  subtitle: string;
  group: SectionGroup;
  Icon: LucideIcon;
}

const ALL_SECTIONS: SectionDef[] = [
  {
    id: 'general',
    label: 'Ogólne',
    subtitle: 'Podstawowe ustawienia aplikacji',
    group: 'app',
    Icon: Settings,
  },
  {
    id: 'browser',
    label: 'Przeglądarka',
    subtitle: 'Ustawienia wbudowanej przeglądarki',
    group: 'app',
    Icon: Globe,
  },
  {
    id: 'notifications',
    label: 'Powiadomienia',
    subtitle: 'Nowe odcinki i harmonogram emisji',
    group: 'app',
    Icon: Bell,
  },
  {
    id: 'themes',
    label: 'Motywy',
    subtitle: 'Paleta kolorów i skala czytelności',
    group: 'appearance',
    Icon: Palette,
  },
  {
    id: 'background',
    label: 'Tło',
    subtitle: 'Własny obraz tła i regulacja rozmycia',
    group: 'appearance',
    Icon: ImageIcon,
  },
  {
    id: 'dock',
    label: 'Dock',
    subtitle: 'Pozycja i zachowanie paska nawigacji',
    group: 'appearance',
    Icon: LayoutGrid,
  },
  {
    id: 'views',
    label: 'Widoki',
    subtitle: 'Widoczność sekcji w docku',
    group: 'appearance',
    Icon: Eye,
  },
  {
    id: 'discord',
    label: 'Discord',
    subtitle: 'Rich Presence: pokaż znajomym, co oglądasz',
    group: 'integrations',
    Icon: MessageCircle,
  },
  {
    id: 'mascot',
    label: 'Maskotka',
    subtitle: 'Animowana maskotka chibi na pulpicie',
    group: 'integrations',
    Icon: Cat,
  },
  {
    id: 'data',
    label: 'Dane',
    subtitle: 'Eksport i import danych aplikacji',
    group: 'data',
    Icon: Database,
  },
  {
    id: 'updates',
    label: 'Aktualizacje',
    subtitle: 'Wersja i kanał aktualizacji',
    group: 'data',
    Icon: Download,
  },
  {
    id: 'suite',
    label: 'Rodzina',
    subtitle: 'Inne aplikacje, które warto sprawdzić',
    group: 'data',
    Icon: Boxes,
  },
  {
    id: 'about',
    label: 'O aplikacji',
    subtitle: 'Historia, wersja i logi',
    group: 'data',
    Icon: Info,
  },
  {
    id: 'developer',
    label: 'Deweloper',
    subtitle: 'Narzędzia debugowania i diagnostyka',
    group: 'advanced',
    Icon: Terminal,
  },
];

const GROUP_LABELS: Record<SectionGroup, string> = {
  app: 'Aplikacja',
  appearance: 'Wygląd',
  integrations: 'Integracje',
  data: 'Dane',
  advanced: 'Zaawansowane',
};

const GROUP_ORDER: SectionGroup[] = ['app', 'appearance', 'integrations', 'data', 'advanced'];

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    IS_ELECTRON ? 'general' : 'themes'
  );
  const [version, setVersion] = useState('');

  // Filter platform-specific sections
  const sections = useMemo(
    () =>
      ALL_SECTIONS.filter(s => {
        if (s.id === 'mascot') return IS_WINDOWS || IS_MAC;
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

  // Fetch app version once for both UpdatesSection and AboutSection
  useEffect(() => {
    let mounted = true;
    window.electronAPI?.app?.getVersion().then(v => {
      if (!mounted) return;
      if (v) setVersion(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentSection = sections.find(s => s.id === activeSection) ?? sections[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader
        icon={currentSection.Icon}
        title={currentSection.label}
        subtitle={currentSection.subtitle}
      />

      {/* ── Body: sidebar + main scroll area ────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar navigation */}
        <aside
          className="min-w-[220px] max-w-[280px] w-fit shrink-0 border-r border-border-glass overflow-y-auto pt-4 pb-20 px-3"
          role="tablist"
          aria-label="Sekcje ustawień"
        >
          {GROUP_ORDER.map(group => {
            const items = grouped[group];
            if (!items.length) return null;
            return (
              <div key={group} className="mb-1.5">
                <div className="px-2.5 pt-2 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                  {GROUP_LABELS[group]}
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
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Main section content */}
        <div
          className="flex-1 relative overflow-hidden"
          role="tabpanel"
          aria-label={currentSection.label}
        >
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
