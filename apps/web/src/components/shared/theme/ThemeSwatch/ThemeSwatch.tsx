import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeSwatch } from './ThemeSwatch.hooks';
import type { IThemeSwatchProps } from './ThemeSwatch.types';

/**
 * Theme swatch rendered as a gradient tile with a mono name label baked in.
 * Matches the `.th-sw` pattern from the redesign mock: an aspect-square tile
 * with the theme's primary color on a dark/light background, an active ring,
 * and the name anchored to the bottom.
 */
export default function ThemeSwatch({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
}: IThemeSwatchProps) {
  const { bg, labelColor } = useThemeSwatch(option);

  return (
    <button
      data-testid={option.testId}
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => onPreview(option.value)}
      onMouseLeave={onPreviewEnd}
      onFocus={() => onPreview(option.value)}
      onBlur={onPreviewEnd}
      aria-pressed={isActive}
      aria-label={option.label}
      className={cn(
        'group relative aspect-square w-full overflow-hidden rounded-lg border border-border-glass',
        'transition-[transform,box-shadow,outline] duration-300',
        'hover:-translate-y-0.5 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isActive && 'outline outline-2 outline-offset-2 outline-primary'
      )}
      style={{
        background: `linear-gradient(135deg, ${bg}, ${option.color})`,
      }}
    >
      {/* Soft top glow for presence */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 75% 25%, ${option.color}33, transparent 65%)`,
        }}
      />

      {/* Active check badge */}
      {isActive && (
        <span
          aria-hidden
          className="absolute top-1.5 left-1.5 grid place-items-center rounded-full bg-background/80 backdrop-blur-sm size-5 border border-border-glass shadow"
        >
          <Check className="w-3 h-3 text-primary" />
        </span>
      )}

      {/* Name label along the bottom, mono-cased */}
      <span
        className="absolute bottom-1.5 inset-x-1 text-center font-mono text-[8.5px] uppercase tracking-[0.08em] leading-none truncate"
        style={{ color: labelColor, textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
      >
        {option.label}
      </span>
    </button>
  );
}
