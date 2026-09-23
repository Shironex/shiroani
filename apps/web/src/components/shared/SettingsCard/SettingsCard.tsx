import { useId } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ISettingsCardProps,
  ISettingsFieldLabelProps,
  ISettingsInfoCalloutProps,
  ISettingsRowLabelProps,
  ISettingsRowProps,
  ISettingsSelectRowProps,
  ISettingsToggleRowProps,
  SettingsCardTone,
} from './SettingsCard.types';

const TONE_TILE: Record<SettingsCardTone, string> = {
  primary: 'bg-primary/15 border-primary/30 text-primary',
  green:
    'bg-[oklch(from_var(--status-success)_l_c_h/0.14)] border-[oklch(from_var(--status-success)_l_c_h/0.32)] text-status-success',
  gold: 'bg-gold-bg border-[oklch(from_var(--gold)_l_c_h/0.32)] text-gold',
  blue: 'bg-[oklch(from_var(--status-info)_l_c_h/0.14)] border-[oklch(from_var(--status-info)_l_c_h/0.32)] text-status-info',
  orange:
    'bg-[oklch(from_var(--status-pending)_l_c_h/0.14)] border-[oklch(from_var(--status-pending)_l_c_h/0.32)] text-status-pending',
  muted: 'bg-muted/25 border-border-glass text-muted-foreground',
  destructive: 'bg-destructive/15 border-destructive/30 text-destructive',
};

export default function SettingsCard({
  children,
  className,
  icon: Icon,
  title,
  subtitle,
  tone = 'primary',
  headerAccessory,
  iconSlot,
}: ISettingsCardProps) {
  const hasHeader = (Icon || iconSlot) && title;
  const isDestructive = tone === 'destructive';
  // Lifted out of JSX render position to satisfy `no-jsx-computation` — a custom
  // icon slot wins, otherwise fall back to the default tinted Lucide tile.
  const headerIcon =
    iconSlot ??
    (Icon ? (
      <div
        className={cn(
          'grid place-items-center flex-shrink-0 size-[38px] rounded-lg border',
          TONE_TILE[tone]
        )}
      >
        <Icon className="w-[18px] h-[18px]" />
      </div>
    ) : null);
  return (
    <div
      className={cn(
        'relative rounded-xl border backdrop-blur-sm',
        'px-5 py-4',
        isDestructive
          ? 'border-destructive/25 bg-destructive/[0.06]'
          : 'border-border-glass bg-card/40',
        className
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-start gap-3',
            children
              ? cn(
                  'mb-3.5 pb-3 border-b',
                  isDestructive ? 'border-destructive/15' : 'border-border-glass/60'
                )
              : undefined
          )}
        >
          {headerIcon}
          <div className="min-w-0 flex-1 pt-0.5">
            {/* h2: the view's single h1 lives in the shared ViewHeader, so each
                settings card is a second-level section under it (no level skip). */}
            <h2
              className={cn(
                'font-serif font-bold text-[16px] leading-tight tracking-[-0.01em]',
                isDestructive ? 'text-destructive' : 'text-foreground'
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-snug">{subtitle}</p>
            )}
          </div>
          {headerAccessory && (
            <div className="flex items-center flex-shrink-0 pt-0.5">{headerAccessory}</div>
          )}
        </div>
      )}
      {children && <div className="space-y-3.5">{children}</div>}
    </div>
  );
}

// ── Row primitives ──────────────────────────────────────────────────
//
// The mock's rows share a common pattern: a label block (title + optional
// description) on the left and a control on the right. These helpers keep the
// card bodies consistent across sections without forcing every caller to
// duplicate the flex wrapper.

