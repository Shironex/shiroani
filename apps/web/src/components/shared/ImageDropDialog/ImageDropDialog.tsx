import { useTranslation } from 'react-i18next';
import { ImageIcon, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useImageDropDialog } from './ImageDropDialog.hooks';
import type { IImageDropDialogProps } from './ImageDropDialog.types';

/**
 * Asks what a dropped image should become. Nothing is stored until the user
 * clicks a choice; the mascot choice only exists where the mascot does.
 */
export default function ImageDropDialog({
  file,
  onClose,
  showMascotOption,
}: IImageDropDialogProps) {
  const { t } = useTranslation('common');
  const { previewUrl, busy, chooseBackground, chooseMascot, handleOpenChange } = useImageDropDialog(
    { file, onClose }
  );

  return (
    <Dialog open={file !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl" data-slot="image-drop-dialog">
        <DialogHeader>
          <DialogTitle>{t('drop.image.title')}</DialogTitle>
          <DialogDescription>{t('drop.image.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt={t('drop.image.previewAlt')}
              className="max-h-48 w-full rounded-lg bg-muted/40 object-contain"
            />
          )}
          {file && <p className="truncate text-xs text-muted-foreground">{file.name}</p>}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" disabled={busy !== null} onClick={() => handleOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          {showMascotOption && (
            <Button variant="outline" disabled={busy !== null} onClick={chooseMascot}>
              {busy === 'mascot' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {t('drop.image.setMascot')}
            </Button>
          )}
          <Button disabled={busy !== null} onClick={chooseBackground}>
            {busy === 'background' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImageIcon className="size-4" aria-hidden />
            )}
            {t('drop.image.setBackground')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
