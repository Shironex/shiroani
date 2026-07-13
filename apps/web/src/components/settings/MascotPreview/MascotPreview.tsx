import { useTranslation } from 'react-i18next';
import { PreviewStage } from '@/components/shared/PreviewStage';
import { useMascotPreview } from './MascotPreview.hooks';
import { ChibiPreviewItem } from './MascotPreview.parts';
import type { IMascotPreviewProps } from './MascotPreview.types';

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
export default function MascotPreview(props: IMascotPreviewProps) {
  const { t } = useTranslation('settings');
  const { current, min, max, label } = props;
  const { minPx, currentPx, maxPx, spriteUrl, objectFit } = useMascotPreview(props);

  return (
    <PreviewStage heightClassName="h-[200px]" label={label}>
      <div className="relative flex h-full items-end justify-around px-8 pb-6">
        <ChibiPreviewItem
          previewSize={minPx}
          realSize={min}
          label={t('mascot.preview.min')}
          spriteUrl={spriteUrl}
          objectFit={objectFit}
        />
        <ChibiPreviewItem
          previewSize={currentPx}
          realSize={current}
          label={t('mascot.preview.current')}
          highlighted
          spriteUrl={spriteUrl}
          objectFit={objectFit}
        />
        <ChibiPreviewItem
          previewSize={maxPx}
          realSize={max}
          label={t('mascot.preview.max')}
          spriteUrl={spriteUrl}
          objectFit={objectFit}
        />
      </div>
    </PreviewStage>
  );
}
