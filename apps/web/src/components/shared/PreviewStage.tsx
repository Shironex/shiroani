import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The base gridded-gradient backdrop shared by every settings preview stage.
 * The base layer is a dark diagonal gradient; the per-stage radial "glow" is
 * layered on top so callers can recolor/reposition it (e.g. the destructive
 * red glow used by the AniList error state) without re-declaring the rest.
 */
const BASE_GRADIENT = 'linear-gradient(135deg, oklch(0.14 0.02 300), oklch(0.1 0.02 280))';
const DEFAULT_GLOW =
  'radial-gradient(circle at 70% 30%, oklch(0.5 0.15 355 / 0.25), transparent 60%)';
const GRID_OVERLAY =
  'linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)';

export interface PreviewStageProps {
  children: ReactNode;
  /**
   * Optional uppercase caption rendered above the stage (e.g. "PODGLĄD").
   * Mirrors shiranami's labeled-preview convention so users learn a stage
   * reflects their setting live.
   */
  label?: ReactNode;
  /**
   * Stage height in px (default 144). Ignored when `heightClassName` is set so
   * callers that prefer a Tailwind height utility (e.g. `h-[220px]`) can opt in.
   */
  height?: number;
  /** Tailwind height class — takes precedence over `height` when provided. */
  heightClassName?: string;
  /**
   * Border treatment. `full` (default) is the standard rounded glass border;
   * `bottom` draws only a bottom divider — used when the stage is the header of
   * a larger card (the AniList error state).
   */
  border?: 'full' | 'bottom';
  /** Override the radial glow layer (color + position). */
  glow?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Single source of truth for settings-preview chrome: the gridded-gradient
 * backdrop, the faint grid overlay, the rounded glass border and the stage
 * height. Previously copy-pasted verbatim across `DockStage`, `MascotPreview`,
 * `NewTabPreview` and the AniList error state — any future restyle is now one
 * edit. Callers render their live preview as `children`.
 */
export function PreviewStage({
  children,
  label,
  height = 144,
  heightClassName,
  border = 'full',
  glow = DEFAULT_GLOW,
  className,
  'data-testid': dataTestId,
}: PreviewStageProps) {
  const stageStyle: CSSProperties = {
    background: `${BASE_GRADIENT}, ${glow}`,
    backgroundBlendMode: 'overlay',
  };
  if (!heightClassName) stageStyle.height = height;

  const stage = (
    <div
      data-testid={dataTestId}
      className={cn(
        'relative overflow-hidden',
        border === 'full'
          ? 'rounded-xl border border-border-glass'
          : 'border-b border-destructive/15',
        heightClassName,
        className
      )}
      style={stageStyle}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: GRID_OVERLAY, backgroundSize: '20px 20px' }}
      />
      {children}
    </div>
  );

  if (!label) return stage;

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </p>
      {stage}
    </div>
  );
}