export function SettingsRow({ children, className, stacked, divider }: ISettingsRowProps) {
  return (
    <div
      className={cn(
        stacked ? 'flex flex-col gap-2' : 'flex items-center justify-between gap-4',
        divider && 'border-t border-border-glass/50 pt-3.5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SettingsRowLabel({
  title,
  description,
  id,
  descriptionId,
  htmlFor,
  className,
}: ISettingsRowLabelProps) {
  // When bound to a control (`htmlFor`), the title becomes a real <label> so the
  // whole caption is a click target for the paired Switch; otherwise it's a
  // plain <p> (used standalone or with aria-labelledby-wired controls).
  const TitleTag = htmlFor ? 'label' : 'p';
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <TitleTag
        id={id}
        htmlFor={htmlFor}
        className={cn(
          'block text-[13px] font-semibold leading-snug text-foreground',
          htmlFor && 'cursor-pointer'
        )}
      >
        {title}
      </TitleTag>
      {description && (
        <p
          id={descriptionId}
          className="mt-0.5 text-[11.5px] text-muted-foreground/85 leading-snug"
        >
          {description}
        </p>
      )}
    </div>
  );
}

// ── Composite row primitives ────────────────────────────────────────
//
// Most rows in the settings surface are either "label + switch" or "label +
// select". These wrappers keep the aria wiring (labelledby) tidy so callers
// can't forget to thread the id.

export function SettingsToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  divider,
  className,
}: ISettingsToggleRowProps) {
  const autoId = useId();
  const autoDescriptionId = useId();
  const switchId = useId();
  const labelId = id ?? autoId;
  const describedBy = description ? autoDescriptionId : undefined;
  return (
    <SettingsRow divider={divider} className={className}>
      <SettingsRowLabel
        id={labelId}
        htmlFor={switchId}
        descriptionId={describedBy}
        title={title}
        description={description}
      />
      <Switch
        id={switchId}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </SettingsRow>
  );
}

export function SettingsSelectRow({
  id,
  title,
  description,
  value,
  onValueChange,
  options,
  disabled,
  divider,
  className,
  triggerClassName,
}: ISettingsSelectRowProps) {
  const autoId = useId();
  const autoDescriptionId = useId();
  const labelId = id ?? autoId;
  const describedBy = description ? autoDescriptionId : undefined;
  // Lifted out of JSX render position to satisfy `no-jsx-computation`.
  const optionItems = options.map(option => (
    <SelectItem key={option.value} value={option.value} className="text-xs">
      {option.label}
    </SelectItem>
  ));
  return (
    <SettingsRow divider={divider} className={className}>
      <SettingsRowLabel
        id={labelId}
        descriptionId={describedBy}
        title={title}
        description={description}
      />
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          className={cn(
            'h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors',
            triggerClassName ?? 'w-40'
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{optionItems}</SelectContent>
      </Select>
    </SettingsRow>
  );
}

// ── Info callout ────────────────────────────────────────────────────
//
// The mock's `.info-box`: a tinted, rounded card with a leading icon and a
// short explanatory line. Several sections render the same block (General's
// restart hint, the Windows-scheduled-notifications note, the Discord RPC
// note), so this captures the shared chrome while leaving the icon, its tint
// and the body element up to the caller.

export function SettingsInfoCallout({
  icon: Icon,
  iconClassName,
  align = 'start',
  as: Body = 'p',
  children,
}: ISettingsInfoCalloutProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-border-glass bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground',
        align === 'center' ? 'items-center' : 'items-start'
      )}
    >
      <Icon className={iconClassName} />
      <Body>{children}</Body>
    </div>
  );
}

// ── Field label ─────────────────────────────────────────────────────
//
// Canonical form-field label for the settings surface (dialogs, editors,
// stacked field rows). Standardizes the several `text-xs font-medium` label
// treatments that had drifted between `text-foreground` and
// `text-muted-foreground` across the Discord editor, theme editor and the
// delete-data dialog.

export function SettingsFieldLabel({ htmlFor, id, className, children }: ISettingsFieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      id={id}
      className={cn('block text-xs font-medium text-foreground', className)}
    >
      {children}
    </label>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────
//
// Shared loading placeholder for sections that gate their body on an async
// hydrate (General, Mascot, Notifications, Discord). Renders a couple of
// SettingsCard-shaped blocks so the panel keeps its shape instead of blanking
// to `null` while the electron bridge resolves.

export function SettingsSectionSkeleton({ cards = 2 }: { cards?: number }) {
  const blocks = Array.from({ length: cards }, (_, i) => (
    <div
      key={i}
      className="rounded-xl border border-border-glass bg-card/40 px-5 py-4 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-[38px] shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </div>
  ));

  return (
    <div className="space-y-4" aria-hidden="true">
      {blocks}
    </div>
  );
}
