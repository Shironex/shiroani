import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createLogger } from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';
import { renderProfileCard, renderProfileCardDataUrl } from '../renderProfileCard';
import type { IProfileShareDialogProps, IProfileShareDialogView } from './ProfileShareDialog.types';

const logger = createLogger('ProfileShareDialog');

export function useProfileShareDialog({
  open,
  profile,
}: Pick<IProfileShareDialogProps, 'open' | 'profile'>): IProfileShareDialogView {
  const { t } = useTranslation('profile');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'done'>('idle');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // "Done" reset timers — cleared on unmount so we never setState after unmount.
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Render the card when dialog opens
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setCopyState('idle');
      setSaveState('idle');
      setError(null);
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    setError(null);

    renderProfileCardDataUrl(profile)
      .then(url => {
        if (!cancelled) {
          setPreviewUrl(url);
          setIsRendering(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('share.errors.render'));
          setIsRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, profile, t]);

  const handleCopyToClipboard = useCallback(async () => {
    setCopyState('copying');
    try {
      const base64 = await renderProfileCard(profile);

      if (IS_ELECTRON && window.electronAPI?.app?.clipboardWriteImage) {
        await window.electronAPI.app.clipboardWriteImage(base64);
      } else {
        // Web fallback: use Clipboard API with blob
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/png' });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }

      setCopyState('done');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2000);
    } catch (err) {
      logger.warn('Share-card clipboard copy failed', err);
      setError(t('share.errors.clipboard'));
      setCopyState('idle');
    }
  }, [profile, t]);

  const handleSaveAsPng = useCallback(async () => {
    setSaveState('saving');
    try {
      const base64 = await renderProfileCard(profile);

      if (
        IS_ELECTRON &&
        window.electronAPI?.dialog?.saveFile &&
        window.electronAPI?.app?.saveFileBinary
      ) {
        const filePath = await window.electronAPI.dialog.saveFile({
          defaultPath: `shiroani-${profile.name}.png`,
          filters: [{ name: 'PNG', extensions: ['png'] }],
        });
        if (filePath) {
          await window.electronAPI.app.saveFileBinary(filePath, base64);
        }
      } else {
        // Web fallback: trigger download via link
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = `shiroani-${profile.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setSaveState('done');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      logger.warn('Share-card PNG save failed', err);
      setError(t('share.errors.save'));
      setSaveState('idle');
    }
  }, [profile, t]);

  return {
    previewUrl,
    isRendering,
    copyState,
    saveState,
    error,
    handleCopyToClipboard,
    handleSaveAsPng,
  };
}
