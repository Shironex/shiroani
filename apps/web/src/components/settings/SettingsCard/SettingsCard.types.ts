import type { ElementType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Stateless shell — the colocated hook has no view-model to expose. */
export type ISettingsCardView = Record<string, never>;

export type SettingsCardTone =
  | 'primary'
  | 'green'
  | 'gold'
  | 'blue'
  | 'orange'
  | 'muted'
  | 'destructive';

export interface ISettingsCardProps {
  children?: ReactNode;
  className?: string;
  /** Icon for the section header */
  icon?: LucideIcon;
  /** Title shown next to the icon */
  title?: string;
  /** Subtitle shown below the title */
  subtitle?: ReactNode;
  /**
   * Optional tint for the icon tile (matches the mock's per-card accent colors).
   * When set to `destructive`, the outer container is also tinted and the
   * subtitle uses the destructive foreground — used for the "Danger zone" card.
   */
  tone?: SettingsCardTone;
  /** Optional extra content rendered inside the header, right-aligned (e.g. an inline switch). */
  headerAccessory?: ReactNode;
  /**
   * Custom header icon slot — replaces the default tinted icon tile. Used when
   * the section wants a full logo (e.g. About) instead of a Lucide icon.
   */
  iconSlot?: ReactNode;
}

export interface ISettingsRowProps {
  children: ReactNode;
  className?: string;
  /** Stack label above control instead of side-by-side (used for sliders/selects). */
  stacked?: boolean;
  /** When true, render a top divider (used for multi-row groups). */
  divider?: boolean;
}

export interface ISettingsRowLabelProps {
  title: ReactNode;
  description?: ReactNode;
  /** id applied to the title element for `aria-labelledby` wiring. */
  id?: string;
  /** id applied to the description element for `aria-describedby` wiring. */
  descriptionId?: string;
  className?: string;
}

export interface ISettingsToggleRowProps {
  /** Explicit id for the label — auto-generated when omitted. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
  className?: string;
}

export interface ISettingsSelectOption {
  value: string;
  label: ReactNode;
}

export interface ISettingsSelectRowProps {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<ISettingsSelectOption>;
  disabled?: boolean;
  divider?: boolean;
  className?: string;
  /** Override the width of the trigger (defaults to `w-40`). */
  triggerClassName?: string;
}

export interface ISettingsInfoCalloutProps {
  /** Leading icon component (e.g. `Info`, `Sparkles`). */
  icon: LucideIcon;
  /** Classes for the icon — controls its size and tint per section. */
  iconClassName: string;
  /** Vertical alignment of the icon against the body text. */
  align?: 'center' | 'start';
  /** Element used to wrap the body — `<p>` by default, `<span>` for inline `<Trans>` usage. */
  as?: ElementType;
  children: ReactNode;
}
