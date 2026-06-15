import type { ComponentType, Dispatch, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';

export type SettingsSection =
  | 'general'
  | 'themes'
  | 'background'
  | 'dock'
  | 'views'
  | 'browser'
  | 'newtab'
  | 'notifications'
  | 'discord'
  | 'accounts'
  | 'mascot'
  | 'data'
  | 'updates'
  | 'suite'
  | 'about'
  | 'support'
  | 'developer';

export type SectionGroup = 'app' | 'appearance' | 'integrations' | 'data' | 'advanced';

export interface ISectionDef {
  id: SettingsSection;
  /** i18n key for the label under `settings:nav.{labelKey}` */
  labelKey: string;
  /** i18n key for the subtitle under `settings:nav.{subtitleKey}` */
  subtitleKey: string;
  group: SectionGroup;
  Icon: LucideIcon;
}

export type ISettingsViewProps = Record<string, never>;

export interface ISettingsViewView {
  readonly activeSection: SettingsSection;
  readonly setActiveSection: Dispatch<SetStateAction<SettingsSection>>;
  readonly sections: ISectionDef[];
  readonly grouped: Record<SectionGroup, ISectionDef[]>;
  readonly currentSection: ISectionDef;
  readonly Panel: ComponentType;
}
