import { useTranslation, Trans } from 'react-i18next';
import { Download, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useExportDialog } from './ExportDialog.hooks';
import type { IExportDialogProps } from './ExportDialog.types';

export default function ExportDialog({
  open,
  onOpenChange,
  type,
  selectedIds,
}: IExportDialogProps) {
  const { t } = useTranslation('nav');
  const { state, handleSave, handleOpenChange } = useExportDialog({
    open,
    onOpenChange,
    type,
    selectedIds,
  });

  const showCloseButton =
    state.step === 'error' || state.step === 'saved' || state.step === 'save-error';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            {t('exportDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('exportDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px] py-4">
          {/* Loading */}
          {state.step === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('exportDialog.preparing')}</span>
            </div>
          )}

          {/* Success - show count */}
          {state.step === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-8 h-8 text-status-success" />
              <p className="text-sm text-foreground">
                <Trans
                  i18nKey="exportDialog.exported"
                  t={t}
                  values={{ count: state.data.totalExported }}
                  components={{ 1: <span className="font-semibold" /> }}
                />
              </p>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-status-error" />
              <p className="text-sm text-status-error">{state.message}</p>
            </div>
          )}

          {/* Saving */}
          {state.step === 'saving' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('exportDialog.saving')}</span>
            </div>
          )}

          {/* Saved */}
          {state.step === 'saved' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-8 h-8 text-status-success" />
              <p className="text-sm text-status-success">{t('exportDialog.saved')}</p>
            </div>
          )}

          {/* Save error */}
          {state.step === 'save-error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-status-error" />
              <p className="text-sm text-status-error">{state.message}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {state.step === 'success' && (
            <Button onClick={handleSave}>
              <Save className="w-4 h-4" />
              {t('exportDialog.saveAs')}
            </Button>
          )}
          {showCloseButton && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('exportDialog.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
