import { useTranslation, Trans } from 'react-i18next';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useImportDialog } from './ImportDialog.hooks';
import type { IImportDialogProps } from './ImportDialog.types';

export default function ImportDialog({ open, onOpenChange, type }: IImportDialogProps) {
  const { t } = useTranslation('nav');
  const {
    state,
    strategy,
    setStrategy,
    handleImport,
    handleOpenChange,
    progressInfo,
    isImporting,
  } = useImportDialog({ open, onOpenChange, type });

  const importingPanel =
    state.step === 'importing' && progressInfo ? (
      <div className="space-y-4 py-2">
        {/* Header with spinner */}
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t('importDialog.importing')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('importDialog.progress', {
                completed: progressInfo.completed,
                total: state.totalCount,
              })}
            </p>
          </div>
          <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
            {progressInfo.percent}%
          </span>
        </div>

        {/* Progress bar */}
        <ProgressBar value={progressInfo.percent} thickness={8} />

        {/* Current item being processed */}
        {progressInfo.currentItem && (
          <div className="bg-accent/20 rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground truncate">
              {progressInfo.currentItem.title}
            </p>
          </div>
        )}
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onPointerDownOutside={isImporting ? e => e.preventDefault() : undefined}
        onEscapeKeyDown={isImporting ? e => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t('importDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('importDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px] py-2">
          {/* Loading file */}
          {state.step === 'loading-file' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('importDialog.loading')}</span>
            </div>
          )}

          {/* File error */}
          {state.step === 'file-error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-status-error" />
              <p className="text-sm text-status-error text-center">{state.message}</p>
            </div>
          )}

          {/* Preview & config */}
          {state.step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-accent/30 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  <Trans
                    i18nKey="importDialog.found"
                    t={t}
                    values={{ library: state.libraryCount, diary: state.diaryCount }}
                    components={{ 1: <span className="font-semibold" /> }}
                  />
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t('importDialog.duplicatesPrompt')}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'skip'}
                    onChange={() => setStrategy('skip')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">{t('importDialog.skip')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'overwrite'}
                    onChange={() => setStrategy('overwrite')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('importDialog.overwrite')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Importing - progress bar with current item */}
          {importingPanel}

          {/* Done - summary */}
          {state.step === 'done' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-center gap-2 py-2">
                <CheckCircle className="w-6 h-6 text-status-success" />
                <span className="text-sm font-medium text-foreground">
                  {t('importDialog.done')}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-status-success">
                  {t('importDialog.imported', { count: state.result.totalImported })}
                </span>
                {state.result.totalSkipped > 0 && (
                  <span className="text-status-warning">
                    {t('importDialog.skipped', { count: state.result.totalSkipped })}
                  </span>
                )}
                {state.result.totalErrors > 0 && (
                  <span className="text-status-error">
                    {t('importDialog.errors', { count: state.result.totalErrors })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {state.step === 'preview' && (
            <Button onClick={handleImport}>
              <Upload className="w-4 h-4" />
              {t('importDialog.import')}
            </Button>
          )}
          {state.step === 'file-error' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('importDialog.close')}
            </Button>
          )}
          {state.step === 'done' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('importDialog.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
