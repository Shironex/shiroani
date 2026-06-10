import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Copy, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createLogger } from '@shiroani/shared';
import type { UserProfile } from '@shiroani/shared';
import { renderProfileCard, renderProfileCardDataUrl } from './renderProfileCard';
import { IS_ELECTRON } from '@/lib/platform';

const logger = createLogger('ProfileShareDialog');

interface ProfileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
}

export function ProfileShareDialog({ open, onOpenChange, profile }: ProfileShareDialogProps) {
  const { t } = useTranslation('profile');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'done'>('idle');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

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
      setTimeout(() => setCopyState('idle'), 2000);
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
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      logger.warn('Share-card PNG save failed', err);
      setError(t('share.errors.save'));
      setSaveState('idle');
    }
  }, [profile, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[860px] p-0 gap-0 bg-background border-border-glass overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">{t('share.title')}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/70">
            {t('share.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Preview area */}
        <div className="px-6 pb-4">
          <div className="rounded-lg overflow-hidden border border-border/30 bg-[#0f0f14]">
            {isRendering ? (
              <div className="flex items-center justify-center h-[220px]">
                <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={t('share.previewAlt')}
                className="w-full h-auto block"
                draggable={false}
              />
            ) : error ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/20 bg-background/60">
          {error && !isRendering && <p className="text-xs text-destructive mr-auto">{error}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={handleCopyToClipboard}
              disabled={isRendering || copyState === 'copying'}
            >
              {copyState === 'done' ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : copyState === 'copying' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copyState === 'done' ? t('share.copied') : t('share.copyToClipboard')}
            </Button>
            <Button
              size="sm"
              className="gap-2 h-8"
              onClick={handleSaveAsPng}
              disabled={isRendering || saveState === 'saving'}
            >
              {saveState === 'done' ? (
                <Check className="w-3.5 h-3.5" />
              ) : saveState === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {saveState === 'done' ? t('share.saved') : t('share.saveAsPng')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
