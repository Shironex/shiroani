import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { createLogger, type ImageBytesRejection } from '@shiroani/shared';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import type {
  IImageDropDialogProps,
  IImageDropDialogView,
  ImageDropTarget,
} from './ImageDropDialog.types';

const logger = createLogger('ImageDropDialog');

const MB = 1024 * 1024;

/**
 * Renderer-side courtesy caps, equal to what each picker accepts. Main checks
 * size, signature and (for sprites) dimensions again before storing anything.
 */
const MAX_BYTES: Record<ImageDropTarget, number> = {
  background: 20 * MB,
  mascot: 10 * MB,
};

/** Largest sprite edge main accepts, used only in the error copy. */
const SPRITE_MAX_DIMENSION = 2048;

const REJECTION_KEYS = {
  'too-large': 'drop.image.errors.tooLarge',
  'not-an-image': 'drop.image.errors.notAnImage',
  'dimensions-too-large': 'drop.image.errors.dimensionsTooLarge',
  'invalid-dimensions': 'drop.image.errors.invalidDimensions',
  'storage-full': 'drop.image.errors.storageFull',
} as const satisfies Record<ImageBytesRejection, string>;

/** Object URL for a preview thumbnail, revoked when the file changes or unmounts. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

export function useImageDropDialog({
  file,
  onClose,
}: Pick<IImageDropDialogProps, 'file' | 'onClose'>): IImageDropDialogView {
  const { t } = useTranslation('common');
  const addBackgroundFromBytes = useBackgroundStore(s => s.addBackgroundFromBytes);
  const addSpriteFromBytes = useMascotSpriteStore(s => s.addSpriteFromBytes);
  const [busy, setBusy] = useState<ImageDropTarget | null>(null);
  const previewUrl = useObjectUrl(file);

  const apply = useCallback(
    async (target: ImageDropTarget) => {
      if (!file || busy) return;

      const copyValues = { maxMb: MAX_BYTES[target] / MB, maxPx: SPRITE_MAX_DIMENSION };
      if (file.size > MAX_BYTES[target]) {
        toast.error(t(REJECTION_KEYS['too-large'], copyValues));
        return;
      }

      setBusy(target);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result =
          target === 'background'
            ? await addBackgroundFromBytes(bytes)
            : await addSpriteFromBytes(bytes);

        if (result.ok) {
          toast.success(
            t(target === 'background' ? 'drop.image.backgroundSet' : 'drop.image.mascotSet')
          );
          onClose();
        } else {
          toast.error(t(REJECTION_KEYS[result.reason], copyValues));
        }
      } catch (err) {
        logger.error(`Failed to apply dropped image as ${target}:`, err);
        toast.error(t('drop.image.errors.failed'));
      } finally {
        setBusy(null);
      }
    },
    [file, busy, addBackgroundFromBytes, addSpriteFromBytes, onClose, t]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      // Closing mid-write would hide the outcome; the buttons are disabled too.
      if (!open && !busy) onClose();
    },
    [busy, onClose]
  );

  return {
    previewUrl,
    busy,
    chooseBackground: () => void apply('background'),
    chooseMascot: () => void apply('mascot'),
    handleOpenChange,
  };
}
