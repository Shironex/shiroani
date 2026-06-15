import { APP_LOGO_URL } from '@/lib/constants';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import type { MascotSpriteScaleMode } from '@shiroani/shared';
import type { IMascotPreviewProps, IMascotPreviewView } from './MascotPreview.types';

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
 * Map a sprite scale mode to the CSS `object-fit` that reproduces the native
 * Win32 overlay's behaviour, so the macOS preview (where the desktop overlay
 * doesn't exist) and the Windows overlay scale a sprite identically.
 *
 * The overlay always composites into a square surface (see `RebuildScaledImage`
 * in desktop_overlay.cpp), and the preview box is likewise square — so the
 * mapping is exact on both axes:
 *   - contain → letterbox, aspect preserved        (CSS `contain`)
 *   - cover   → crop-to-fill, aspect preserved      (CSS `cover`)
 *   - stretch → fit-to-square, aspect ignored       (CSS `fill`)
 */
function objectFitFor(mode: MascotSpriteScaleMode): 'contain' | 'cover' | 'fill' {
  if (mode === 'cover') return 'cover';
  if (mode === 'stretch') return 'fill';
  return 'contain';
}

export function useMascotPreview(props: IMascotPreviewProps): IMascotPreviewView {
  const { current, min, max } = props;
  const customSpriteUrl = useMascotSpriteStore(s => s.customSpriteUrl);
  const scaleMode = useMascotSpriteStore(s => s.scaleMode);

  const minPx = scaleToPreview(min, min, max);
  const currentPx = scaleToPreview(current, min, max);
  const maxPx = scaleToPreview(max, min, max);

  const spriteUrl = customSpriteUrl ?? APP_LOGO_URL;
  const objectFit = customSpriteUrl ? objectFitFor(scaleMode) : 'contain';

  return { minPx, currentPx, maxPx, spriteUrl, objectFit };
}
