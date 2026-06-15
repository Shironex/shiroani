import { useTranslation } from 'react-i18next';
import type { IConfirmDialogView } from './ConfirmDialog.types';

interface IUseConfirmDialogArgs {
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useConfirmDialog({
  confirmLabel,
  cancelLabel,
}: IUseConfirmDialogArgs): IConfirmDialogView {
  const { t } = useTranslation('nav');
  const finalConfirm = confirmLabel ?? t('dialog.confirm');
  const finalCancel = cancelLabel ?? t('dialog.cancel');
  return { finalConfirm, finalCancel };
}
