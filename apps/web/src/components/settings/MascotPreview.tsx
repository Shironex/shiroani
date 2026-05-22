import { cn } from '@/lib/utils';
import { APP_LOGO_URL } from '@/lib/constants';
import { PreviewStage } from '@/components/shared/PreviewStage';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import type { MascotSpriteScaleMode } from '@shiroani/shared';

interface MascotPreviewProps {
  current: number;
  min: number;
  max: number;
}

/** Minimum display height for the smallest mascot in preview px. */
const PREVIEW_MIN = 50;
/** Maximum display height for the largest mascot in preview px. */
const PREVIEW_MAX = 130;

function scaleToPreview(real: number, min: number, max: number): number {
  if (max <= min) return PREVIEW_MIN;
  const clamped = Math.max(min, Math.min(max, real));
  const t = (clamped - min) / (max - min);
  return Math.round(PREVIEW_MIN + t * (PREVIEW_MAX - PREVIEW_MIN));
}

/**
 * CSS `object-fit` value matching the native overlay's scale mode. `stretch`
 * has no direct CSS equivalent; `fill` is the closest match (fills the box,
 * ignores aspect ratio).
 */
function objectFitFor(mode: MascotSpriteScaleMode): 'contain' | 'cover' | 'fill' {
  if (mode === 'cover') return 'cover';
  if (mode === 'stretch') return 'fill';
  return 'contain';
}

/**
 * Miniature stage showing three mascot silhouettes (min / current / max) against
 * a grid background. Mirrors the DockStage idiom so the preview language stays
 * consistent across settings sections. The middle chibi animates to the slider's
 * live value; min and max stay pinned as visual anchors.
 *
 * When the user has uploaded a custom sprite, the preview switches to it and
 * applies the matching `object-fit` so the rendered aspect mirrors what the
 * native Win32 overlay will show on the desktop.
 */
export function MascotPreview({ current, min, max }: MascotPreviewProps) {
  const customSpriteUrl = useMascotSpriteStore(s => s.customSpriteUrl);
  const scaleMode = useMascotSpriteStore(s => s.scaleMode);

  const minPx = scaleToPreview(min, min, max);
  const currentPx = scaleToPreview(current, min, max);
  const maxPx = scaleToPreview(max, min, max);

  const spriteUrl = customSpriteUrl ?? APP_LOGO_URL;
  const objectFit = customSpriteUrl ? objectFitFor(scaleMode) : 'contain';

  return (
    <PreviewStage heightClassName="h-[200px]">
      <div className="relative flex h-full items-end justify-around px-8 pb-6">
        <ChibiPreviewItem
          previewSize={minPx}
          realSize={min}
          label="MIN"
          spriteUrl={spriteUrl}
          objectFit={objectFit}
        />
        <ChibiPreviewItem
          previewSize={currentPx}
          realSize={current}
          label="OBECNY"
          highlighted
          spriteUrl={spriteUrl}
          objectFit={objectFit}
        />
        <ChibiPreviewItem
          previewSize={maxPx}
          realSize={max}
          label="MAX"
          spriteUrl={spriteUrl}
          objectFit={objectFit}
        />
      </div>
    </PreviewStage>
  );
}

interface ChibiPreviewItemProps {
  previewSize: number;
  realSize: number;
  label: string;
  spriteUrl: string;
  objectFit: 'contain' | 'cover' | 'fill';
  highlighted?: boolean;
}

function ChibiPreviewItem({
  previewSize,
  realSize,
  label,
  spriteUrl,
  objectFit,
  highlighted = false,
}: ChibiPreviewItemProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'grid place-items-center overflow-hidden rounded-lg transition-[width,height] duration-150 ease-out',
          highlighted ? 'border-2 border-dashed border-primary/50 p-1.5' : ''
        )}
        style={{
          width: previewSize + (highlighted ? 16 : 0),
          height: previewSize + (highlighted ? 16 : 0),
        }}
      >
        <img
          src={spriteUrl}
          alt=""
          draggable={false}
          className="transition-[width,height] duration-150 ease-out"
          style={{ width: previewSize, height: previewSize, objectFit }}
        />
      </div>
      <div
        className={cn(
          'font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] tabular-nums',
          highlighted ? 'text-primary' : 'text-muted-foreground/70'
        )}
      >
        {realSize}px · {label}
      </div>
    </div>
  );
}
