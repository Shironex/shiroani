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
import { useProfileShareDialog } from './ProfileShareDialog.hooks';
import type { IProfileShareDialogProps } from './ProfileShareDialog.types';

export default function ProfileShareDialog({
  open,
  onOpenChange,
  profile,
}: IProfileShareDialogProps) {
  const { t } = useTranslation('profile');
  const {
    previewUrl,
    isRendering,
    copyState,
    saveState,
    error,
    handleCopyToClipboard,
    handleSaveAsPng,
  } = useProfileShareDialog({ open, profile });

  // Chained boolean lifted out of JSX (no chained `&&` in render position).
  const showInlineError = Boolean(error) && !isRendering;

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
          <div className="rounded-lg overflow-hidden border border-border/30 bg-card">
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
          {showInlineError && <p className="text-xs text-destructive mr-auto">{error}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={handleCopyToClipboard}
              disabled={isRendering || copyState === 'copying'}
            >
              {copyState === 'done' ? (
                <Check className="w-3.5 h-3.5 text-status-success" />
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
