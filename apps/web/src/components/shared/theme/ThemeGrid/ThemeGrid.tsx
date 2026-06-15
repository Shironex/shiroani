import { ThemeSwatch } from '@/components/shared/theme/ThemeSwatch';
import { cn } from '@/lib/utils';
import { useThemeGrid } from './ThemeGrid.hooks';
import type { IThemeGridProps } from './ThemeGrid.types';

/**
 * Shared theme grid — 5-column aspect-square swatches with a mono editorial
 * section header. Used in both the Settings redesign (with a clone overlay
 * via `trailingOverlay`) and the onboarding Theme step (overlay omitted).
 */
export default function ThemeGrid({
  themes,
  label,
  icon: Icon,
  activeTheme,
  onSelect,
  onPreview,
  onPreviewEnd,
  action,
  trailingOverlay,
  className,
}: IThemeGridProps) {
  useThemeGrid();

  const swatches = themes.map(opt => (
    <div key={opt.value} className="relative group">
      <ThemeSwatch
        option={opt}
        isActive={activeTheme === opt.value}
        onSelect={onSelect}
        onPreview={onPreview}
        onPreviewEnd={onPreviewEnd}
      />
      {trailingOverlay?.(opt)}
    </div>
  ));

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Editorial divider label: mono, uppercase, with a thin rule */}
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] font-semibold">
          {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
          {label}
          <span className="tabular-nums text-muted-foreground/60">· {themes.length}</span>
        </span>
        <span className="flex-1 h-px bg-border-glass" />
        {action}
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-2.5">{swatches}</div>
    </div>
  );
}
