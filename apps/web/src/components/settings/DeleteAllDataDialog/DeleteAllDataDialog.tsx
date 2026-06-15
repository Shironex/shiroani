import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IS_ELECTRON } from '@/lib/platform';
import { useDeleteAllDataDialog } from './DeleteAllDataDialog.hooks';
import type { IDeleteAllDataDialogProps } from './DeleteAllDataDialog.types';

/**
 * Type-to-confirm dialog for the irreversible "delete all data" factory reset.
 *
 * Deliberately stronger than the shared {@link ConfirmDialog} (a single
 * are-you-sure step): the user must type the confirmation keyword before the
 * destructive button enables. On confirm it runs {@link wipeAllData}, which —
 * on success — relaunches the app, so this component simply unmounts; only the
 * failure path returns control here.
 */
export default function DeleteAllDataDialog(props: IDeleteAllDataDialogProps) {
  const { open, onExportFirst } = props;
  const { t } = useTranslation('settings');
  const {
    state,
    input,
    setInput,
    matches,
    isWiping,
    hasError,
    inputId,
    errorId,
    keyword,
    handleOpenChange,
    handleConfirm,
  } = useDeleteAllDataDialog(props);

  const warningKey = IS_ELECTRON ? 'data.danger.confirm.warning' : 'data.danger.confirm.warningWeb';
  const describedBy = hasError ? errorId : undefined;
  const confirmLabel = isWiping
    ? t('data.danger.confirm.wiping')
    : t('data.danger.confirm.confirm');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('data.danger.confirm.title')}
          </DialogTitle>
          <DialogDescription>{t('data.danger.confirm.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12px] leading-relaxed text-destructive">
            {/* Desktop wipes the DB, browser session and on-disk files and relaunches;
                the web build only clears browser storage and reloads — so the copy
                must not promise a session wipe / fresh-install restart it can't deliver. */}
            {t(warningKey)}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-[12.5px] font-medium text-foreground">
              {t('data.danger.confirm.inputLabel', { keyword })}
            </label>
            <Input
              id={inputId}
              value={input}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={isWiping}
              placeholder={keyword}
              aria-invalid={hasError}
              aria-describedby={describedBy}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && matches && !isWiping) {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
            />
          </div>

          {hasError && (
            <p id={errorId} role="alert" className="text-[12px] text-destructive">
              {state.step === 'error' && state.message}
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isWiping}
            onClick={onExportFirst}
          >
            <Download className="h-4 w-4" />
            {t('data.danger.confirm.exportFirst')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isWiping}
              onClick={() => handleOpenChange(false)}
            >
              {t('data.danger.confirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={!matches || isWiping}
              onClick={handleConfirm}
            >
              {isWiping && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
