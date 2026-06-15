import { useState, useMemo, type ComponentType } from 'react';
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
  Coffee,
  Database,
  MessageCircle,
  Settings,
  Terminal,
  UserCircle,
} from 'lucide-react';
import { IS_WINDOWS, IS_ELECTRON } from '@/lib/platform';
import { ThemesSection } from '@/components/settings/ThemesSection';
import { BackgroundSettings } from '@/components/settings/BackgroundSettings';
import { DockSection } from '@/components/settings/DockSection';
import { ViewsSection } from '@/components/settings/ViewsSection';
import { BrowserSection } from '@/components/settings/BrowserSection';
import { NewTabSection } from '@/components/settings/NewTabSection';
import { UpdatesSection } from '@/components/settings/updates/UpdatesSection';
import { AboutSection } from '@/components/settings/AboutSection';
import { SupportSection } from '@/components/settings/SupportSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { MascotSection } from '@/components/settings/MascotSection';
import { DataSection } from '@/components/settings/DataSection';
import { DiscordSection } from '@/components/settings/DiscordSection';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { SuiteSection } from '@/components/settings/SuiteSection';
import { DeveloperSection } from '@/components/settings/DeveloperSection';
import { AccountsSection } from '@/components/settings/AccountsSection';
import type {
  ISectionDef,
  ISettingsViewView,
  SectionGroup,
  SettingsSection,
} from './SettingsView.types';

const ALL_SECTIONS: ISectionDef[] = [
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
    id: 'accounts',
    labelKey: 'accounts',
    subtitleKey: 'accountsSubtitle',
    group: 'integrations',
    Icon: UserCircle,
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
    id: 'about',
    labelKey: 'about',
    subtitleKey: 'aboutSubtitle',
    group: 'data',
    Icon: Info,
  },
  {
    id: 'support',
    labelKey: 'support',
    subtitleKey: 'supportSubtitle',
    group: 'data',
    Icon: Coffee,
  },
  {
    id: 'suite',
    labelKey: 'suite',
    subtitleKey: 'suiteSubtitle',
    group: 'data',
    Icon: Boxes,
  },
  {
    id: 'developer',
    labelKey: 'developer',
    subtitleKey: 'developerSubtitle',
    group: 'advanced',
    Icon: Terminal,
  },
];

export const GROUP_LABEL_KEYS: Record<SectionGroup, string> = {
  app: 'groupApp',
  appearance: 'groupAppearance',
  integrations: 'groupIntegrations',
  data: 'groupData',
  advanced: 'groupAdvanced',
};

export const GROUP_ORDER: SectionGroup[] = [
  'app',
  'appearance',
  'integrations',
  'data',
  'advanced',
];

// Dispatch table for the active section's panel. Typing it as a total
// `Record<SettingsSection, …>` makes TypeScript reject any new section id that
// forgets to register a panel, so dispatch can't silently render nothing.
// Platform gating (which sidebar buttons appear) stays in the `sections`
// filter below — this map only governs what renders for the active id.
const SECTION_PANEL: Record<SettingsSection, ComponentType> = {
  general: GeneralSection,
  themes: ThemesSection,
  background: BackgroundSettings,
  dock: DockSection,
  views: ViewsSection,
  browser: BrowserSection,
  newtab: NewTabSection,
  notifications: NotificationsSection,
  discord: DiscordSection,
  accounts: AccountsSection,
  mascot: MascotSection,
  data: DataSection,
  updates: UpdatesSection,
  suite: SuiteSection,
  about: AboutSection,
  support: SupportSection,
  developer: DeveloperSection,
};

/**
 * Owns the settings view's active section, the platform-filtered section list,
 * the group buckets, and the active panel component. Label/subtitle strings are
 * computed in the shell from `currentSection` via `tDynamic`.
 */
export function useSettingsView(): ISettingsViewView {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    IS_ELECTRON ? 'general' : 'themes'
  );

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
    const buckets: Record<SectionGroup, ISectionDef[]> = {
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

  const Panel = SECTION_PANEL[currentSection.id];

  return {
    activeSection,
    setActiveSection,
    sections,
    grouped,
    currentSection,
    Panel,
  };
}
